# 🚀 Hướng Dẫn Deploy Hệ Thống Lên Máy Chủ Mới

**Phiên bản:** 2.0 (PostgreSQL)  
**Ngày cập nhật:** 2026-02-11  
**Hệ thống:** Next.js + PostgreSQL

---

## 📋 Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Chuẩn bị trên máy cũ](#chuẩn-bị-trên-máy-cũ)
3. [Cài đặt trên máy mới](#cài-đặt-trên-máy-mới)
4. [Chuyển dữ liệu](#chuyển-dữ-liệu)
5. [Khởi động hệ thống](#khởi-động-hệ-thống)
6. [Kiểm tra và xác minh](#kiểm-tra-và-xác-minh)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Yêu cầu hệ thống

### Máy chủ mới cần có:

#### 1. **Phần mềm bắt buộc:**
- ✅ **Node.js** v18 trở lên → [Download](https://nodejs.org/)
- ✅ **PostgreSQL** v14 trở lên → [Download](https://www.postgresql.org/download/)
- ✅ **Git** (optional) → [Download](https://git-scm.com/)

#### 2. **Cấu hình tối thiểu:**
```
CPU:  2 cores
RAM:  4GB (khuyến nghị 8GB)
Disk: 20GB trống
OS:   Windows 10/11, Linux, hoặc macOS
```

#### 3. **Kiểm tra phiên bản:**
```powershell
node --version    # v18.x.x hoặc cao hơn
npm --version     # 9.x.x hoặc cao hơn
psql --version    # PostgreSQL 14.x hoặc cao hơn
```

---

## 📦 Chuẩn bị trên máy cũ

### Bước 1: Backup dữ liệu PostgreSQL

#### **Cách 1: Dùng pg_dump (Khuyên dùng)**

```powershell
# Tạo thư mục backup
New-Item -ItemType Directory -Force -Path ".\backups"

# Backup toàn bộ database
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -U exam_admin -d exam_system -F c -b -v -f "backups\exam_system_${timestamp}.backup"

# Hoặc backup dạng SQL (dễ đọc hơn)
pg_dump -U exam_admin -d exam_system -f "backups\exam_system_${timestamp}.sql"
```

**Lưu ý:** Nhập password `exam_admin_2026` khi được hỏi.

#### **Cách 2: Dùng pgAdmin (GUI)**

1. Mở **pgAdmin**
2. Kết nối đến database `exam_system`
3. Chuột phải → **Backup...**
4. Chọn định dạng: **Custom** hoặc **Plain**
5. Chọn đường dẫn lưu file
6. Click **Backup**

---

### Bước 2: Đóng gói source code

#### **Cách 1: Copy thư mục (Đơn giản nhất)**

```powershell
# Copy toàn bộ thư mục project
# Bỏ qua các thư mục không cần thiết
```

**Cần copy:**
```
✅ app/                    # Source code
✅ components/             # Components
✅ lib/                    # Libraries
✅ prisma/                 # Database schema
✅ public/                 # Static files
✅ scripts/                # Utility scripts
✅ package.json            # Dependencies
✅ package-lock.json       # Lock file
✅ next.config.ts          # Next.js config
✅ tsconfig.json           # TypeScript config
✅ tailwind.config.ts      # Tailwind config
✅ .env                    # Environment variables (QUAN TRỌNG!)
✅ *.md                    # Documentation
```

**KHÔNG cần copy:**
```
❌ node_modules/          # Sẽ cài lại
❌ .next/                 # Sẽ build lại
❌ .git/                  # Git history (trừ khi cần)
❌ backups/               # Backups cũ
❌ dev.db                 # SQLite cũ (không dùng nữa)
```

#### **Cách 2: Dùng Git (Nếu có repository)**

```powershell
# Commit tất cả thay đổi
git add .
git commit -m "Prepare for deployment"
git push origin main
```

---

### Bước 3: Tạo gói chuyển giao

```powershell
# Tạo file zip chứa:
# 1. Source code (không có node_modules, .next)
# 2. Database backup (.backup hoặc .sql)
# 3. File .env
# 4. Tài liệu hướng dẫn

# Ví dụ cấu trúc:
deployment_package/
├── thipcsl/              # Source code
├── backups/
│   └── exam_system_20260211_144700.backup
├── .env                  # Environment variables
└── HUONG_DAN_DEPLOY_MAY_CHU_MOI.md
```

---

## 🔧 Cài đặt trên máy mới

### Bước 1: Cài đặt Node.js

1. Download từ https://nodejs.org/
2. Chọn phiên bản **LTS** (Long Term Support)
3. Cài đặt với tùy chọn mặc định
4. Kiểm tra:
   ```powershell
   node --version
   npm --version
   ```

---

### Bước 2: Cài đặt PostgreSQL

#### **Windows:**

1. Download từ https://www.postgresql.org/download/windows/
2. Chạy installer
3. **Quan trọng:** Ghi nhớ password cho user `postgres`
4. Cài đặt với các tùy chọn:
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4
   - ✅ Command Line Tools
   - ❌ Stack Builder (không bắt buộc)
5. Port mặc định: `5432`

#### **Linux (Ubuntu/Debian):**

```bash
# Cài PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Khởi động service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Kiểm tra
sudo -u postgres psql --version
```

#### **macOS:**

```bash
# Dùng Homebrew
brew install postgresql@14
brew services start postgresql@14
```

---

### Bước 3: Tạo database và user

#### **Cách 1: Dùng script tự động**

```powershell
# Nếu có file setup-postgres.bat từ máy cũ
.\setup-postgres.bat exam_admin_2026
```

#### **Cách 2: Thủ công**

```powershell
# Kết nối với PostgreSQL
psql -U postgres

# Trong psql prompt:
```

```sql
-- Tạo user
CREATE USER exam_admin WITH PASSWORD 'exam_admin_2026';

-- Tạo database
CREATE DATABASE exam_system OWNER exam_admin;

-- Cấp quyền
GRANT ALL PRIVILEGES ON DATABASE exam_system TO exam_admin;

-- Thoát
\q
```

#### **Kiểm tra kết nối:**

```powershell
# Test connection
psql -U exam_admin -d exam_system -h localhost

# Nếu thành công, bạn sẽ thấy:
# exam_system=>
```

---

### Bước 4: Copy source code

```powershell
# Copy thư mục project vào vị trí mong muốn
# Ví dụ: C:\Projects\thipcsl

cd C:\Projects\thipcsl
```

---

### Bước 5: Cài đặt dependencies

```powershell
# Cài tất cả packages
npm install

# Hoặc dùng npm ci (nhanh hơn, dùng package-lock.json)
npm ci
```

**Thời gian:** 2-5 phút (tùy tốc độ mạng)

---

### Bước 6: Cấu hình môi trường

#### **Tạo/Cập nhật file `.env`:**

```env
# Database connection
DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"

# JWT Secret (dùng cùng secret với máy cũ để giữ sessions)
JWT_SECRET=bi-mat-khong-the-bat-mi

# Node environment
NODE_ENV=production
```

**⚠️ Quan trọng:**
- Đảm bảo `DATABASE_URL` đúng với thông tin PostgreSQL trên máy mới
- Giữ nguyên `JWT_SECRET` từ máy cũ để không làm mất session của users

---

## 📊 Chuyển dữ liệu

### Bước 1: Restore database

#### **Cách 1: Dùng pg_restore (cho file .backup)**

```powershell
# Restore từ file backup
pg_restore -U exam_admin -d exam_system -v "backups\exam_system_20260211_144700.backup"

# Nhập password khi được hỏi: exam_admin_2026
```

#### **Cách 2: Dùng psql (cho file .sql)**

```powershell
# Restore từ file SQL
psql -U exam_admin -d exam_system -f "backups\exam_system_20260211_144700.sql"
```

#### **Cách 3: Dùng pgAdmin (GUI)**

1. Mở **pgAdmin**
2. Kết nối đến database `exam_system`
3. Chuột phải → **Restore...**
4. Chọn file backup
5. Click **Restore**

---

### Bước 2: Tạo Prisma schema

```powershell
# Generate Prisma Client
npx prisma generate

# Kiểm tra schema
npx prisma db pull

# (Optional) Tạo migration nếu cần
npx prisma migrate dev --name init_on_new_server
```

---

### Bước 3: Xác minh dữ liệu

```powershell
# Kết nối database
psql -U exam_admin -d exam_system

# Kiểm tra số lượng records
```

```sql
-- Kiểm tra các bảng
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Question";
SELECT COUNT(*) FROM "Topic";
SELECT COUNT(*) FROM "Exam";
SELECT COUNT(*) FROM "ExamSession";
SELECT COUNT(*) FROM "Result";

-- Kiểm tra user admin
SELECT id, username, full_name, role FROM "User" WHERE role = 'ADMIN';

-- Thoát
\q
```

**So sánh số lượng với máy cũ để đảm bảo dữ liệu đầy đủ.**

---

## 🚀 Khởi động hệ thống

### Bước 1: Build ứng dụng

```powershell
# Build production
npm run build
```

**Thời gian:** 1-3 phút

---

### Bước 2: Chạy ứng dụng

#### **Development mode (để test):**

```powershell
npm run dev
```

Mở trình duyệt: http://localhost:3000

#### **Production mode:**

```powershell
npm start
```

---

### Bước 3: Chạy như service (Khuyên dùng)

#### **Cách 1: Dùng PM2 (Cross-platform)**

```powershell
# Cài PM2 globally
npm install -g pm2

# Start ứng dụng
pm2 start npm --name "exam-system" -- start

# Auto restart khi reboot
pm2 startup
pm2 save

# Các lệnh quản lý
pm2 list                    # Xem danh sách apps
pm2 logs exam-system        # Xem logs
pm2 restart exam-system     # Restart
pm2 stop exam-system        # Stop
pm2 delete exam-system      # Xóa
pm2 monit                   # Monitor real-time
```

#### **Cách 2: Dùng Windows Service (Windows only)**

```powershell
# Cài node-windows
npm install -g node-windows

# Tạo file service (service-install.js)
```

Tạo file `service-install.js`:

```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'Exam System',
  description: 'Hệ thống thi trắc nghiệm',
  script: 'C:\\Projects\\thipcsl\\node_modules\\next\\dist\\bin\\next',
  scriptOptions: 'start',
  nodeOptions: []
});

svc.on('install', () => {
  svc.start();
});

svc.install();
```

```powershell
# Cài service
node service-install.js
```

---

## ✅ Kiểm tra và xác minh

### Checklist sau khi deploy:

- [ ] **Database:**
  - [ ] PostgreSQL service đang chạy
  - [ ] Kết nối database thành công
  - [ ] Số lượng records khớp với máy cũ
  - [ ] User admin tồn tại

- [ ] **Application:**
  - [ ] Build thành công (không có lỗi)
  - [ ] Ứng dụng khởi động được
  - [ ] Truy cập được http://localhost:3000

- [ ] **Chức năng:**
  - [ ] Đăng nhập với tài khoản admin
  - [ ] Xem danh sách người dùng
  - [ ] Xem danh sách câu hỏi
  - [ ] Xem danh sách đề thi
  - [ ] Tạo ca thi mới
  - [ ] Thí sinh làm bài thi
  - [ ] Xem kết quả thi

- [ ] **Performance:**
  - [ ] Trang load nhanh (< 2 giây)
  - [ ] Không có lỗi trong console
  - [ ] Database queries nhanh

---

### Test kịch bản đầy đủ:

```powershell
# 1. Test đăng nhập admin
# Mở: http://localhost:3000/admin
# Login: admin / admin123

# 2. Test xem dữ liệu
# - Vào "Quản lý Người dùng"
# - Vào "Quản lý Câu hỏi"
# - Vào "Quản lý Đề thi"

# 3. Test tạo ca thi
# - Tạo ca thi mới
# - Gán thí sinh
# - Bắt đầu ca thi

# 4. Test làm bài (với tài khoản thí sinh)
# - Đăng xuất admin
# - Đăng nhập với tài khoản thí sinh
# - Vào ca thi
# - Làm bài
# - Nộp bài

# 5. Test xem kết quả
# - Đăng nhập lại admin
# - Xem kết quả thi
# - Xuất báo cáo
```

---

## 🔥 Troubleshooting

### 1. **Lỗi: "Cannot find module"**

**Nguyên nhân:** Chưa cài dependencies

**Giải pháp:**
```powershell
rm -rf node_modules package-lock.json
npm install
```

---

### 2. **Lỗi: "Prisma Client not generated"**

**Nguyên nhân:** Chưa generate Prisma Client

**Giải pháp:**
```powershell
npx prisma generate
```

---

### 3. **Lỗi: "Database connection failed"**

**Nguyên nhân:** 
- PostgreSQL service không chạy
- Thông tin kết nối sai
- User/password không đúng

**Giải pháp:**
```powershell
# Kiểm tra PostgreSQL service
# Windows:
Get-Service postgresql*

# Nếu stopped, start nó:
Start-Service postgresql-x64-14

# Test connection
psql -U exam_admin -d exam_system -h localhost

# Kiểm tra .env
cat .env
```

---

### 4. **Lỗi: "Port 3000 already in use"**

**Nguyên nhân:** Port 3000 đã được dùng

**Giải pháp:**
```powershell
# Cách 1: Đổi port
$env:PORT=3001; npm start

# Cách 2: Kill process đang dùng port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

### 5. **Lỗi: "Migration failed"**

**Nguyên nhân:** Schema không khớp

**Giải pháp:**
```powershell
# Reset database (⚠️ MẤT DỮ LIỆU)
npx prisma migrate reset

# Hoặc restore lại từ backup
pg_restore -U exam_admin -d exam_system -c -v "backups\exam_system.backup"
```

---

### 6. **Lỗi: "Build failed"**

**Nguyên nhân:** 
- Thiếu dependencies
- TypeScript errors
- Environment variables không đúng

**Giải pháp:**
```powershell
# Kiểm tra lỗi
npm run build

# Xóa cache và build lại
rm -rf .next
npm run build

# Kiểm tra .env
cat .env
```

---

### 7. **Dữ liệu không đầy đủ sau restore**

**Nguyên nhân:** Backup không đầy đủ hoặc restore lỗi

**Giải pháp:**
```powershell
# Kiểm tra số lượng records
psql -U exam_admin -d exam_system

# Trong psql:
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Question";

# Nếu thiếu, restore lại
pg_restore -U exam_admin -d exam_system -c -v "backups\exam_system.backup"
```

---

## 🌐 Deploy lên Server từ xa (VPS/Cloud)

### Bước 1: Chuẩn bị server

```bash
# SSH vào server
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Cài Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Cài PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Cài PM2
sudo npm install -g pm2
```

---

### Bước 2: Cấu hình PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Tạo user và database
CREATE USER exam_admin WITH PASSWORD 'exam_admin_2026';
CREATE DATABASE exam_system OWNER exam_admin;
GRANT ALL PRIVILEGES ON DATABASE exam_system TO exam_admin;
\q

# Cấu hình PostgreSQL cho remote connection (nếu cần)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Sửa: listen_addresses = '*'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Thêm: host all all 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

### Bước 3: Upload code

```bash
# Cách 1: Dùng Git
git clone <your-repo-url>
cd thipcsl

# Cách 2: Dùng SCP/SFTP
# Từ máy local:
scp -r thipcsl/ user@server-ip:/home/user/
```

---

### Bước 4: Cài đặt và chạy

```bash
# Cài dependencies
npm ci

# Tạo .env
nano .env
# Paste nội dung .env

# Restore database
pg_restore -U exam_admin -d exam_system -v exam_system.backup

# Generate Prisma
npx prisma generate

# Build
npm run build

# Start với PM2
pm2 start npm --name "exam-system" -- start
pm2 startup
pm2 save
```

---

### Bước 5: Cấu hình Nginx (Reverse Proxy)

```bash
# Cài Nginx
sudo apt install -y nginx

# Tạo config
sudo nano /etc/nginx/sites-available/exam-system
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/exam-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# (Optional) Cài SSL với Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 📊 So sánh các phương pháp deploy

| Phương pháp | Ưu điểm | Nhược điểm | Thời gian | Khuyến nghị |
|-------------|---------|------------|-----------|-------------|
| **Copy thư mục + Restore DB** | ✅ Nhanh<br>✅ Đơn giản<br>✅ Giữ nguyên dữ liệu | ❌ Dung lượng lớn | 15-30 phút | ⭐⭐⭐⭐⭐ |
| **Git + Restore DB** | ✅ Version control<br>✅ Dễ update | ⚠️ Cần setup Git | 20-40 phút | ⭐⭐⭐⭐ |
| **Docker** | ✅ Isolated<br>✅ Reproducible | ❌ Phức tạp hơn | 30-60 phút | ⭐⭐⭐ |

---

## 🎯 Checklist tổng hợp

### Trên máy cũ:
- [ ] Backup PostgreSQL database
- [ ] Copy source code (không có node_modules, .next)
- [ ] Copy file .env
- [ ] Ghi chú thông tin database (user, password, database name)
- [ ] Test backup (optional)

### Trên máy mới:
- [ ] Cài Node.js (v18+)
- [ ] Cài PostgreSQL (v14+)
- [ ] Tạo user và database PostgreSQL
- [ ] Copy source code
- [ ] Tạo file .env
- [ ] Cài dependencies (`npm install`)
- [ ] Restore database
- [ ] Generate Prisma Client
- [ ] Build application
- [ ] Test chạy dev mode
- [ ] Test chạy production mode
- [ ] Cài PM2 và setup auto-start
- [ ] Test tất cả chức năng
- [ ] Backup database trên máy mới

---

## 📚 Tài liệu tham khảo

- **Migration PostgreSQL:** `MIGRATION_SUMMARY.md`
- **Deployment cơ bản:** `DEPLOYMENT_GUIDE.md`
- **Database backup:** `DATABASE_BACKUP.md`
- **Load testing:** `LOAD_TESTING_GUIDE.md`
- **Maintenance mode:** `MAINTENANCE_MODE_GUIDE.md`

---

## 💡 Tips và Best Practices

### 1. **Backup định kỳ:**
```powershell
# Tạo script backup tự động
# backup-daily.bat
@echo off
set timestamp=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
pg_dump -U exam_admin -d exam_system -F c -f "backups\exam_system_%timestamp%.backup"
```

### 2. **Monitor logs:**
```powershell
# PM2 logs
pm2 logs exam-system --lines 100

# PostgreSQL logs (Windows)
# C:\Program Files\PostgreSQL\14\data\log\
```

### 3. **Performance tuning:**
```sql
-- Tối ưu PostgreSQL
-- Trong postgresql.conf:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### 4. **Security:**
```env
# Đổi password mạnh hơn
DATABASE_URL="postgresql://exam_admin:STRONG_PASSWORD_HERE@localhost:5432/exam_system"

# Đổi JWT secret
JWT_SECRET=your-very-long-and-random-secret-key-here
```

---

## 🎉 Kết luận

**Tóm tắt các bước:**

1. ✅ **Backup** database trên máy cũ
2. ✅ **Copy** source code
3. ✅ **Cài đặt** Node.js + PostgreSQL trên máy mới
4. ✅ **Tạo** database và user
5. ✅ **Restore** database
6. ✅ **Cài** dependencies
7. ✅ **Build** và **chạy** ứng dụng
8. ✅ **Test** tất cả chức năng

**Thời gian ước tính:** 30-60 phút (tùy kinh nghiệm)

**Độ khó:** ⭐⭐⭐ (Trung bình)

---

**Chúc bạn deploy thành công! 🚀**

Nếu gặp vấn đề, hãy kiểm tra phần [Troubleshooting](#troubleshooting) hoặc tham khảo các tài liệu khác trong thư mục dự án.
