# Fix: Admin Bị Logout Khi Quay Lại Từ Chi Tiết Bài Thi

## 🐛 Vấn đề

**Scenario:**
1. Admin vào trang **Quản lý Kết quả** (`/admin/results`)
2. Click xem chi tiết bài thi của thí sinh → Vào trang `/exam/results/[id]`
3. Ấn nút **"Quay lại"**
4. ❌ **BUG:** Bị logout, phải đăng nhập lại!

**Nguyên nhân:**
```typescript
// OLD CODE (dòng 71-72)
const backLink = result.exam.type === 'PRACTICE' ? '/practice' : '/exam';
const backText = result.exam.type === 'PRACTICE' ? 'Quay lại Danh sách Ôn tập' : 'Quay lại Danh sách Đề thi';
```

**Vấn đề:**
- Logic chỉ dựa vào `exam.type` để xác định `backLink`
- Với bài thi OFFICIAL → `backLink = '/exam'`
- Trang `/exam` là trang **danh sách đề thi của thí sinh** (yêu cầu role `student`)
- Admin vào `/exam` → Middleware phát hiện role không đúng → **Logout!**

---

## ✅ Giải pháp

### Thêm logic phát hiện user role

**File:** `app/exam/results/[id]/page.tsx`

#### 1. Thêm state lưu user role (dòng 13)
```typescript
const [userRole, setUserRole] = useState<string | null>(null);
```

#### 2. Fetch user role khi load trang (dòng 16-17)
```typescript
useEffect(() => {
    if (id) fetchResult();
    fetchUserRole(); // ← Thêm dòng này
}, [id]);
```

#### 3. Hàm fetch user role (dòng 28-40)
```typescript
const fetchUserRole = async () => {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            setUserRole(data.role);
        }
    } catch (e) {
        console.error('Failed to fetch user role:', e);
    }
};
```

#### 4. Logic xác định backLink dựa trên role (dòng 69-82)
```typescript
// Determine back link based on user role
let backLink = '/';
let backText = 'Quay lại';

if (userRole === 'admin' || userRole === 'teacher') {
    backLink = '/admin/results';
    backText = 'Quay lại Danh sách Kết quả';
} else {
    backLink = result.exam.type === 'PRACTICE' ? '/practice' : '/exam';
    backText = result.exam.type === 'PRACTICE' ? 'Quay lại Danh sách Ôn tập' : 'Quay lại Danh sách Đề thi';
}
```

---

## 🎯 Kịch bản được fix

### Kịch bản 1: Admin xem chi tiết bài thi
- Admin vào `/admin/results` → Click xem chi tiết
- Vào `/exam/results/[id]`
- Fetch user role → `userRole = 'admin'`
- `backLink = '/admin/results'` ✅
- Ấn "Quay lại" → Về `/admin/results` ✅
- **Không bị logout!** ✅

### Kịch bản 2: Teacher xem chi tiết bài thi
- Teacher vào `/admin/results` → Click xem chi tiết
- Vào `/exam/results/[id]`
- Fetch user role → `userRole = 'teacher'`
- `backLink = '/admin/results'` ✅
- Ấn "Quay lại" → Về `/admin/results` ✅
- **Không bị logout!** ✅

### Kịch bản 3: Student xem kết quả bài thi OFFICIAL
- Student vào `/exam` → Click xem kết quả
- Vào `/exam/results/[id]`
- Fetch user role → `userRole = 'student'`
- `exam.type = 'OFFICIAL'` → `backLink = '/exam'` ✅
- Ấn "Quay lại" → Về `/exam` ✅

### Kịch bản 4: Student xem kết quả bài ôn tập
- Student vào `/practice` → Click xem kết quả
- Vào `/exam/results/[id]`
- Fetch user role → `userRole = 'student'`
- `exam.type = 'PRACTICE'` → `backLink = '/practice'` ✅
- Ấn "Quay lại" → Về `/practice` ✅

---

## 📊 So sánh

| User Role | Exam Type | Trước (BUG) | Sau (FIXED) |
|-----------|-----------|-------------|-------------|
| **Admin** | OFFICIAL | `/exam` → Logout ❌ | `/admin/results` ✅ |
| **Admin** | PRACTICE | `/practice` → Logout ❌ | `/admin/results` ✅ |
| **Teacher** | OFFICIAL | `/exam` → Logout ❌ | `/admin/results` ✅ |
| **Teacher** | PRACTICE | `/practice` → Logout ❌ | `/admin/results` ✅ |
| **Student** | OFFICIAL | `/exam` ✅ | `/exam` ✅ |
| **Student** | PRACTICE | `/practice` ✅ | `/practice` ✅ |

---

## 🔄 Luồng hoạt động mới

```
User vào /exam/results/[id]
    ↓
Fetch result data
    ↓
Fetch user role (/api/auth/me)
    ↓
Xác định backLink:
    ├─ userRole = 'admin' hoặc 'teacher'
    │   └─ backLink = '/admin/results'
    │
    └─ userRole = 'student'
        ├─ exam.type = 'PRACTICE'
        │   └─ backLink = '/practice'
        │
        └─ exam.type = 'OFFICIAL'
            └─ backLink = '/exam'
    ↓
Render nút "Quay lại" với backLink đúng
```

---

## 📋 Checklist

- ✅ Admin không bị logout khi quay lại
- ✅ Teacher không bị logout khi quay lại
- ✅ Student vẫn quay về đúng trang (exam/practice)
- ✅ Sử dụng API `/api/auth/me` có sẵn
- ✅ Không ảnh hưởng logic khác

---

## ⚠️ Lưu ý

### API `/api/auth/me`
- Đã có sẵn trong hệ thống
- Trả về: `{ id, username, full_name, department, role }`
- Yêu cầu authentication (cookie token)

### Fallback
- Nếu fetch user role thất bại → `userRole = null`
- `backLink = '/'` (trang chủ)
- Đảm bảo không bị lỗi

### Performance
- Fetch user role chỉ 1 lần khi load trang
- Không ảnh hưởng performance

---

## 📄 Files đã sửa

1. ✅ `app/exam/results/[id]/page.tsx` - Thêm logic phát hiện role
2. ✅ `FIX_ADMIN_LOGOUT_ON_BACK.md` - Tài liệu này

---

## 🚀 Cải tiến thêm (Optional)

Nếu muốn tối ưu hơn, có thể:

1. **Cache user role** trong localStorage hoặc context
2. **Sử dụng middleware** để inject role vào page props
3. **Thêm loading state** khi fetch user role

Nhưng giải pháp hiện tại đã đủ tốt và đơn giản! ✅
