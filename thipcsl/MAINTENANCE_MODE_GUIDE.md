# 🔧 Hướng Dẫn Sử Dụng Maintenance Mode

## 📋 Tổng Quan

Maintenance mode cho phép bạn tạm ngưng hệ thống trong khi migration, hiển thị trang thông báo đẹp mắt cho users.

---

## 🚀 Cách Sử Dụng

### **Bật Maintenance Mode**

#### Bước 1: Cập nhật .env

```env
# Thêm dòng này vào file .env
MAINTENANCE_MODE=true
```

#### Bước 2: Restart Application

```powershell
# Stop server hiện tại (Ctrl+C)
# Restart
npm run dev
```

**Kết quả:** Tất cả users sẽ được redirect đến `/maintenance` page

---

### **Tắt Maintenance Mode**

#### Bước 1: Cập nhật .env

```env
# Sửa thành false hoặc xóa dòng này
MAINTENANCE_MODE=false
```

#### Bước 2: Restart Application

```powershell
# Stop server hiện tại (Ctrl+C)
# Restart
npm run dev
```

**Kết quả:** Hệ thống hoạt động bình thường

---

## 📝 Workflow Migration Với Maintenance Mode

### **Trước Migration (22:30)**

```powershell
# 1. Thông báo users (30 phút trước)
# 2. Disable tạo ca thi mới (trong admin panel)
# 3. Chờ users hiện tại finish
```

### **Bắt Đầu Migration (23:00)**

```powershell
# 1. Bật maintenance mode
# Sửa .env: MAINTENANCE_MODE=true

# 2. Restart app
npm run dev

# 3. Chờ 5-10 phút để users hiện tại logout/finish

# 4. Stop app
# Ctrl+C
```

### **Trong Migration (23:10 - 00:00)**

```powershell
# 5. Chạy migration
.\backup-sqlite.bat
npx tsx scripts/export-sqlite-data.ts
.\setup-postgres.bat YOUR_PASSWORD

# 6. Update .env
# DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"
# MAINTENANCE_MODE=true (giữ nguyên)

# 7. Migrate schema
npx prisma generate
npx prisma migrate dev --name init_postgresql

# 8. Import data
npx tsx scripts/import-postgresql-data.ts

# 9. Verify
npx tsx verify-migration.ts
```

### **Sau Migration (00:00)**

```powershell
# 10. Tắt maintenance mode
# Sửa .env: MAINTENANCE_MODE=false

# 11. Restart app
npm run dev

# 12. Test
# - Login
# - Tạo đề thi
# - Làm bài thi
# - Xem kết quả

# 13. Thông báo hoàn thành
```

---

## 🎨 Tùy Chỉnh Maintenance Page

### **Thay Đổi Thời Gian**

Edit file: `app/maintenance/page.tsx`

```typescript
// Tìm dòng này:
<p className="text-blue-800">
  23:00 - 01:00
</p>

// Thay đổi thành thời gian của bạn:
<p className="text-blue-800">
  22:00 - 24:00
</p>
```

### **Thay Đổi Trạng Thái**

```typescript
// Tìm dòng này:
<p className="text-blue-800">
  Đang nâng cấp database...
</p>

// Thay đổi thành:
<p className="text-blue-800">
  Đang import dữ liệu... (80%)
</p>
```

### **Thêm Thông Tin Liên Hệ**

```typescript
// Tìm dòng này:
<p>
  Nếu có thắc mắc, vui lòng liên hệ: <span className="font-semibold">admin@example.com</span>
</p>

// Thay đổi email:
<p>
  Nếu có thắc mắc, vui lòng liên hệ: <span className="font-semibold">your-email@example.com</span>
</p>
```

---

## 🧪 Test Maintenance Mode

### **Test Trước Khi Migration**

```powershell
# 1. Bật maintenance mode
# .env: MAINTENANCE_MODE=true

# 2. Restart
npm run dev

# 3. Mở browser
# http://localhost:3000

# 4. Verify
# - Tất cả pages đều redirect đến /maintenance
# - Maintenance page hiển thị đẹp
# - Thông tin chính xác

# 5. Tắt maintenance mode
# .env: MAINTENANCE_MODE=false

# 6. Restart
npm run dev

# 7. Verify
# - Hệ thống hoạt động bình thường
# - Không thể truy cập /maintenance
```

---

## 📊 Checklist

### Trước Migration
- [ ] Test maintenance mode hoạt động
- [ ] Cập nhật thời gian trong maintenance page
- [ ] Cập nhật email liên hệ
- [ ] Thông báo users trước

### Trong Migration
- [ ] Bật maintenance mode
- [ ] Chờ users logout (5-10 phút)
- [ ] Chạy migration
- [ ] Verify kết quả
- [ ] Tắt maintenance mode

### Sau Migration
- [ ] Test hệ thống hoạt động
- [ ] Thông báo hoàn thành
- [ ] Monitor 24h đầu

---

## ⚠️ Lưu Ý Quan Trọng

### **1. Environment Variables**

```env
# .env file cần có:
DATABASE_URL="..."
JWT_SECRET="..."
MAINTENANCE_MODE=true  # Chỉ khi bảo trì
```

### **2. Restart Required**

Mỗi khi thay đổi `.env`, **PHẢI restart** application:
```powershell
# Stop (Ctrl+C)
npm run dev
```

### **3. Production**

Nếu deploy trên production (Vercel, Railway, etc.):
- Set environment variable `MAINTENANCE_MODE=true` trong dashboard
- Redeploy hoặc restart service
- Sau migration, set `MAINTENANCE_MODE=false`

---

## 🎯 Timeline Mẫu

```
22:30 - Thông báo 30 phút trước
22:45 - Disable tạo ca thi mới
23:00 - Bật maintenance mode
23:05 - Stop app, bắt đầu migration
23:10 - Backup & export
23:15 - Setup PostgreSQL
23:20 - Migrate schema
23:25 - Import data
23:35 - Verify
23:45 - Test
00:00 - Tắt maintenance mode, restart
00:05 - Thông báo hoàn thành
```

**Tổng thời gian:** 1.5 giờ (có dự phòng)

---

## ✅ Kết Luận

Maintenance mode giúp:
- ✅ Users biết hệ thống đang bảo trì
- ✅ Không bị lỗi khi truy cập
- ✅ Thông tin rõ ràng về thời gian
- ✅ Trải nghiệm chuyên nghiệp

**Nhớ test trước khi migration thật! 🧪**
