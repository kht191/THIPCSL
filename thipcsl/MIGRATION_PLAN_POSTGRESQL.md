# Phương Án Nâng Cấp Database: SQLite → PostgreSQL

**Mục tiêu:** Migrate từ SQLite sang PostgreSQL để hỗ trợ >100 concurrent users và production-ready

**Thời gian dự kiến:** 1-2 tuần  
**Độ khó:** Trung bình  
**Rủi ro:** Thấp (nếu làm đúng quy trình)

---

## 📋 Tại sao cần nâng cấp?

### **Hạn chế của SQLite:**
- ❌ Chỉ 1 write đồng thời → Bottleneck khi nhiều users submit
- ❌ Database-level locking → Performance kém với concurrent writes
- ❌ Single file → Dễ corrupt, khó backup
- ❌ Không có replication → Không high availability
- ❌ Không scale horizontal

### **Ưu điểm của PostgreSQL:**
- ✅ True concurrent writes (MVCC)
- ✅ Row-level locking → Performance tốt
- ✅ Replication & backup tự động
- ✅ Connection pooling
- ✅ Full-text search, JSON queries
- ✅ Production-proven (hàng triệu users)

---

## 🎯 So sánh các lựa chọn

| Database | Ưu điểm | Nhược điểm | Khuyến nghị |
|----------|---------|------------|-------------|
| **PostgreSQL** | ✅ Mạnh nhất<br>✅ Open-source<br>✅ Full features | ⚠️ Phức tạp hơn SQLite | ⭐⭐⭐⭐⭐ |
| **MySQL** | ✅ Phổ biến<br>✅ Dễ dùng | ⚠️ Ít features hơn PostgreSQL | ⭐⭐⭐⭐ |
| **SQLite + WAL** | ✅ Đơn giản<br>✅ Không cần setup | ❌ Vẫn giới hạn writes | ⭐⭐⭐ (tạm thời) |

**Khuyến nghị:** **PostgreSQL** ⭐

---

## 📅 Kế hoạch Migration

### **Phase 1: Chuẩn bị (2-3 ngày)**

#### **1.1. Backup SQLite hiện tại**
```powershell
# Backup database
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "prisma/dev.db" "prisma/backups/dev_before_migration_${timestamp}.db"

# Export data to JSON (backup thêm)
node scripts/export-data.js
```

#### **1.2. Cài đặt PostgreSQL**

**Cách 1: Local (Development)**
```powershell
# Download PostgreSQL từ https://www.postgresql.org/download/windows/
# Hoặc dùng Chocolatey
choco install postgresql

# Khởi động service
Start-Service postgresql-x64-15

# Tạo database
psql -U postgres
CREATE DATABASE exam_system;
CREATE USER exam_admin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE exam_system TO exam_admin;
\q
```

**Cách 2: Docker (Khuyên dùng)**
```powershell
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: exam_system
      POSTGRES_USER: exam_admin
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:

# Start
docker-compose up -d
```

**Cách 3: Cloud (Production)**
- **Supabase:** https://supabase.com (Free tier: 500MB)
- **Neon:** https://neon.tech (Free tier: 3GB)
- **Railway:** https://railway.app (Free tier: 500MB)
- **AWS RDS:** https://aws.amazon.com/rds/ (Paid)

#### **1.3. Test connection**
```powershell
# Test PostgreSQL connection
psql -h localhost -U exam_admin -d exam_system
# Nếu connect được → OK ✅
```

---

### **Phase 2: Cập nhật Code (1-2 ngày)**

#### **2.1. Cập nhật Prisma Schema**

**File:** `prisma/schema.prisma`

**Trước:**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**Sau:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### **2.2. Cập nhật .env**

**File:** `.env`

**Trước:**
```env
DATABASE_URL="file:./dev.db"
```

**Sau:**
```env
# Local
DATABASE_URL="postgresql://exam_admin:your_password@localhost:5432/exam_system"

# Hoặc Cloud (Supabase example)
DATABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
```

#### **2.3. Sửa Schema cho PostgreSQL**

**Một số thay đổi cần thiết:**

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid()) @db.Uuid
  username      String   @unique
  password_hash String
  full_name     String
  department    String
  role          String
  field         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  results       Result[]
  
  @@index([username])
  @@index([department])
}

model Question {
  id             String   @id @default(uuid()) @db.Uuid
  content        String   @db.Text
  options        String   @db.Text
  correct_answer String
  category       String
  topicId        String?  @db.Uuid
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  topic          Topic?   @relation(fields: [topicId], references: [id], onDelete: SetNull)
  
  @@index([topicId])
  @@index([category])
}

model Topic {
  id        String     @id @default(uuid()) @db.Uuid
  name      String
  parentId  String?    @db.Uuid
  isActive  Boolean    @default(true)
  order     Int        @default(0)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  questions Question[]
  parent    Topic?     @relation("TopicHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children  Topic[]    @relation("TopicHierarchy")
  
  @@index([parentId])
  @@index([isActive])
}

model Exam {
  id             String        @id @default(uuid()) @db.Uuid
  title          String
  duration       Int
  max_attempts   Int           @default(1)
  max_violations Int           @default(3)
  question_ids   String        @db.Text
  allowed_users  String        @db.Text
  status         String
  pass_score     Float         @default(5.0) @db.DoublePrecision
  type           String        @default("OFFICIAL")
  creatorId      String?       @db.Uuid
  settings       String?       @db.Text
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  results        Result[]
  sessions       ExamSession[] @relation("ExamToExamSession")
  
  @@index([status])
  @@index([type])
  @@index([creatorId])
}

model ExamSession {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  startTime DateTime
  endTime   DateTime
  status    String   @default("ACTIVE")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  results   Result[]
  exams     Exam[]   @relation("ExamToExamSession")
  
  @@index([status])
  @@index([startTime])
}

model Result {
  id            String       @id @default(uuid()) @db.Uuid
  user_id       String       @db.Uuid
  exam_id       String       @db.Uuid
  session_id    String?      @db.Uuid
  score         Float        @db.DoublePrecision
  is_passed     Boolean      @default(false)
  is_printed    Boolean      @default(false)
  status        String       @default("COMPLETED")
  details       String       @db.Text
  started_at    DateTime     @default(now())
  submitted_at  DateTime     @default(now())
  session_token String?
  is_locked     Boolean      @default(false)
  session       ExamSession? @relation(fields: [session_id], references: [id], onDelete: SetNull)
  exam          Exam         @relation(fields: [exam_id], references: [id], onDelete: Cascade)
  user          User         @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id])
  @@index([exam_id])
  @@index([session_id])
  @@index([status])
  @@index([started_at])
}
```

**Thay đổi chính:**
- ✅ Thêm `@db.Uuid` cho UUID fields
- ✅ Thêm `@db.Text` cho long strings
- ✅ Thêm `@db.DoublePrecision` cho Float
- ✅ Thêm `@@index` cho performance
- ✅ Thêm `onDelete: Cascade` cho referential integrity

---

### **Phase 3: Migration Data (1-2 ngày)**

#### **3.1. Tạo migration**

```powershell
# Generate Prisma Client mới
npx prisma generate

# Tạo migration
npx prisma migrate dev --name init_postgresql

# Prisma sẽ tạo tables trong PostgreSQL
```

#### **3.2. Export data từ SQLite**

**Tạo script export:**

**File:** `scripts/export-sqlite-data.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db' // SQLite
    }
  }
});

async function exportData() {
  console.log('Exporting data from SQLite...');
  
  const users = await prisma.user.findMany();
  const topics = await prisma.topic.findMany();
  const questions = await prisma.question.findMany();
  const exams = await prisma.exam.findMany();
  const sessions = await prisma.examSession.findMany();
  const results = await prisma.result.findMany();
  
  const data = {
    users,
    topics,
    questions,
    exams,
    sessions,
    results,
    exportedAt: new Date().toISOString()
  };
  
  fs.writeFileSync('data-export.json', JSON.stringify(data, null, 2));
  console.log('✅ Data exported to data-export.json');
  
  console.log(`
    Users: ${users.length}
    Topics: ${topics.length}
    Questions: ${questions.length}
    Exams: ${exams.length}
    Sessions: ${sessions.length}
    Results: ${results.length}
  `);
}

exportData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Chạy:**
```powershell
npx tsx scripts/export-sqlite-data.ts
```

#### **3.3. Import data vào PostgreSQL**

**File:** `scripts/import-postgresql-data.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient(); // PostgreSQL

async function importData() {
  console.log('Importing data to PostgreSQL...');
  
  const data = JSON.parse(fs.readFileSync('data-export.json', 'utf-8'));
  
  // Import theo thứ tự (dependencies)
  console.log('Importing users...');
  for (const user of data.users) {
    await prisma.user.create({ data: user });
  }
  
  console.log('Importing topics...');
  // Import root topics first
  const rootTopics = data.topics.filter((t: any) => !t.parentId);
  for (const topic of rootTopics) {
    await prisma.topic.create({ data: topic });
  }
  // Then child topics
  const childTopics = data.topics.filter((t: any) => t.parentId);
  for (const topic of childTopics) {
    await prisma.topic.create({ data: topic });
  }
  
  console.log('Importing questions...');
  for (const question of data.questions) {
    await prisma.question.create({ data: question });
  }
  
  console.log('Importing exams...');
  for (const exam of data.exams) {
    await prisma.exam.create({ data: exam });
  }
  
  console.log('Importing sessions...');
  for (const session of data.sessions) {
    await prisma.examSession.create({
      data: {
        ...session,
        exams: undefined // Handle many-to-many separately
      }
    });
  }
  
  console.log('Importing results...');
  for (const result of data.results) {
    await prisma.result.create({ data: result });
  }
  
  console.log('✅ Data imported successfully!');
}

importData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Chạy:**
```powershell
npx tsx scripts/import-postgresql-data.ts
```

#### **3.4. Verify data**

```powershell
# Check counts
psql -h localhost -U exam_admin -d exam_system -c "
  SELECT 'users' as table, COUNT(*) FROM \"User\"
  UNION ALL
  SELECT 'topics', COUNT(*) FROM \"Topic\"
  UNION ALL
  SELECT 'questions', COUNT(*) FROM \"Question\"
  UNION ALL
  SELECT 'exams', COUNT(*) FROM \"Exam\"
  UNION ALL
  SELECT 'results', COUNT(*) FROM \"Result\";
"
```

---

### **Phase 4: Testing (2-3 ngày)**

#### **4.1. Unit Testing**

```powershell
# Test từng API endpoint
npm run test

# Hoặc test thủ công
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get exams
curl http://localhost:3000/api/exam

# etc.
```

#### **4.2. Load Testing**

```powershell
# Test với k6
k6 run --vus 100 --duration 5m load-test.js

# Monitor PostgreSQL
psql -h localhost -U exam_admin -d exam_system -c "
  SELECT * FROM pg_stat_activity WHERE datname = 'exam_system';
"
```

#### **4.3. Performance Testing**

```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

### **Phase 5: Deployment (1 ngày)**

#### **5.1. Production Database**

**Option 1: Supabase (Khuyên dùng cho start)**
```
1. Tạo account: https://supabase.com
2. Tạo project mới
3. Copy connection string
4. Update .env
```

**Option 2: Railway**
```
1. Tạo account: https://railway.app
2. New Project → PostgreSQL
3. Copy connection string
4. Update .env
```

**Option 3: Self-hosted**
```powershell
# Setup PostgreSQL trên server
# Configure firewall
# Setup backup cron job
```

#### **5.2. Update Production .env**

```env
# Production
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
NODE_ENV="production"
```

#### **5.3. Deploy**

```powershell
# Build
npm run build

# Migrate production database
npx prisma migrate deploy

# Start
npm start

# Hoặc dùng PM2
pm2 start npm --name "exam-system" -- start
pm2 save
```

---

## 🔄 Rollback Plan

**Nếu có vấn đề:**

```powershell
# 1. Stop application
pm2 stop exam-system

# 2. Restore .env
DATABASE_URL="file:./dev.db"

# 3. Restore SQLite backup
Copy-Item "prisma/backups/dev_before_migration_*.db" "prisma/dev.db"

# 4. Restart
npm run dev
```

---

## 📊 Checklist

### **Trước Migration:**
- [ ] Backup SQLite database
- [ ] Export data to JSON
- [ ] Test backup restore
- [ ] Cài PostgreSQL
- [ ] Test PostgreSQL connection

### **Trong Migration:**
- [ ] Update schema.prisma
- [ ] Update .env
- [ ] Generate Prisma Client
- [ ] Run migrations
- [ ] Import data
- [ ] Verify data counts

### **Sau Migration:**
- [ ] Test login
- [ ] Test tạo đề thi
- [ ] Test làm bài thi
- [ ] Test xem kết quả
- [ ] Load testing
- [ ] Performance testing
- [ ] Setup backup cron job

---

## 💰 Chi phí

| Service | Free Tier | Paid | Khuyến nghị |
|---------|-----------|------|-------------|
| **Supabase** | 500MB, 2GB bandwidth | $25/month (8GB) | ⭐ Dev/Small |
| **Neon** | 3GB | $19/month (10GB) | ⭐ Dev |
| **Railway** | 500MB | $5/month/GB | Medium |
| **AWS RDS** | Không free | ~$15/month (t3.micro) | Production |
| **Self-hosted** | Free | Server cost | Large |

**Khuyến nghị:** Bắt đầu với **Supabase Free** → Upgrade khi cần

---

## 🎯 Timeline

| Phase | Thời gian | Người thực hiện |
|-------|-----------|-----------------|
| **Phase 1: Chuẩn bị** | 2-3 ngày | Dev |
| **Phase 2: Code** | 1-2 ngày | Dev |
| **Phase 3: Migration** | 1-2 ngày | Dev |
| **Phase 4: Testing** | 2-3 ngày | Dev + QA |
| **Phase 5: Deploy** | 1 ngày | DevOps |
| **Tổng** | **7-11 ngày** | |

---

## ✅ Kết luận

**Migration SQLite → PostgreSQL:**
- ✅ **Cần thiết** cho >100 concurrent users
- ✅ **Không quá khó** với Prisma
- ✅ **Rủi ro thấp** nếu có backup
- ✅ **Chi phí hợp lý** (free tier available)

**Next Steps:**
1. Backup SQLite hiện tại
2. Setup PostgreSQL (local hoặc Supabase)
3. Test migration trên local
4. Deploy lên production

Bạn muốn tôi giúp bước nào trước? 🚀
