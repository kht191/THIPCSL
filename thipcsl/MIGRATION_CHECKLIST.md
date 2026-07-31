# ✅ Migration Checklist - SQLite to PostgreSQL

**Ngày bắt đầu:** _______________  
**Người thực hiện:** _______________  
**Thời gian dự kiến:** 30-60 phút

---

## 📋 PHASE 1: CHUẨN BỊ (5-10 phút)

### 1.1 Kiểm Tra Môi Trường
- [ ] PostgreSQL 18 đã được cài đặt
- [ ] Biết password của user `postgres`
- [ ] Node.js và npm đã cài đặt
- [ ] Git repository đã commit code hiện tại

### 1.2 Đọc Tài Liệu
- [ ] Đã đọc `README_MIGRATION.md`
- [ ] Đã đọc `MIGRATION_QUICKSTART.md` hoặc `MIGRATION_STEPS.md`
- [ ] Hiểu workflow tổng thể

### 1.3 Backup Hiện Tại
- [ ] Chạy `.\backup-sqlite.bat`
- [ ] Verify file backup trong `backups/` folder
- [ ] Ghi lại tên file backup: _______________

**Thời gian hoàn thành Phase 1:** _______________

---

## 📦 PHASE 2: EXPORT DATA (5 phút)

### 2.1 Export từ SQLite
- [ ] Chạy `npx tsx scripts/export-sqlite-data.ts`
- [ ] Verify file JSON trong `backups/` folder
- [ ] Ghi lại số lượng records:
  - Users: _______________
  - Topics: _______________
  - Questions: _______________
  - Exams: _______________
  - Sessions: _______________
  - Results: _______________

**Thời gian hoàn thành Phase 2:** _______________

---

## 🗄️ PHASE 3: SETUP POSTGRESQL (5-10 phút)

### 3.1 Test PostgreSQL
- [ ] Chạy `.\test-postgres.bat [password]`
- [ ] PostgreSQL đang chạy và kết nối được

### 3.2 Setup Database
- [ ] Chạy `.\setup-postgres.bat [postgres_password]`
- [ ] Database `exam_system` đã được tạo
- [ ] User `exam_admin` đã được tạo
- [ ] Ghi lại connection string:
  ```
  DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"
  ```

**Thời gian hoàn thành Phase 3:** _______________

---

## ⚙️ PHASE 4: UPDATE CONFIGURATION (2-3 phút)

### 4.1 Update .env
- [ ] Backup file `.env` cũ
- [ ] Update `DATABASE_URL` trong `.env`:
  ```env
  DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"
  ```
- [ ] Giữ nguyên `JWT_SECRET`

### 4.2 Verify Schema
- [ ] File `prisma/schema.prisma` đã có `provider = "postgresql"`
- [ ] Schema có các `@db.Uuid`, `@db.Text`, `@db.DoublePrecision`
- [ ] Schema có các `@@index`

**Thời gian hoàn thành Phase 4:** _______________

---

## 🔄 PHASE 5: MIGRATE SCHEMA (3-5 phút)

### 5.1 Generate Prisma Client
- [ ] Chạy `npx prisma generate`
- [ ] Không có lỗi
- [ ] Prisma Client đã được generate

### 5.2 Run Migration
- [ ] Chạy `npx prisma migrate dev --name init_postgresql`
- [ ] Migration file đã được tạo trong `prisma/migrations/`
- [ ] Tables đã được tạo trong PostgreSQL
- [ ] Ghi lại migration name: _______________

**Thời gian hoàn thành Phase 5:** _______________

---

## 📥 PHASE 6: IMPORT DATA (5-10 phút)

### 6.1 Import vào PostgreSQL
- [ ] Chạy `npx tsx scripts/import-postgresql-data.ts`
- [ ] Không có lỗi
- [ ] Verify số lượng records match với export:
  - Users: _____ / _____ ✅
  - Topics: _____ / _____ ✅
  - Questions: _____ / _____ ✅
  - Exams: _____ / _____ ✅
  - Sessions: _____ / _____ ✅
  - Results: _____ / _____ ✅

### 6.2 Verify Import
- [ ] All counts match
- [ ] Script báo "Import completed successfully!"

**Thời gian hoàn thành Phase 6:** _______________

---

## ✅ PHASE 7: VERIFICATION (5-10 phút)

### 7.1 Run Verification Script
- [ ] Chạy `npx tsx verify-migration.ts`
- [ ] Database connection OK
- [ ] Data counts OK
- [ ] Sample queries OK
- [ ] Write operations OK
- [ ] Concurrent writes OK
- [ ] Indexes OK

### 7.2 Prisma Studio (Optional)
- [ ] Chạy `npx prisma studio`
- [ ] Mở browser tại http://localhost:5555
- [ ] Xem được data trong các tables
- [ ] Relationships đúng

**Thời gian hoàn thành Phase 7:** _______________

---

## 🧪 PHASE 8: TESTING APPLICATION (10-15 phút)

### 8.1 Start Application
- [ ] Chạy `npm run dev`
- [ ] Application khởi động không lỗi
- [ ] Không có error trong console

### 8.2 Test Authentication
- [ ] Login admin thành công
- [ ] Login user thành công
- [ ] Logout thành công
- [ ] Sai password báo lỗi đúng

### 8.3 Test Quản Lý Câu Hỏi
- [ ] Xem danh sách câu hỏi
- [ ] Tạo câu hỏi mới
- [ ] Sửa câu hỏi
- [ ] Xóa câu hỏi
- [ ] Filter/search câu hỏi

### 8.4 Test Quản Lý Đề Thi
- [ ] Xem danh sách đề thi
- [ ] Tạo đề thi mới
- [ ] Sửa đề thi
- [ ] Xóa đề thi
- [ ] Tạo ma trận đề thi

### 8.5 Test Làm Bài Thi
- [ ] Vào thi được
- [ ] Làm bài thi
- [ ] Submit bài thi
- [ ] Xem kết quả
- [ ] In kết quả (nếu có)

### 8.6 Test Quản Lý Kết Quả
- [ ] Xem danh sách kết quả
- [ ] Filter kết quả
- [ ] Export kết quả (nếu có)
- [ ] Xóa kết quả

### 8.7 Test Performance
- [ ] Trang load nhanh (< 2s)
- [ ] Không có lag khi thao tác
- [ ] Không có lỗi trong console
- [ ] Database queries nhanh

**Thời gian hoàn thành Phase 8:** _______________

---

## 🚀 PHASE 9: LOAD TESTING (Optional - 10 phút)

### 9.1 Cài Đặt k6
- [ ] Chạy `choco install k6` (nếu chưa có)

### 9.2 Run Load Test
- [ ] Chạy `k6 run --vus 50 --duration 2m load-test.js`
- [ ] Không có lỗi
- [ ] Response time < 500ms
- [ ] Success rate > 95%

### 9.3 Monitor Database
- [ ] PostgreSQL không bị lock
- [ ] CPU usage hợp lý
- [ ] Memory usage hợp lý

**Thời gian hoàn thành Phase 9:** _______________

---

## 📊 PHASE 10: POST-MIGRATION (5 phút)

### 10.1 Documentation
- [ ] Ghi lại thời gian migration
- [ ] Ghi lại vấn đề gặp phải (nếu có)
- [ ] Update README.md (nếu cần)

### 10.2 Backup PostgreSQL
- [ ] Tạo backup PostgreSQL đầu tiên
- [ ] Test restore backup (optional)

### 10.3 Cleanup
- [ ] Xóa test data (nếu có)
- [ ] Commit changes vào git
- [ ] Tag version (optional)

### 10.4 Next Steps
- [ ] Setup backup schedule
- [ ] Setup monitoring (optional)
- [ ] Plan for production deployment

**Thời gian hoàn thành Phase 10:** _______________

---

## 📝 SUMMARY

### Thời Gian
- **Bắt đầu:** _______________
- **Kết thúc:** _______________
- **Tổng thời gian:** _______________

### Kết Quả
- **Status:** ✅ Thành công / ❌ Thất bại / ⚠️ Một phần
- **Database:** PostgreSQL
- **Records migrated:** _______________
- **Issues encountered:** _______________

### Notes
```
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
```

---

## 🔄 ROLLBACK (Nếu Cần)

Nếu gặp vấn đề nghiêm trọng:

- [ ] Stop application (Ctrl+C)
- [ ] Restore `.env`:
  ```env
  DATABASE_URL="file:./dev.db"
  ```
- [ ] Restore `schema.prisma`:
  ```powershell
  git checkout HEAD -- prisma/schema.prisma
  ```
- [ ] Generate Prisma Client:
  ```powershell
  npx prisma generate
  ```
- [ ] Restore database (nếu cần):
  ```powershell
  copy "backups\dev_before_migration_*.db" "dev.db"
  ```
- [ ] Restart application:
  ```powershell
  npm run dev
  ```

**Rollback completed:** _______________

---

## ✅ SIGN-OFF

**Migration completed by:** _______________  
**Date:** _______________  
**Signature:** _______________

**Verified by:** _______________  
**Date:** _______________  
**Signature:** _______________

---

## 📞 Support Contacts

- **Technical Lead:** _______________
- **Database Admin:** _______________
- **DevOps:** _______________

---

**🎉 Congratulations on completing the migration! 🎉**
