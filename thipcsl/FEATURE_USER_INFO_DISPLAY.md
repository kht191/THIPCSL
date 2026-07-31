# Feature: Hiển thị Thông Tin Người Thi

## 📋 Mô tả

Thêm thông tin người thi (tên, username, đơn vị) vào header giao diện làm bài thi để dễ dàng xác định thí sinh đang làm bài.

---

## ✅ Thay đổi

### 1. Backend API (`app/api/exam-runner/[id]/route.ts`)

**Thêm fetch user info (dòng 35-40):**
```typescript
// Fetch user info
const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, full_name: true, department: true, field: true }
});
```

**Thêm user vào response (dòng 336-341):**
```typescript
return NextResponse.json({
    exam: { ... },
    user: {
        username: user?.username,
        full_name: user?.full_name,
        department: user?.department,
        field: user?.field
    },
    questions: sanitizedQuestions,
    ...
});
```

---

### 2. Frontend (`app/exam/[id]/page.tsx`)

**Thêm state userInfo (dòng 13):**
```typescript
const [userInfo, setUserInfo] = useState<any>(null);
```

**Lưu user info từ API (dòng 46):**
```typescript
const data = await res.json();
setExam(data.exam);
setUserInfo(data.user);  // ← Thêm dòng này
setQuestions(data.questions);
```

**Hiển thị thông tin user trên header (dòng 456-477):**
```tsx
<div className="flex-1 min-w-0 mr-4">
    <h1 className="text-lg sm:text-xl font-bold text-blue-800 truncate">
        {exam.title}
    </h1>
    <div className="flex items-center gap-3 text-xs mt-1">
        <span className="text-gray-700">
            <span className="font-semibold">Thí sinh:</span> {userInfo?.full_name || userInfo?.username}
        </span>
        {userInfo?.username && (
            <span className="text-gray-600">
                ({userInfo.username})
            </span>
        )}
        {userInfo?.department && (
            <span className="text-gray-600 hidden sm:inline">
                • {userInfo.department}
            </span>
        )}
        <span className="text-red-600 font-bold ml-auto sm:ml-0">
            Vi phạm: {violationCount}/{exam.max_violations || 3}
        </span>
    </div>
</div>
```

---

## 🎨 Giao diện

### Desktop
```
┌─────────────────────────────────────────────────────────────┐
│ Đề thi Cuối kỳ ATTT                           ⏱ 45:30  [Nộp bài] │
│ Thí sinh: Nguyễn Văn A (nguyenvana) • Khoa CNTT   Vi phạm: 0/3    │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 25%                │
└─────────────────────────────────────────────────────────────┘
```

### Mobile
```
┌──────────────────────────────────┐
│ Đề thi Cuối kỳ ATTT    ⏱ 45:30  │
│ Thí sinh: Nguyễn Văn A           │
│ (nguyenvana)        Vi phạm: 0/3 │
│ ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░ 25%  │
└──────────────────────────────────┘
```

---

## 📱 Responsive Design

- **Desktop (≥ 1024px):** Hiển thị đầy đủ: Tên + Username + Đơn vị
- **Tablet/Mobile (< 1024px):** Ẩn đơn vị, chỉ hiển thị: Tên + Username

---

## 🔧 Điều chỉnh Layout

### Header
- Giảm padding: `py-4 h-20` → `py-3` (auto height)
- Thêm responsive padding: `px-8` → `px-4 sm:px-8`

### Main Content
- Tăng padding-top: `pt-24` → `pt-28` (để tránh header che nội dung)

### Sidebar
- Tăng sticky top: `top-24` → `top-28`
- Điều chỉnh max-height: `max-h-[calc(100vh-8rem)]` → `max-h-[calc(100vh-9rem)]`

### Question Cards
- Tăng scroll margin: `scroll-mt-28` → `scroll-mt-32`

---

## 📊 Thông tin hiển thị

| Field | Hiển thị | Fallback |
|-------|----------|----------|
| **Tên đầy đủ** | `userInfo.full_name` | `userInfo.username` |
| **Username** | `(userInfo.username)` | Ẩn nếu không có |
| **Đơn vị** | `userInfo.department` | Ẩn nếu không có |
| **Lĩnh vực** | `userInfo.field` | Không hiển thị (dự phòng) |

---

## ✅ Checklist

- ✅ API trả về thông tin user
- ✅ Frontend lưu và hiển thị user info
- ✅ Responsive design (desktop/mobile)
- ✅ Layout điều chỉnh phù hợp
- ✅ Không ảnh hưởng database schema
- ✅ Không ảnh hưởng các màn hình khác (locked, conflict, warning)

---

## 🎯 Lợi ích

1. **Xác định thí sinh:** Giám thị dễ dàng xác định ai đang làm bài
2. **Tránh nhầm lẫn:** Thí sinh biết chắc mình đang đăng nhập đúng tài khoản
3. **Chuyên nghiệp:** Giao diện trông chuyên nghiệp hơn
4. **Hỗ trợ giám sát:** Khi giám sát qua màn hình, dễ dàng nhận biết thí sinh

---

## 📸 Preview

**Trước:**
```
Đề thi Cuối kỳ ATTT                    ⏱ 45:30  [Nộp bài]
Vi phạm: 0/3
```

**Sau:**
```
Đề thi Cuối kỳ ATTT                              ⏱ 45:30  [Nộp bài]
Thí sinh: Nguyễn Văn A (nguyenvana) • Khoa CNTT   Vi phạm: 0/3
```

---

## 🔄 Tương thích

- ✅ Tương thích với tất cả trình duyệt hiện đại
- ✅ Responsive trên mobile/tablet/desktop
- ✅ Không ảnh hưởng performance (chỉ 1 query thêm)
- ✅ Không breaking changes
