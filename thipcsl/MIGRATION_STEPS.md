# Hướng Dẫn Migration SQLite → PostgreSQL

## 📋 Tổng Quan

Tài liệu này hướng dẫn chi tiết từng bước để migrate database từ SQLite sang PostgreSQL.

**Thời gian dự kiến:** 30-60 phút  
**Yêu cầu:** PostgreSQL 18 đã được cài đặt

---

## ✅ Checklist Chuẩn Bị

- [ ] PostgreSQL 18 đã được cài đặt
- [ ] Biết password của user `postgres`
- [ ] Đã backup dữ liệu quan trọng
- [ ] Có quyền admin trên máy

---

## 🚀 Các Bước Thực Hiện

### Bước 1: Backup SQLite Database

**Quan trọng:** Luôn backup trước khi thay đổi!

```powershell
# Chạy script backup
.\backup-sqlite.bat
```

Kết quả: File backup sẽ được tạo trong thư mục `backups/` với tên dạng `dev_before_migration_YYYYMMDD_HHMMSS.db`

---

### Bước 2: Export Dữ Liệu từ SQLite

Export tất cả dữ liệu từ SQLite sang file JSON:

```powershell
npx tsx scripts/export-sqlite-data.ts
```

**Kết quả mong đợi:**
```
🔄 Exporting data from SQLite...

📊 Fetching users...
   ✅ X users
📊 Fetching topics...
   ✅ X topics
📊 Fetching questions...
   ✅ X questions
📊 Fetching exams...
   ✅ X exams
📊 Fetching exam sessions...
   ✅ X sessions
📊 Fetching results...
   ✅ X results

✅ Export completed successfully!
📁 File: backups\sqlite-export-YYYY-MM-DDTHH-MM-SS.json
```

**Lưu ý:** Ghi nhớ số lượng records để verify sau này.

---

### Bước 3: Setup PostgreSQL Database

Tạo database và user cho hệ thống:

```powershell
# Thay YOUR_POSTGRES_PASSWORD bằng password của user postgres
.\setup-postgres.bat YOUR_POSTGRES_PASSWORD
```

**Ví dụ:**
```powershell
.\setup-postgres.bat admin123
```

**Kết quả mong đợi:**
```
========================================
SUCCESS! Database setup completed!
========================================

Database: exam_system
User: exam_admin
Password: exam_admin_2026

Connection string:
DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"
```

**Nếu gặp lỗi:**
- Kiểm tra PostgreSQL service đã chạy chưa: `Get-Service postgresql*`
- Kiểm tra password postgres có đúng không
- Kiểm tra port 5432 có bị chiếm không: `netstat -ano | findstr :5432`

---

### Bước 4: Cập Nhật File .env

Cập nhật connection string trong file `.env`:

**Trước:**
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET=bi-mat-khong-the-bat-mi
```

**Sau:**
```env
DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"
JWT_SECRET=bi-mat-khong-the-bat-mi
```

**Lưu ý:** 
- Giữ nguyên `JWT_SECRET`
- Nếu bạn đổi password trong bước 3, cập nhật password tương ứng

---

### Bước 5: Generate Prisma Client mới

Generate Prisma Client cho PostgreSQL:

```powershell
npx prisma generate
```

**Kết quả mong đợi:**
```
✔ Generated Prisma Client (5.x.x) to .\node_modules\@prisma\client
```

---

### Bước 6: Tạo Database Schema trong PostgreSQL

Chạy migration để tạo tables trong PostgreSQL:

```powershell
npx prisma migrate dev --name init_postgresql
```

**Kết quả mong đợi:**
```
Applying migration `20260205XXXXXX_init_postgresql`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260205XXXXXX_init_postgresql/
    └─ migration.sql

✔ Generated Prisma Client (5.x.x) to .\node_modules\@prisma\client
```

**Nếu gặp lỗi kết nối:**
- Kiểm tra DATABASE_URL trong .env
- Test kết nối: `.\test-postgres.bat exam_admin_2026`

---

### Bước 7: Import Dữ Liệu vào PostgreSQL

Import dữ liệu từ file JSON vào PostgreSQL:

```powershell
npx tsx scripts/import-postgresql-data.ts
```

**Kết quả mong đợi:**
```
🔄 Importing data to PostgreSQL...

📁 Using latest export: sqlite-export-YYYY-MM-DDTHH-MM-SS.json

📊 Export metadata:
   Exported at: YYYY-MM-DDTHH:MM:SS.SSSZ
   Source: SQLite
   Version: 1.0

🗑️  Clearing existing data...
   ✅ Cleared

👥 Importing users...
   ✅ X users imported
📚 Importing topics...
   ✅ X topics imported
❓ Importing questions...
   ✅ X questions imported
📝 Importing exams...
   ✅ X exams imported
🕐 Importing exam sessions...
   ✅ X sessions imported
📊 Importing results...
   ✅ X results imported

🔍 Verifying import...
   Database counts:
   Users:     X / X
   Topics:    X / X
   Questions: X / X
   Exams:     X / X
   Sessions:  X / X
   Results:   X / X

✅ Import completed successfully! All counts match.
```

**Nếu counts không match:**
- Kiểm tra log để xem bước nào bị lỗi
- Có thể chạy lại script import (nó sẽ xóa và import lại)

---

### Bước 8: Verify Database

Kiểm tra dữ liệu trong PostgreSQL:

```powershell
# Test kết nối và xem dữ liệu
npx tsx test-prisma-connection.ts
```

Hoặc dùng Prisma Studio:

```powershell
npx prisma studio
```

Trình duyệt sẽ mở tại `http://localhost:5555` để bạn xem dữ liệu.

**Kiểm tra:**
- [ ] Số lượng users đúng
- [ ] Số lượng questions đúng
- [ ] Số lượng exams đúng
- [ ] Số lượng results đúng
- [ ] Relationships giữa các tables đúng

---

### Bước 9: Test Application

Khởi động ứng dụng và test các chức năng:

```powershell
npm run dev
```

**Test các chức năng chính:**

1. **Login:**
   - [ ] Đăng nhập admin thành công
   - [ ] Đăng nhập user thành công
   - [ ] Sai password báo lỗi đúng

2. **Quản lý câu hỏi:**
   - [ ] Xem danh sách câu hỏi
   - [ ] Tạo câu hỏi mới
   - [ ] Sửa câu hỏi
   - [ ] Xóa câu hỏi

3. **Quản lý đề thi:**
   - [ ] Xem danh sách đề thi
   - [ ] Tạo đề thi mới
   - [ ] Sửa đề thi
   - [ ] Xóa đề thi

4. **Làm bài thi:**
   - [ ] Vào thi được
   - [ ] Làm bài và submit
   - [ ] Xem kết quả

5. **Performance:**
   - [ ] Trang load nhanh
   - [ ] Không có lỗi trong console
   - [ ] Database queries nhanh

---

### Bước 10: Load Testing (Optional)

Test với nhiều users đồng thời:

```powershell
# Cài k6 nếu chưa có
choco install k6

# Chạy load test
k6 run --vus 50 --duration 2m load-test.js
```

**Kết quả mong đợi:**
- Không có lỗi
- Response time < 500ms
- Database không bị lock

---

## 🔄 Rollback (Nếu Có Vấn Đề)

Nếu gặp vấn đề và muốn quay lại SQLite:

### 1. Stop Application

```powershell
# Nếu đang chạy dev server, nhấn Ctrl+C
```

### 2. Restore .env

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET=bi-mat-khong-the-bat-mi
```

### 3. Restore Schema

```powershell
# Checkout schema.prisma cũ từ git
git checkout HEAD -- prisma/schema.prisma

# Hoặc thay đổi thủ công:
# datasource db {
#   provider = "sqlite"
#   url      = env("DATABASE_URL")
# }
```

### 4. Restore Database (Nếu Cần)

```powershell
# Copy backup file
copy "backups\dev_before_migration_YYYYMMDD_HHMMSS.db" "dev.db"
```

### 5. Generate Prisma Client

```powershell
npx prisma generate
```

### 6. Restart Application

```powershell
npm run dev
```

---

## 📊 So Sánh Performance

### SQLite (Trước)
- ❌ Chỉ 1 write đồng thời
- ❌ Database lock khi nhiều users
- ❌ Không scale được

### PostgreSQL (Sau)
- ✅ Nhiều writes đồng thời (MVCC)
- ✅ Row-level locking
- ✅ Scale được với connection pooling
- ✅ Production-ready

---

## 🎯 Next Steps

Sau khi migration thành công:

1. **Setup Backup Tự Động:**
   - Cấu hình pg_dump chạy hàng ngày
   - Lưu backup vào cloud (Google Drive, OneDrive, etc.)

2. **Monitoring:**
   - Setup monitoring cho PostgreSQL
   - Track slow queries
   - Monitor connection pool

3. **Optimization:**
   - Analyze query performance
   - Add indexes nếu cần
   - Configure PostgreSQL settings

4. **Production Deployment:**
   - Cân nhắc dùng cloud database (Supabase, Railway, AWS RDS)
   - Setup SSL connection
   - Configure firewall

---

## ❓ Troubleshooting

### Lỗi: "password authentication failed"

**Nguyên nhân:** Password không đúng

**Giải pháp:**
```powershell
# Reset password postgres
# 1. Mở pgAdmin
# 2. Right-click postgres user → Properties → Password
# 3. Đổi password mới
```

### Lỗi: "database does not exist"

**Nguyên nhân:** Chưa chạy setup-postgres.bat

**Giải pháp:**
```powershell
.\setup-postgres.bat YOUR_POSTGRES_PASSWORD
```

### Lỗi: "relation does not exist"

**Nguyên nhân:** Chưa chạy migration

**Giải pháp:**
```powershell
npx prisma migrate dev --name init_postgresql
```

### Lỗi: Import data failed

**Nguyên nhân:** Có thể do foreign key constraints

**Giải pháp:**
```powershell
# Xóa data và import lại
npx tsx scripts/import-postgresql-data.ts
```

### Application chạy chậm

**Nguyên nhân:** Chưa có indexes hoặc PostgreSQL chưa được optimize

**Giải pháp:**
1. Kiểm tra indexes đã được tạo chưa
2. Run ANALYZE trong PostgreSQL
3. Tăng shared_buffers trong postgresql.conf

---

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra logs trong terminal
2. Kiểm tra PostgreSQL logs: `C:\Program Files\PostgreSQL\18\data\log\`
3. Tham khảo MIGRATION_PLAN_POSTGRESQL.md

---

## ✅ Checklist Hoàn Thành

- [ ] Backup SQLite database
- [ ] Export data to JSON
- [ ] Setup PostgreSQL database
- [ ] Update .env file
- [ ] Generate Prisma Client
- [ ] Run migrations
- [ ] Import data
- [ ] Verify data counts
- [ ] Test login
- [ ] Test CRUD operations
- [ ] Test exam flow
- [ ] Load testing (optional)
- [ ] Setup backup schedule

**Chúc mừng! Bạn đã hoàn thành migration! 🎉**
