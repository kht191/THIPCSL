# 📚 Tài Liệu Deploy Hệ Thống

**Hệ thống:** Thi Trắc nghiệm Online  
**Database:** PostgreSQL  
**Framework:** Next.js 16  
**Ngày cập nhật:** 2026-02-11

---

## 🎯 Bạn muốn làm gì?

### 🚀 Deploy hệ thống lên máy mới
Chọn một trong các tài liệu sau:

| Tài liệu | Mô tả | Thời gian | Độ khó |
|----------|-------|-----------|--------|
| **[QUICKSTART_DEPLOY.md](QUICKSTART_DEPLOY.md)** | ⚡ Hướng dẫn nhanh 5 bước | 30 phút | ⭐⭐⭐ |
| **[HUONG_DAN_DEPLOY_MAY_CHU_MOI.md](HUONG_DAN_DEPLOY_MAY_CHU_MOI.md)** | 📖 Hướng dẫn chi tiết đầy đủ | 60 phút | ⭐⭐⭐ |
| **[CHECKLIST_DEPLOY_MAY_CHU_MOI.md](CHECKLIST_DEPLOY_MAY_CHU_MOI.md)** | ✅ Checklist theo dõi từng bước | 45 phút | ⭐⭐⭐ |

**Khuyến nghị:**
- Lần đầu deploy → Đọc **HUONG_DAN_DEPLOY_MAY_CHU_MOI.md**
- Deploy nhanh → Dùng **QUICKSTART_DEPLOY.md**
- Muốn theo dõi tiến độ → Dùng **CHECKLIST_DEPLOY_MAY_CHU_MOI.md**

---

### 💾 Backup Database
| Tài liệu | Mô tả |
|----------|-------|
| **[backup-database-deploy.bat](backup-database-deploy.bat)** | Script backup cho Windows |
| **[backup-database-deploy.sh](backup-database-deploy.sh)** | Script backup cho Linux/Mac |
| **[DATABASE_BACKUP.md](DATABASE_BACKUP.md)** | Hướng dẫn backup chi tiết |

**Cách dùng:**
```powershell
# Windows
.\backup-database-deploy.bat

# Linux/Mac
./backup-database-deploy.sh
```

---

### 🔄 Migration từ SQLite sang PostgreSQL
| Tài liệu | Mô tả |
|----------|-------|
| **[MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)** | Tổng quan migration |
| **[MIGRATION_QUICKSTART.md](MIGRATION_QUICKSTART.md)** | Quick start migration |
| **[MIGRATION_STEPS.md](MIGRATION_STEPS.md)** | Chi tiết từng bước |
| **[POSTGRESQL_VS_SQLITE.md](POSTGRESQL_VS_SQLITE.md)** | So sánh PostgreSQL vs SQLite |

---

### 📊 Quản lý và Vận hành
| Tài liệu | Mô tả |
|----------|-------|
| **[PGADMIN_GUIDE.md](PGADMIN_GUIDE.md)** | Hướng dẫn dùng pgAdmin |
| **[LOAD_TESTING_GUIDE.md](LOAD_TESTING_GUIDE.md)** | Test hiệu năng hệ thống |
| **[MAINTENANCE_MODE_GUIDE.md](MAINTENANCE_MODE_GUIDE.md)** | Chế độ bảo trì |

---

### 📖 Tài liệu hệ thống
| Tài liệu | Mô tả |
|----------|-------|
| **[TÍNH_NĂNG_HỆ_THỐNG.md](../TÍNH_NĂNG_HỆ_THỐNG.md)** | Danh sách tính năng |
| **[SYSTEM_EVALUATION.md](SYSTEM_EVALUATION.md)** | Đánh giá hệ thống |
| **[README.md](README.md)** | Tài liệu chính của dự án |

---

## 🚀 Quick Start Deploy

### Tóm tắt 5 bước:

#### 1️⃣ BACKUP (máy cũ)
```powershell
.\backup-database-deploy.bat
```

#### 2️⃣ CÀI ĐẶT (máy mới)
- Cài Node.js v18+
- Cài PostgreSQL v14+
- Tạo database:
```sql
CREATE USER exam_admin WITH PASSWORD 'exam_admin_2026';
CREATE DATABASE exam_system OWNER exam_admin;
```

#### 3️⃣ RESTORE (máy mới)
```powershell
cd path\to\thipcsl
npm install
pg_restore -U exam_admin -d exam_system -v "backups\exam_system_*.backup"
```

#### 4️⃣ BUILD (máy mới)
```powershell
npx prisma generate
npm run build
npm start
```

#### 5️⃣ TEST
- Mở http://localhost:3000
- Đăng nhập admin
- Kiểm tra chức năng

---

## 📋 Yêu cầu hệ thống

### Máy chủ mới cần có:
- **Node.js:** v18 trở lên
- **PostgreSQL:** v14 trở lên
- **RAM:** 4GB (khuyến nghị 8GB)
- **Disk:** 20GB trống
- **OS:** Windows 10/11, Linux, hoặc macOS

---

## 🔧 Cấu trúc thư mục

```
thipcsl/
├── app/                          # Source code Next.js
├── components/                   # React components
├── lib/                          # Libraries
├── prisma/                       # Database schema
│   └── schema.prisma
├── public/                       # Static files
├── scripts/                      # Utility scripts
├── backups/                      # Database backups
├── package.json                  # Dependencies
├── .env                          # Environment variables
│
├── HUONG_DAN_DEPLOY_MAY_CHU_MOI.md      # 📖 Hướng dẫn deploy chi tiết
├── QUICKSTART_DEPLOY.md                  # ⚡ Quick start
├── CHECKLIST_DEPLOY_MAY_CHU_MOI.md      # ✅ Checklist
├── backup-database-deploy.bat            # 💾 Backup script (Windows)
├── backup-database-deploy.sh             # 💾 Backup script (Linux/Mac)
│
└── [Các tài liệu khác...]
```

---

## 🔥 Troubleshooting nhanh

### Lỗi thường gặp:

| Lỗi | Giải pháp |
|-----|-----------|
| Cannot find module | `npm install` |
| Prisma Client not generated | `npx prisma generate` |
| Database connection failed | Kiểm tra PostgreSQL service, .env |
| Port 3000 already in use | Đổi port hoặc kill process |
| Build failed | Xóa `.next/` và build lại |

**Chi tiết:** Xem phần Troubleshooting trong `HUONG_DAN_DEPLOY_MAY_CHU_MOI.md`

---

## 📞 Hỗ trợ

### Nếu gặp vấn đề:

1. **Kiểm tra tài liệu:**
   - Troubleshooting trong `HUONG_DAN_DEPLOY_MAY_CHU_MOI.md`
   - FAQ trong các tài liệu migration

2. **Kiểm tra logs:**
   - Terminal output
   - PostgreSQL logs: `C:\Program Files\PostgreSQL\14\data\log\`
   - PM2 logs: `pm2 logs exam-system`

3. **Kiểm tra cấu hình:**
   - File `.env`
   - PostgreSQL service đang chạy
   - Database đã được tạo

---

## 📊 Thông tin Database

```
Database: exam_system
User:     exam_admin
Password: exam_admin_2026
Host:     localhost
Port:     5432

Connection String:
postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system
```

---

## 🎯 Các lệnh thường dùng

### Development
```powershell
npm run dev          # Chạy dev server
npm run build        # Build production
npm start            # Chạy production
```

### Database
```powershell
npx prisma generate  # Generate Prisma Client
npx prisma studio    # Mở Prisma Studio (GUI)
npx prisma db pull   # Pull schema từ database
```

### Backup
```powershell
.\backup-database-deploy.bat                    # Backup (Windows)
./backup-database-deploy.sh                     # Backup (Linux/Mac)
pg_restore -U exam_admin -d exam_system -v ...  # Restore
```

### PM2
```powershell
pm2 start npm --name "exam-system" -- start  # Start
pm2 list                                     # List apps
pm2 logs exam-system                         # View logs
pm2 restart exam-system                      # Restart
pm2 stop exam-system                         # Stop
pm2 delete exam-system                       # Delete
```

---

## 📈 Roadmap

### Đã hoàn thành:
- ✅ Migration từ SQLite sang PostgreSQL
- ✅ Tài liệu deploy đầy đủ
- ✅ Scripts backup tự động
- ✅ Load testing guide
- ✅ Maintenance mode

### Kế hoạch tiếp theo:
- [ ] Docker deployment
- [ ] CI/CD pipeline
- [ ] Cloud deployment (AWS/Azure/GCP)
- [ ] Monitoring và alerting
- [ ] Auto-scaling

---

## 📝 Changelog

### 2026-02-11
- ✅ Tạo hướng dẫn deploy chi tiết
- ✅ Tạo quick start guide
- ✅ Tạo checklist deploy
- ✅ Tạo scripts backup tự động
- ✅ Tạo README tổng hợp

### 2026-02-05
- ✅ Migration sang PostgreSQL
- ✅ Tài liệu migration đầy đủ
- ✅ Load testing guide

---

## 🎉 Kết luận

**Bạn đã có đầy đủ tài liệu để:**
- ✅ Deploy hệ thống lên máy mới
- ✅ Backup và restore database
- ✅ Quản lý và vận hành hệ thống
- ✅ Xử lý sự cố khi gặp lỗi

**Bắt đầu ngay:**
1. Đọc **[QUICKSTART_DEPLOY.md](QUICKSTART_DEPLOY.md)** để có cái nhìn tổng quan
2. Làm theo **[HUONG_DAN_DEPLOY_MAY_CHU_MOI.md](HUONG_DAN_DEPLOY_MAY_CHU_MOI.md)** để deploy chi tiết
3. Dùng **[CHECKLIST_DEPLOY_MAY_CHU_MOI.md](CHECKLIST_DEPLOY_MAY_CHU_MOI.md)** để theo dõi tiến độ

**Chúc bạn deploy thành công! 🚀**
