# ✅ Checklist Deploy Hệ Thống Lên Máy Chủ Mới

**Ngày bắt đầu:** _______________  
**Người thực hiện:** _______________  
**Máy chủ mới:** _______________

---

## 📦 PHẦN 1: CHUẨN BỊ TRÊN MÁY CŨ (15 phút)

### 1.1. Backup Database
- [ ] Chạy script backup: `backup-database-deploy.bat` (Windows) hoặc `backup-database-deploy.sh` (Linux/Mac)
- [ ] Kiểm tra file backup đã được tạo trong thư mục `backups/`
  - [ ] File `.backup` (Custom format)
  - [ ] File `.sql` (SQL format)
- [ ] Ghi chú tên file backup: _______________

### 1.2. Chuẩn bị Source Code
- [ ] Copy toàn bộ thư mục project (trừ `node_modules/` và `.next/`)
- [ ] Đảm bảo có các file quan trọng:
  - [ ] `package.json`
  - [ ] `package-lock.json`
  - [ ] `prisma/schema.prisma`
  - [ ] `.env`
  - [ ] `next.config.ts`
  - [ ] `tsconfig.json`
  - [ ] Tất cả file `.md` (tài liệu)

### 1.3. Ghi chú thông tin quan trọng
- [ ] Database name: `exam_system`
- [ ] Database user: `exam_admin`
- [ ] Database password: `exam_admin_2026`
- [ ] JWT_SECRET: `bi-mat-khong-the-bat-mi`
- [ ] Số lượng records hiện tại:
  - Users: _______________
  - Questions: _______________
  - Topics: _______________
  - Exams: _______________
  - Results: _______________

---

## 🖥️ PHẦN 2: CÀI ĐẶT TRÊN MÁY MỚI (20 phút)

### 2.1. Cài đặt phần mềm cần thiết
- [ ] Cài **Node.js** (v18+)
  - [ ] Download từ: https://nodejs.org/
  - [ ] Kiểm tra: `node --version` → _______________
  - [ ] Kiểm tra: `npm --version` → _______________

- [ ] Cài **PostgreSQL** (v14+)
  - [ ] Download từ: https://www.postgresql.org/download/
  - [ ] Kiểm tra: `psql --version` → _______________
  - [ ] Ghi nhớ password của user `postgres`: _______________

### 2.2. Tạo Database và User
- [ ] Kết nối PostgreSQL: `psql -U postgres`
- [ ] Chạy các lệnh SQL:
  ```sql
  CREATE USER exam_admin WITH PASSWORD 'exam_admin_2026';
  CREATE DATABASE exam_system OWNER exam_admin;
  GRANT ALL PRIVILEGES ON DATABASE exam_system TO exam_admin;
  \q
  ```
- [ ] Test kết nối: `psql -U exam_admin -d exam_system -h localhost`

### 2.3. Copy Source Code
- [ ] Copy thư mục project vào vị trí: _______________
- [ ] Đảm bảo có đầy đủ file (xem mục 1.2)

### 2.4. Cài Dependencies
- [ ] Mở terminal tại thư mục project
- [ ] Chạy: `npm install` hoặc `npm ci`
- [ ] Thời gian cài đặt: _______________ phút
- [ ] Kiểm tra không có lỗi

---

## 📊 PHẦN 3: CHUYỂN DỮ LIỆU (10 phút)

### 3.1. Restore Database
- [ ] Copy file backup vào máy mới
- [ ] Chạy lệnh restore:
  ```powershell
  pg_restore -U exam_admin -d exam_system -v "backups\exam_system_YYYYMMDD_HHMMSS.backup"
  ```
- [ ] Nhập password: `exam_admin_2026`
- [ ] Kiểm tra không có lỗi

### 3.2. Xác minh dữ liệu
- [ ] Kết nối database: `psql -U exam_admin -d exam_system`
- [ ] Kiểm tra số lượng records:
  ```sql
  SELECT COUNT(*) FROM "User";      -- Kết quả: _______________
  SELECT COUNT(*) FROM "Question";  -- Kết quả: _______________
  SELECT COUNT(*) FROM "Topic";     -- Kết quả: _______________
  SELECT COUNT(*) FROM "Exam";      -- Kết quả: _______________
  SELECT COUNT(*) FROM "Result";    -- Kết quả: _______________
  ```
- [ ] So sánh với số liệu máy cũ (mục 1.3) → Khớp? ☐ Có ☐ Không

### 3.3. Cấu hình môi trường
- [ ] Tạo/Cập nhật file `.env`:
  ```env
  DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"
  JWT_SECRET=bi-mat-khong-the-bat-mi
  NODE_ENV=production
  ```
- [ ] Kiểm tra file `.env` đã đúng

---

## 🚀 PHẦN 4: KHỞI ĐỘNG HỆ THỐNG (10 phút)

### 4.1. Generate Prisma Client
- [ ] Chạy: `npx prisma generate`
- [ ] Kiểm tra không có lỗi

### 4.2. Build Application
- [ ] Chạy: `npm run build`
- [ ] Thời gian build: _______________ phút
- [ ] Kiểm tra không có lỗi

### 4.3. Test Development Mode
- [ ] Chạy: `npm run dev`
- [ ] Mở trình duyệt: http://localhost:3000
- [ ] Trang chủ hiển thị đúng? ☐ Có ☐ Không
- [ ] Dừng dev server (Ctrl+C)

### 4.4. Chạy Production Mode
- [ ] Chạy: `npm start`
- [ ] Mở trình duyệt: http://localhost:3000
- [ ] Trang chủ hiển thị đúng? ☐ Có ☐ Không

### 4.5. Cài PM2 (Chạy background)
- [ ] Cài PM2: `npm install -g pm2`
- [ ] Dừng `npm start` (Ctrl+C)
- [ ] Start với PM2: `pm2 start npm --name "exam-system" -- start`
- [ ] Auto restart: `pm2 startup` và `pm2 save`
- [ ] Kiểm tra status: `pm2 list`

---

## ✅ PHẦN 5: KIỂM TRA CHỨC NĂNG (15 phút)

### 5.1. Test Đăng nhập Admin
- [ ] Mở: http://localhost:3000/admin
- [ ] Đăng nhập với tài khoản admin
  - Username: _______________
  - Password: _______________
- [ ] Đăng nhập thành công? ☐ Có ☐ Không

### 5.2. Test Xem Dữ liệu
- [ ] Vào "Quản lý Người dùng" → Hiển thị danh sách? ☐ Có ☐ Không
- [ ] Vào "Quản lý Câu hỏi" → Hiển thị danh sách? ☐ Có ☐ Không
- [ ] Vào "Quản lý Chủ đề" → Hiển thị danh sách? ☐ Có ☐ Không
- [ ] Vào "Quản lý Đề thi" → Hiển thị danh sách? ☐ Có ☐ Không
- [ ] Vào "Quản lý Ca thi" → Hiển thị danh sách? ☐ Có ☐ Không

### 5.3. Test Tạo Ca thi
- [ ] Tạo ca thi mới
- [ ] Gán thí sinh vào ca thi
- [ ] Bắt đầu ca thi
- [ ] Tất cả hoạt động bình thường? ☐ Có ☐ Không

### 5.4. Test Làm bài (Thí sinh)
- [ ] Đăng xuất admin
- [ ] Đăng nhập với tài khoản thí sinh
  - Username: _______________
  - Password: _______________
- [ ] Vào ca thi
- [ ] Làm bài thi
- [ ] Nộp bài
- [ ] Tất cả hoạt động bình thường? ☐ Có ☐ Không

### 5.5. Test Xem Kết quả
- [ ] Đăng nhập lại admin
- [ ] Vào "Kết quả thi"
- [ ] Xem kết quả của thí sinh vừa thi
- [ ] Xuất báo cáo Excel
- [ ] Tất cả hoạt động bình thường? ☐ Có ☐ Không

### 5.6. Test Performance
- [ ] Trang load nhanh (< 2 giây)? ☐ Có ☐ Không
- [ ] Không có lỗi trong console? ☐ Có ☐ Không
- [ ] Database queries nhanh? ☐ Có ☐ Không

---

## 🔒 PHẦN 6: BẢO MẬT VÀ BACKUP (5 phút)

### 6.1. Đổi Password (Khuyến nghị)
- [ ] Đổi password PostgreSQL:
  ```sql
  ALTER USER exam_admin WITH PASSWORD 'NEW_STRONG_PASSWORD';
  ```
- [ ] Cập nhật `.env` với password mới
- [ ] Restart ứng dụng: `pm2 restart exam-system`

### 6.2. Backup trên máy mới
- [ ] Chạy backup lần đầu: `backup-database-deploy.bat`
- [ ] Kiểm tra file backup đã được tạo
- [ ] Lên lịch backup định kỳ (hàng ngày/tuần)

### 6.3. Firewall (Nếu deploy lên server)
- [ ] Mở port 3000 (hoặc port của ứng dụng)
- [ ] Đóng port 5432 (PostgreSQL) từ bên ngoài
- [ ] Chỉ cho phép kết nối local đến PostgreSQL

---

## 📝 PHẦN 7: GHI CHÚ VÀ KẾT THÚC

### 7.1. Thông tin hệ thống mới
```
Máy chủ: _______________
IP: _______________
Port: _______________
Database: exam_system
User: exam_admin
Password: _______________
```

### 7.2. Vấn đề gặp phải (nếu có)
```
1. _______________________________________________
   Giải pháp: _____________________________________

2. _______________________________________________
   Giải pháp: _____________________________________

3. _______________________________________________
   Giải pháp: _____________________________________
```

### 7.3. Thời gian thực hiện
- Bắt đầu: _______________
- Kết thúc: _______________
- Tổng thời gian: _______________ phút

### 7.4. Kết quả cuối cùng
- [ ] ✅ Deploy thành công
- [ ] ✅ Tất cả chức năng hoạt động bình thường
- [ ] ✅ Dữ liệu đầy đủ và chính xác
- [ ] ✅ Performance tốt
- [ ] ✅ Đã backup trên máy mới
- [ ] ✅ Đã cấu hình auto-start (PM2)

---

## 🎉 HOÀN THÀNH!

**Chữ ký người thực hiện:** _______________  
**Ngày:** _______________

---

## 📞 Liên hệ hỗ trợ

Nếu gặp vấn đề, tham khảo:
- **Hướng dẫn chi tiết:** `HUONG_DAN_DEPLOY_MAY_CHU_MOI.md`
- **Troubleshooting:** Xem phần Troubleshooting trong hướng dẫn
- **Migration docs:** `MIGRATION_SUMMARY.md`
- **Database backup:** `DATABASE_BACKUP.md`

---

**Chúc mừng bạn đã deploy thành công! 🚀**
