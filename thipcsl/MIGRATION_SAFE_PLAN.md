# 🔔 Kế Hoạch Migration An Toàn - Không Ảnh Hưởng Users

## 📅 Timeline Khuyến Nghị

### **1 Tuần Trước Migration**

#### Thông Báo Cho Users
```
Tiêu đề: THÔNG BÁO BẢO TRÌ HỆ THỐNG

Nội dung:
Kính gửi quý thầy cô và học viên,

Hệ thống thi trắc nghiệm sẽ được nâng cấp để cải thiện hiệu suất 
và hỗ trợ nhiều người dùng đồng thời hơn.

Thời gian bảo trì: [Chủ nhật, DD/MM/YYYY, 23:00 - 01:00]
Thời gian dự kiến: 1-2 giờ
Ảnh hưởng: Hệ thống tạm ngưng hoạt động trong thời gian bảo trì

Đề nghị quý thầy cô và học viên:
- Hoàn thành các bài thi/ôn tập trước thời gian bảo trì
- Không bắt đầu bài thi mới sau 22:30
- Lưu lại tiến độ ôn tập

Trân trọng,
Ban quản trị
```

#### Checklist Chuẩn Bị
- [ ] Gửi email thông báo
- [ ] Đăng thông báo trên hệ thống
- [ ] Thông báo trên group chat (nếu có)
- [ ] Backup dữ liệu hiện tại

---

### **1 Ngày Trước Migration**

#### Nhắc Nhở Lại
```
NHẮC NHỞ: BẢO TRÌ HỆ THỐNG VÀO ĐÊM NAY

Thời gian: 23:00 - 01:00 đêm nay
Hệ thống sẽ tạm ngưng hoạt động

Đề nghị:
- Hoàn thành bài thi/ôn tập trước 22:30
- Không bắt đầu bài thi mới sau 22:30
```

#### Checklist
- [ ] Kiểm tra không có ca thi nào trong thời gian bảo trì
- [ ] Kiểm tra số users online hiện tại
- [ ] Chuẩn bị môi trường migration
- [ ] Test rollback plan

---

### **2 Giờ Trước Migration (21:00)**

#### Thông Báo Cuối
```
THÔNG BÁO: Hệ thống sẽ bảo trì sau 2 giờ (23:00)
Vui lòng hoàn thành bài thi/ôn tập trước 22:30
```

#### Checklist
- [ ] Kiểm tra số users online
- [ ] Disable tạo ca thi mới
- [ ] Chuẩn bị maintenance page

---

### **30 Phút Trước Migration (22:30)**

#### Cảnh Báo Cuối Cùng
```
CẢNH BÁO: Hệ thống sẽ bảo trì sau 30 phút
Vui lòng KHÔNG bắt đầu bài thi mới
Lưu lại tiến độ ôn tập
```

#### Actions
- [ ] Disable đăng ký thi mới
- [ ] Kiểm tra users đang thi
- [ ] Chuẩn bị maintenance mode

---

### **Trong Migration (23:00 - 01:00)**

#### Bật Maintenance Mode

**File:** `app/maintenance/page.tsx` (tạo mới)

```typescript
export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Hệ Thống Đang Bảo Trì
        </h1>
        <p className="text-gray-600 mb-6">
          Hệ thống đang được nâng cấp để phục vụ quý thầy cô và học viên tốt hơn.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Thời gian dự kiến:</strong> 23:00 - 01:00
          </p>
          <p className="text-sm text-blue-800 mt-2">
            <strong>Trạng thái:</strong> Đang nâng cấp database...
          </p>
        </div>
        <p className="text-sm text-gray-500">
          Vui lòng quay lại sau. Xin cảm ơn!
        </p>
      </div>
    </div>
  );
}
```

**File:** `middleware.ts` (cập nhật)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';

export function middleware(request: NextRequest) {
  // Maintenance mode
  if (MAINTENANCE_MODE && !request.nextUrl.pathname.startsWith('/maintenance')) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // ... existing middleware code ...
}
```

**File:** `.env` (thêm)

```env
MAINTENANCE_MODE=true
```

#### Migration Steps
```powershell
# 1. Bật maintenance mode
# Sửa .env: MAINTENANCE_MODE=true
# Restart app

# 2. Chờ users hiện tại logout/finish (5-10 phút)

# 3. Bắt đầu migration
.\backup-sqlite.bat
npx tsx scripts/export-sqlite-data.ts
.\setup-postgres.bat YOUR_PASSWORD
# Sửa .env: DATABASE_URL="postgresql://..."
npx prisma generate
npx prisma migrate dev --name init_postgresql
npx tsx scripts/import-postgresql-data.ts

# 4. Verify
npx tsx verify-migration.ts

# 5. Test
npm run dev

# 6. Tắt maintenance mode
# Sửa .env: MAINTENANCE_MODE=false
# Restart app
```

---

### **Sau Migration (01:00)**

#### Thông Báo Hoàn Thành
```
THÔNG BÁO: Hệ thống đã hoạt động trở lại

Hệ thống đã được nâng cấp thành công!

Cải tiến:
✅ Hỗ trợ nhiều người dùng đồng thời hơn
✅ Hiệu suất tốt hơn
✅ Ổn định hơn

Hệ thống đã sẵn sàng phục vụ.
Cảm ơn quý thầy cô và học viên đã kiên nhẫn chờ đợi!
```

#### Checklist
- [ ] Verify hệ thống hoạt động bình thường
- [ ] Test các chức năng chính
- [ ] Monitor trong 24h đầu
- [ ] Gửi thông báo hoàn thành

---

## 🚨 Xử Lý Khẩn Cấp

### Nếu Migration Thất Bại

```powershell
# ROLLBACK NGAY LẬP TỨC

# 1. Restore .env
DATABASE_URL="file:./dev.db"
MAINTENANCE_MODE=false

# 2. Restore schema
git checkout HEAD -- prisma/schema.prisma

# 3. Regenerate
npx prisma generate

# 4. Restart
npm run dev

# 5. Thông báo
"Hệ thống đã hoạt động trở lại. 
 Việc nâng cấp sẽ được thực hiện vào thời gian khác."
```

**Thời gian rollback:** < 5 phút

---

## 📊 Giảm Thiểu Downtime

### Mục Tiêu
- **Downtime tối đa:** 2 giờ
- **Downtime thực tế:** 30-60 phút
- **Thời gian dự phòng:** 1 giờ

### Tối Ưu Hóa
1. **Chuẩn bị trước:**
   - PostgreSQL đã cài sẵn
   - Scripts đã test
   - Backup đã sẵn sàng

2. **Làm nhanh:**
   - Chạy scripts tự động
   - Không làm thủ công
   - Có checklist

3. **Verify nhanh:**
   - Dùng verify-migration.ts
   - Test các chức năng chính
   - Monitor logs

---

## 📋 Checklist Tổng Thể

### Trước Migration
- [ ] Chọn thời điểm (đêm/cuối tuần)
- [ ] Thông báo 1 tuần trước
- [ ] Nhắc nhở 1 ngày trước
- [ ] Chuẩn bị maintenance page
- [ ] Test migration trên dev
- [ ] Chuẩn bị rollback plan

### Trong Migration
- [ ] Bật maintenance mode
- [ ] Chờ users logout (5-10 phút)
- [ ] Chạy migration scripts
- [ ] Verify kết quả
- [ ] Test application
- [ ] Tắt maintenance mode

### Sau Migration
- [ ] Thông báo hoàn thành
- [ ] Monitor 24h đầu
- [ ] Kiểm tra performance
- [ ] Thu thập feedback

---

## ✅ Kết Luận

### Migration An Toàn Khi:
- ✅ Làm ngoài giờ cao điểm
- ✅ Thông báo trước đầy đủ
- ✅ Có maintenance mode
- ✅ Có rollback plan
- ✅ Test kỹ trước

### Downtime:
- **Dự kiến:** 1-2 giờ
- **Thực tế:** 30-60 phút
- **Ảnh hưởng:** Tối thiểu (nếu làm đêm)

---

**Khuyến nghị:** Làm vào **Chủ nhật tối 23:00 - 01:00** để ảnh hưởng ít nhất! 🌙
