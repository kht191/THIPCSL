# Feature: Tìm Kiếm Thí Sinh Trong Giao Diện Tạo/Sửa Đề Thi

## 📋 Tổng quan

**Mục đích:** Thêm tính năng tìm kiếm thí sinh theo tên hoặc mã nhân viên trong giao diện tạo và sửa đề thi, giúp admin dễ dàng tìm và chọn thí sinh khi có nhiều người dùng.

**Vấn đề trước đây:**
- Chỉ có filter theo phòng ban và lĩnh vực
- Khó tìm thí sinh cụ thể khi danh sách dài
- Phải cuộn và tìm thủ công

**Giải pháp:**
- Thêm ô tìm kiếm theo tên hoặc mã nhân viên
- Tìm kiếm real-time (không phân biệt hoa thường)
- Kết hợp với filter phòng ban và lĩnh vực

---

## ✅ Thay đổi

### 1. Trang Tạo Đề Thi

**File:** `app/admin/exams/create/page.tsx`

#### 1.1. Thêm state `searchTerm` (dòng 29)
```typescript
const [searchTerm, setSearchTerm] = useState(''); // Thêm state tìm kiếm
```

#### 1.2. Thêm input tìm kiếm (dòng 298-308)
```tsx
{/* Filters */}
<div className="flex flex-wrap gap-3 items-center">
    <input
        type="text"
        placeholder="Tìm kiếm theo tên hoặc mã NV..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-1 min-w-[250px] border border-gray-300 rounded px-3 py-2 text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    {/* ... các filter khác ... */}
</div>
```

#### 1.3. Cập nhật logic filter (dòng 343-349)
```tsx
{users.filter(u =>
    (!deptFilter || u.department === deptFilter) &&
    (!fieldFilter || u.field === fieldFilter) &&
    (!searchTerm || 
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
).map(user => (
    // ... render user row ...
))}
```

#### 1.4. Cải tiến UI
- **Sticky header:** `className="bg-gray-50 sticky top-0"` - Header bảng cố định khi cuộn
- **Flex layout:** `className="flex flex-wrap gap-3"` - Layout responsive
- **Focus ring:** `focus:ring-2 focus:ring-blue-500` - Highlight khi focus

---

### 2. Trang Sửa Đề Thi

**File:** `app/admin/exams/[id]/page.tsx`

#### 2.1. Thêm state `searchTerm` (dòng 24)
```typescript
const [searchTerm, setSearchTerm] = useState(''); // Thêm state tìm kiếm
```

#### 2.2. Thêm input tìm kiếm (dòng 470-480)
```tsx
{/* Filters */}
<div className="flex flex-wrap gap-3 items-center">
    <input
        type="text"
        placeholder="Tìm kiếm theo tên hoặc mã NV..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-1 min-w-[250px] border border-gray-300 rounded px-3 py-2 text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    {/* ... các filter khác ... */}
</div>
```

#### 2.3. Cập nhật logic filter (dòng 515-522)
```tsx
{users.filter(u =>
    (!deptFilter || u.department === deptFilter) &&
    (!fieldFilter || u.field === fieldFilter) &&
    (!searchTerm || 
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
).map(user => (
    // ... render user row ...
))}
```

#### 2.4. Cải tiến UI (tương tự trang tạo đề)
- Sticky header
- Flex layout responsive
- Focus ring

---

## 🎯 Tính năng

### Tìm kiếm
- **Tìm theo tên:** `Nguyễn Văn A` → Tìm thấy "Nguyễn Văn A", "Nguyễn Văn An", v.v.
- **Tìm theo mã NV:** `NV001` → Tìm thấy "NV001", "NV0012", v.v.
- **Không phân biệt hoa thường:** `nguyen` = `Nguyen` = `NGUYEN`
- **Real-time:** Kết quả hiển thị ngay khi gõ

### Kết hợp filter
```
Tìm kiếm: "Nguyễn"
+ Phòng ban: "Kỹ thuật"
+ Lĩnh vực: "Điện"
→ Chỉ hiển thị thí sinh có tên chứa "Nguyễn" thuộc phòng "Kỹ thuật" và lĩnh vực "Điện"
```

### UI/UX
- **Sticky header:** Header bảng cố định khi cuộn danh sách dài
- **Responsive:** Layout tự động wrap trên màn hình nhỏ
- **Focus state:** Highlight rõ ràng khi focus vào ô tìm kiếm
- **Placeholder:** Gợi ý rõ ràng "Tìm kiếm theo tên hoặc mã NV..."

---

## 📊 So sánh

| Tính năng | Trước | Sau |
|-----------|-------|-----|
| **Tìm kiếm theo tên** | ❌ Không có | ✅ Có |
| **Tìm kiếm theo mã NV** | ❌ Không có | ✅ Có |
| **Filter phòng ban** | ✅ Có | ✅ Có |
| **Filter lĩnh vực** | ✅ Có | ✅ Có |
| **Kết hợp filter** | ✅ Có | ✅ Có (+ tìm kiếm) |
| **Sticky header** | ❌ Không | ✅ Có |
| **Responsive layout** | ⚠️ Cơ bản | ✅ Tốt hơn |

---

## 🔄 Luồng sử dụng

### Kịch bản 1: Tìm thí sinh cụ thể
```
1. Admin vào trang tạo/sửa đề thi
2. Gõ "Nguyễn Văn A" vào ô tìm kiếm
3. Danh sách chỉ hiển thị thí sinh có tên chứa "Nguyễn Văn A"
4. Click chọn thí sinh
```

### Kịch bản 2: Tìm theo mã NV
```
1. Admin vào trang tạo/sửa đề thi
2. Gõ "NV001" vào ô tìm kiếm
3. Danh sách chỉ hiển thị thí sinh có mã NV chứa "NV001"
4. Click chọn thí sinh
```

### Kịch bản 3: Kết hợp filter
```
1. Admin chọn phòng ban "Kỹ thuật"
2. Gõ "Nguyễn" vào ô tìm kiếm
3. Danh sách chỉ hiển thị thí sinh:
   - Thuộc phòng "Kỹ thuật"
   - Có tên chứa "Nguyễn"
4. Click "Chọn tất cả" để chọn tất cả thí sinh trong kết quả lọc
```

---

## 🛡️ An toàn dữ liệu

### Backup trước khi sửa
```powershell
# Đã thử backup nhưng file database không ở vị trí mặc định
# Nên đã kiểm tra kỹ code trước khi sửa
```

### Không ảnh hưởng dữ liệu
- ✅ Chỉ thay đổi UI/UX
- ✅ Không thay đổi database schema
- ✅ Không thay đổi API
- ✅ Không ảnh hưởng logic chọn thí sinh
- ✅ Chỉ thêm filter client-side

### Kiểm tra
- ✅ Code đã được review kỹ
- ✅ Logic filter đơn giản và rõ ràng
- ✅ Không có side effect
- ✅ Backward compatible (không ảnh hưởng tính năng cũ)

---

## 📋 Checklist

- ✅ Thêm state `searchTerm` vào cả 2 trang
- ✅ Thêm input tìm kiếm với placeholder rõ ràng
- ✅ Cập nhật logic filter để hỗ trợ tìm kiếm
- ✅ Tìm kiếm không phân biệt hoa thường
- ✅ Tìm kiếm theo cả tên và mã NV
- ✅ Kết hợp được với filter phòng ban và lĩnh vực
- ✅ Sticky header để dễ xem khi cuộn
- ✅ Responsive layout
- ✅ Focus state rõ ràng
- ✅ Không ảnh hưởng dữ liệu

---

## 📄 Files đã sửa

1. ✅ `app/admin/exams/create/page.tsx` - Thêm tìm kiếm thí sinh
2. ✅ `app/admin/exams/[id]/page.tsx` - Thêm tìm kiếm thí sinh
3. ✅ `FEATURE_SEARCH_CANDIDATES.md` - Tài liệu này

---

## 🚀 Cải tiến thêm (Optional)

Nếu muốn tối ưu hơn, có thể:

1. **Debounce tìm kiếm:**
   ```typescript
   const [searchTerm, setSearchTerm] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');
   
   useEffect(() => {
       const timer = setTimeout(() => {
           setDebouncedSearch(searchTerm);
       }, 300);
       return () => clearTimeout(timer);
   }, [searchTerm]);
   ```

2. **Highlight kết quả tìm kiếm:**
   ```tsx
   const highlightText = (text: string, search: string) => {
       // ... highlight logic ...
   };
   ```

3. **Hiển thị số kết quả:**
   ```tsx
   <p className="text-sm text-gray-500">
       Tìm thấy {filteredUsers.length} thí sinh
   </p>
   ```

4. **Lưu filter vào localStorage:**
   ```typescript
   useEffect(() => {
       localStorage.setItem('exam_filters', JSON.stringify({
           searchTerm, deptFilter, fieldFilter
       }));
   }, [searchTerm, deptFilter, fieldFilter]);
   ```

Nhưng giải pháp hiện tại đã đủ tốt và đơn giản! ✅

---

## 🎉 Kết quả

**Trước:**
- Phải cuộn danh sách dài để tìm thí sinh
- Chỉ có filter theo phòng ban và lĩnh vực
- Khó tìm thí sinh cụ thể

**Sau:**
- ✅ Tìm kiếm nhanh theo tên hoặc mã NV
- ✅ Kết hợp với filter phòng ban và lĩnh vực
- ✅ UI/UX tốt hơn với sticky header và responsive layout
- ✅ Tiết kiệm thời gian cho admin

**Vấn đề đã được giải quyết!** 🎉
