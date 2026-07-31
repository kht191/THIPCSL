# ⚡ Quick Start: Deploy Hệ Thống Lên Máy Mới

**Thời gian:** 30 phút | **Độ khó:** ⭐⭐⭐

---

## 🎯 Tóm tắt 5 bước

```
1. BACKUP (máy cũ)     → 5 phút
2. CÀI ĐẶT (máy mới)   → 10 phút
3. RESTORE (máy mới)   → 5 phút
4. BUILD (máy mới)     → 5 phút
5. TEST (máy mới)      → 5 phút
```

---

## 📦 Bước 1: BACKUP trên máy cũ (5 phút)

```powershell
# Windows
.\backup-database-deploy.bat

# Linux/Mac
./backup-database-deploy.sh
```

**Kết quả:**
- ✅ File `backups/exam_system_YYYYMMDD_HHMMSS.backup`
- ✅ File `backups/exam_system_YYYYMMDD_HHMMSS.sql`

**Copy sang máy mới:**
- Source code (không có `node_modules/`, `.next/`)
- File backup (cả 2 file)
- File `.env`

---

## 🔧 Bước 2: CÀI ĐẶT trên máy mới (10 phút)

### 2.1. Cài Node.js
```powershell
# Download: https://nodejs.org/
# Chọn phiên bản LTS

# Kiểm tra
node --version  # v18+
npm --version   # 9+
```

### 2.2. Cài PostgreSQL
```powershell
# Download: https://www.postgresql.org/download/
# Ghi nhớ password của user postgres

# Kiểm tra
psql --version  # 14+
```

### 2.3. Tạo Database
```powershell
# Kết nối
psql -U postgres
```

```sql
-- Tạo user và database
CREATE USER exam_admin WITH PASSWORD 'exam_admin_2026';
CREATE DATABASE exam_system OWNER exam_admin;
GRANT ALL PRIVILEGES ON DATABASE exam_system TO exam_admin;
\q
```

### 2.4. Cài Dependencies
```powershell
cd path\to\thipcsl
npm install
```

---

## 📊 Bước 3: RESTORE dữ liệu (5 phút)

```powershell
# Restore database
pg_restore -U exam_admin -d exam_system -v "backups\exam_system_YYYYMMDD_HHMMSS.backup"
# Password: exam_admin_2026

# Kiểm tra
psql -U exam_admin -d exam_system
```

```sql
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Question";
\q
```

---

## 🚀 Bước 4: BUILD và CHẠY (5 phút)

```powershell
# Generate Prisma
npx prisma generate

# Build
npm run build

# Chạy
npm start
```

**Mở trình duyệt:** http://localhost:3000

---

## ✅ Bước 5: TEST (5 phút)

- [ ] Đăng nhập admin
- [ ] Xem danh sách người dùng
- [ ] Xem danh sách câu hỏi
- [ ] Tạo ca thi
- [ ] Làm bài thi (với tài khoản thí sinh)
- [ ] Xem kết quả

---

## 🎯 Chạy như Service (Khuyến nghị)

```powershell
# Cài PM2
npm install -g pm2

# Start
pm2 start npm --name "exam-system" -- start

# Auto restart
pm2 startup
pm2 save

# Quản lý
pm2 list                # Xem danh sách
pm2 logs exam-system    # Xem logs
pm2 restart exam-system # Restart
```

---

## 🔥 Troubleshooting nhanh

### Lỗi: "Cannot find module"
```powershell
npm install
```

### Lỗi: "Prisma Client not generated"
```powershell
npx prisma generate
```

### Lỗi: "Database connection failed"
```powershell
# Kiểm tra PostgreSQL service
Get-Service postgresql*

# Start nếu stopped
Start-Service postgresql-x64-14

# Test connection
psql -U exam_admin -d exam_system
```

### Lỗi: "Port 3000 already in use"
```powershell
# Đổi port
$env:PORT=3001; npm start

# Hoặc kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📁 File .env

```env
DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"
JWT_SECRET=bi-mat-khong-the-bat-mi
NODE_ENV=production
```

---

## 📚 Tài liệu chi tiết

Nếu cần hướng dẫn chi tiết hơn:
- **Hướng dẫn đầy đủ:** `HUONG_DAN_DEPLOY_MAY_CHU_MOI.md`
- **Checklist theo dõi:** `CHECKLIST_DEPLOY_MAY_CHU_MOI.md`
- **Migration docs:** `MIGRATION_SUMMARY.md`

---

## ✨ Tóm tắt lệnh

```powershell
# === MÁY CŨ ===
.\backup-database-deploy.bat

# === MÁY MỚI ===
# 1. Cài Node.js + PostgreSQL

# 2. Tạo database
psql -U postgres
CREATE USER exam_admin WITH PASSWORD 'exam_admin_2026';
CREATE DATABASE exam_system OWNER exam_admin;
GRANT ALL PRIVILEGES ON DATABASE exam_system TO exam_admin;
\q

# 3. Restore
cd path\to\thipcsl
npm install
pg_restore -U exam_admin -d exam_system -v "backups\exam_system_*.backup"

# 4. Build và chạy
npx prisma generate
npm run build
npm start

# 5. (Optional) PM2
npm install -g pm2
pm2 start npm --name "exam-system" -- start
pm2 startup
pm2 save
```

---

## 🎉 Xong!

**Hệ thống đã sẵn sàng tại:** http://localhost:3000

**Đăng nhập admin để kiểm tra!**

---

**Nếu gặp vấn đề, xem:** `HUONG_DAN_DEPLOY_MAY_CHU_MOI.md` (phần Troubleshooting)
