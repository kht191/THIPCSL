# BÁO CÁO KIỂM TRA MODULE PHÂN QUYỀN NGƯỜI DÙNG — THIPCSL

**Ngày kiểm tra:** 2026-07-31
**Phạm vi:** Toàn bộ module phân quyền (Database, Backend, Frontend, Middleware)
**Kết quả build:** ✅ `npm run build` thành công, không lỗi TypeScript
**Kết quả lint:** ⚠️ 422 issues (toàn bộ là pre-existing: `any` types, unused vars — không liên quan module mới)

---

## 1. KẾT LUẬN TỔNG QUAN

**ĐẠT MỘT PHẦN** — Module hoạt động đúng luồng cơ bản nhưng tồn tại **2 lỗi nghiêm trọng** và **5 lỗi trung bình** cần sửa.

---

## 2. CÁC LỖI NGHIÊM TRỌNG

### 🔴 Lỗi #1 (CRITICAL): Override/Fallback — CUSTOM rỗng bị hiểu thành ROLE DEFAULT

**File:** `lib/permissions.ts` — hàm `hasPermission()` dòng 73 và `getUserPermissions()` dòng 101

**Mô tả:** Cả hai hàm dùng `userPermissions.length > 0` để phân biệt CUSTOM vs ROLE. Khi Admin bỏ chọn TOÀN BỘ quyền và lưu:

```
setUserPermissions(userId, [])  // mảng rỗng
  → deleteMany (xóa hết)
  → permissions = [] (vì findMany với key in [] trả về rỗng)
  → KHÔNG tạo bản ghi UserPermission nào
  → userPermissions.length === 0
  → hasPermission rơi vào nhánh fallback
  → DÙNG ROLE DEFAULTS thay vì CUSTOM rỗng!
```

**Hậu quả:** Không thể lưu trạng thái "user này không có quyền admin nào" ở chế độ CUSTOM. Khi admin bỏ chọn tất cả rồi lưu, user tự động quay về quyền mặc định theo role — **đây là hành vi sai**.

**Cách sửa:** Thêm trường `permissionMode` vào User model (`ROLE` | `CUSTOM`) để phân biệt rõ ràng:
```prisma
model User {
  permissionMode String @default("ROLE") // "ROLE" | "CUSTOM"
}
```
Khi `permissionMode === "CUSTOM"` → luôn dùng `userPermissions` (dù rỗng). Khi `"ROLE"` → dùng role defaults.

### 🔴 Lỗi #2 (CRITICAL): Không có quyền `users.permissions` riêng — trộn với `users.edit`

**File:** `app/api/admin/users/[id]/permissions/route.ts` dòng 9, 33

**Mô tả:** API GET/PUT permissions dùng chung key `users.view` và `users.edit` với các API quản lý user thông thường. Người có quyền sửa thông tin user (họ tên, phòng ban) cũng có thể sửa quyền.

**Hậu quả:** Không thể cấp quyền "sửa thông tin user" mà không cấp kèm "sửa phân quyền". Vi phạm nguyên tắc least privilege.

**Cách sửa:** Thêm permission key mới `users.permissions` và dùng nó cho API permissions thay vì `users.edit`.

---

## 3. CÁC LỖI MỨC TRUNG BÌNH

### 🟡 Lỗi #3: Permission quá thô — `*.manage` gộp cả view/create/edit/delete

**Mô tả:** `questions.manage`, `topics.manage`, `exams.manage`, `sessions.manage` là các quyền monolithic — không thể tách riêng quyền xem và quyền sửa. Nếu muốn cho phép xem câu hỏi nhưng không cho sửa/xóa thì không làm được.

**Đề xuất:** Trong tương lai tách thành `*.view`, `*.create`, `*.edit`, `*.delete`. Hiện tại hệ thống 14 quyền vẫn đủ dùng, việc tách cần migration riêng, KHÔNG làm trong lần này.

### 🟡 Lỗi #4: Trang admin không có server-side permission check

**Mô tả:** Các trang như `/admin/questions`, `/admin/topics`, `/admin/exams`... chỉ bị ẩn menu (client-side), nhưng nếu người dùng gõ URL trực tiếp, **trang vẫn render**. Mặc dù dữ liệu không load được vì API bị chặn bởi `requirePermission`, nhưng giao diện vẫn hiện ra khung trang trống.

**Cách sửa:** Wrap mỗi trang admin bằng `RoleGuard` component với `requiredPermission` prop. VD:
```tsx
// app/admin/questions/page.tsx
export default function QuestionsPage() {
    return (
        <RoleGuard requiredPermission="questions.manage">
            <QuestionsContent />
        </RoleGuard>
    );
}
```

### 🟡 Lỗi #5: Middleware không chặn CANDIDATE gọi `/api/admin/*`

**Mô tả:** Middleware chỉ kiểm tra role cho page routes (`/admin/*`), không kiểm tra cho `/api/admin/*`. CANDIDATE có token hợp lệ có thể gọi trực tiếp API admin (dù sẽ bị `requirePermission` chặn với 403).

**Đánh giá:** Đây không phải lỗ hổng vì `requirePermission` đã chặn ở tầng API (defense-in-depth). Tuy nhiên, thêm role check trong middleware cho `/api/admin/*` sẽ giảm tải DB query không cần thiết.

### 🟡 Lỗi #6: Không chặn tự khóa quyền quản trị của chính mình

**Mô tả:** Admin có thể:
- Tự bỏ chọn tất cả quyền của chính mình → mất toàn bộ quyền admin
- Đổi role của chính mình thành CANDIDATE → mất quyền admin
- Không có cảnh báo "bạn sắp mất quyền quản trị"

**Cách sửa:** Thêm validation trong API `PUT /api/admin/users/[id]` và `PUT /api/admin/users/[id]/permissions`: không cho phép admin cuối cùng tự hủy quyền.

### 🟡 Lỗi #7: Tab Phân quyền không ẩn với người không có quyền

**Mô tả:** Tab "Phân quyền" trong `app/admin/users/[id]/page.tsx` hiển thị cho tất cả người dùng vào được trang edit user. Không có check `can('users.edit')` để ẩn tab.

---

## 4. CÁC LỖI MỨC THẤP

- `RoleGuard.tsx` được định nghĩa nhưng chưa được dùng ở bất kỳ trang nào
- `app/admin/page.tsx` có đoạn comment code check role (dòng 100-114) — nên xóa
- Middleware không kiểm tra `is_active` — user bị khóa vẫn có token hợp lệ

---

## 5. BẢNG TOÀN BỘ API VÀ PERMISSION

### Admin API Routes (34 routes — TẤT CẢ ĐÃ ĐƯỢC BẢO VỆ)

| API | Method | Permission | Trạng thái |
|:---|:---|:---|:---|
| `/api/admin/users` | GET | `users.view` | ✅ |
| `/api/admin/users` | POST | `users.create` | ✅ |
| `/api/admin/users` | PUT | `users.edit` | ✅ |
| `/api/admin/users` | DELETE | `users.delete` | ✅ |
| `/api/admin/users/[id]` | GET | `users.view` | ✅ |
| `/api/admin/users/[id]` | PUT | `users.edit` | ✅ |
| `/api/admin/users/[id]` | PATCH | `users.edit` | ✅ |
| `/api/admin/users/[id]` | DELETE | `users.delete` | ✅ |
| `/api/admin/users/[id]/permissions` | GET | `users.view` | ⚠️ Nên dùng `users.permissions` |
| `/api/admin/users/[id]/permissions` | PUT | `users.edit` | ⚠️ Nên dùng `users.permissions` |
| `/api/admin/users/import` | POST | `users.import_export` | ✅ |
| `/api/admin/users/export` | POST | `users.import_export` | ✅ |
| `/api/admin/users/batch` | PATCH | `users.edit` | ✅ |
| `/api/admin/users/filters` | GET | `users.view` | ✅ |
| `/api/admin/questions` | GET/POST/DELETE | `questions.manage` | ✅ |
| `/api/admin/questions/[id]` | GET/PUT/DELETE | `questions.manage` | ✅ |
| `/api/admin/questions/import` | POST | `questions.manage` | ✅ |
| `/api/admin/topics` | GET/POST | `topics.manage` | ✅ |
| `/api/admin/topics/[id]` | PUT/DELETE | `topics.manage` | ✅ |
| `/api/admin/topics/import` | POST | `topics.manage` | ✅ |
| `/api/admin/topics/reorder` | POST | `topics.manage` | ✅ |
| `/api/admin/topics/export` | GET | `topics.manage` | ✅ |
| `/api/admin/topics/[id]/export` | GET | `topics.manage` | ✅ |
| `/api/admin/exams` | GET/POST | `exams.manage` | ✅ |
| `/api/admin/exams/[id]` | GET/PUT/DELETE | `exams.manage` | ✅ |
| `/api/admin/exams/import` | POST | `exams.manage` | ✅ |
| `/api/admin/exams/import-users` | POST | `exams.manage` | ✅ |
| `/api/admin/exams/two-part` | POST | `exams.manage` | ✅ |
| `/api/admin/exams/two-part/[id]` | GET/PUT | `exams.manage` | ✅ |
| `/api/admin/exams/[id]/publish-practice` | POST | `exams.manage` | ✅ |
| `/api/admin/sessions` | GET/POST/PUT/DELETE | `sessions.manage` | ✅ |
| `/api/admin/monitor` | GET | `monitor.view` | ✅ |
| `/api/admin/results` | GET/DELETE | `results.view` | ✅ |
| `/api/admin/results/[id]` | GET/PATCH/DELETE | `results.view` | ✅ |
| `/api/admin/results/[id]/unlock` | POST | `exam.unlock` | ✅ |
| `/api/admin/statistics` | GET | `statistics.view` | ✅ |
| `/api/admin/stats/topics` | GET | `statistics.view` | ✅ |
| `/api/admin/samples/*` | GET | `users.view` | ✅ |

### Kết luận API: **0 route thiếu `requirePermission`**. 34/34 routes được bảo vệ.

---

## 6. BẢNG TOÀN BỘ TRANG VÀ PERMISSION

| Trang | Permission xem trang | Server-side check? | Truy cập URL trực tiếp? | Trạng thái |
|:---|:---|:---|:---|:---|
| `/admin` | `users.view` | ✅ Layout ẩn menu | ⚠️ Trang render (API chặn data) | Cần RoleGuard |
| `/admin/users/[id]` | `users.view` | ✅ Layout ẩn menu | ⚠️ Trang render (API chặn data) | Cần RoleGuard |
| `/admin/users/create` | `users.create` | ✅ Layout ẩn menu | ⚠️ Form hiện (API chặn POST) | Cần RoleGuard |
| `/admin/questions` | `questions.manage` | ✅ Layout ẩn menu | ⚠️ Trang render (API chặn data) | Cần RoleGuard |
| `/admin/topics` | `topics.manage` | ✅ Layout ẩn menu | ⚠️ Trang render (API chặn data) | Cần RoleGuard |
| `/admin/exams` | `exams.manage` | ✅ Layout ẩn menu | ⚠️ Trang render (API chặn data) | Cần RoleGuard |
| `/admin/sessions` | `sessions.manage` | ✅ Layout ẩn menu | ⚠️ Trang render (API chặn data) | Cần RoleGuard |
| `/admin/monitor` | `monitor.view` | ✅ Layout ẩn menu | ⚠️ Trang render (API chặn data) | Cần RoleGuard |
| `/admin/results` | `results.view` | ✅ Layout ẩn menu | ⚠️ Trang render (API chặn data) | Cần RoleGuard |
| `/admin/statistics` | `statistics.view` | ✅ Layout ẩn menu | ⚠️ Trang render (API chặn data) | Cần RoleGuard |

---

## 7. CÁC FILE CẦN SỬA

### Sửa ngay (2 file — lỗi nghiêm trọng):

| File | Vấn đề | Cách sửa |
|:---|:---|:---|
| `lib/permissions.ts` | `userPermissions.length > 0` không phân biệt được CUSTOM rỗng với ROLE | Thêm `permissionMode` field |
| `prisma/schema.prisma` | Thiếu `permissionMode` trên User | Thêm `permissionMode String @default("ROLE")` |

### Sửa khi có thời gian (5 file — lỗi trung bình):

| File | Vấn đề |
|:---|:---|
| `app/admin/users/[id]/page.tsx` | Tab Phân quyền không check quyền; cần ẩn với người không có `users.edit` |
| `app/admin/page.tsx` | Xóa comment code vô dụng dòng 100-114 |
| Các trang `/admin/*/page.tsx` | Wrap với `RoleGuard requiredPermission="..."` |
| `middleware.ts` | Thêm role check cho `/api/admin/*` paths |
| `app/api/admin/users/[id]/route.ts` | Thêm validation chống tự khóa admin cuối cùng |

---

## 8. ĐỀ XUẤT MIGRATION DATABASE

```sql
-- Thêm cột permissionMode vào User (không ảnh hưởng dữ liệu hiện có)
ALTER TABLE "User" ADD COLUMN "permissionMode" TEXT NOT NULL DEFAULT 'ROLE';
```

Logic sau migration:
- `permissionMode = 'ROLE'` → dùng `ROLE_DEFAULT_PERMISSIONS[user.role]`
- `permissionMode = 'CUSTOM'` → dùng `userPermissions` (có thể rỗng)
- Khi Admin lưu quyền → set `permissionMode = 'CUSTOM'`
- Khi "Khôi phục theo vai trò" → set `permissionMode = 'ROLE'` + xóa UserPermission

---

## 9. KẾT QUẢ KIỂM THỬ TỪNG TRƯỜNG HỢP

| Test | Mô tả | Kết quả |
|:---|:---|:---|
| A | ADMIN mặc định có tất cả quyền | ✅ Đạt |
| B | PROCTOR mặc định có 5 quyền | ✅ Đạt |
| C | CANDIDATE không vào được /admin | ✅ Đạt (middleware chặn) |
| D | PROCTOR được cấp `users.view` — xem được user | ✅ Đạt |
| E | PROCTOR `users.create` không có `users.view` | ⚠️ Tạo được nhưng không thấy danh sách — bất hợp lý |
| F | CUSTOM 1 quyền — chỉ quyền đó hiệu lực | ✅ Đạt |
| G | CUSTOM rỗng — không quyền admin | 🔴 **LỖI**: Rơi về ROLE DEFAULT |
| H | Khôi phục theo vai trò | ✅ Đạt |
| I | Gọi API trực tiếp thiếu quyền → 403 | ✅ Đạt |
| J | Gõ URL trực tiếp `/admin/questions` | ⚠️ Trang render (dù API chặn data) |
| K | Gửi permission key giả → API từ chối | ✅ Đạt (không tạo bản ghi) |
| L | Tự khóa quyền chính mình | 🔴 **LỖI**: Admin tự hủy được |
| M | Quản trị viên cuối cùng | 🔴 **LỖI**: Không có bảo vệ |

---

## 10. KẾT QUẢ BUILD & LINT

```
npm run build: ✅ SUCCESS — 0 TypeScript errors
npm run lint:  ⚠️ 422 issues (pre-existing: any types, unused vars)
```

Lint issues trong file permission module:
- `lib/permissions.ts:158` — `any` type (pre-existing pattern từ `lib/auth.ts`)
- `components/RoleGuard.tsx:20` — missing dependency warning

---

## 11. DANH SÁCH THAY ĐỔI ĐỀ XUẤT

### Cần làm NGAY (tuần này):
1. **Thêm `permissionMode`** vào User model + sửa `hasPermission()`, `getUserPermissions()`, `setUserPermissions()`
2. **Thêm `users.permissions` key** mới cho API phân quyền
3. **Chống tự khóa admin cuối cùng** trong API edit user và permissions

### Nên làm SỚM (tháng này):
4. **Wrap tất cả admin pages** với `RoleGuard requiredPermission`
5. **Middleware role check** cho `/api/admin/*`
6. **Ẩn tab Phân quyền** với người không có quyền

### Cân nhắc TƯƠNG LAI:
7. Tách `*.manage` thành `*.view`, `*.create`, `*.edit`, `*.delete` (cần migration + update toàn bộ code)
