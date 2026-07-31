# Fix: Quay Lại Đúng Vị Trí Trang Khi Xem Chi Tiết Kết Quả

## 🐛 Vấn đề

**Scenario:**
1. Admin vào `/admin/results` (Quản lý Kết quả)
2. Chuyển đến trang 5 (ví dụ)
3. Click "Chi tiết" một kết quả → Vào `/admin/results/[id]`
4. Ấn "Quay lại"
5. ❌ **BUG:** Quay về trang 1, không phải trang 5!

**Nguyên nhân:**
- Link "Chi tiết" không lưu thông tin trang hiện tại
- Nút "Quay lại" dùng `window.history.back()` hoặc redirect về `/admin/results` (mặc định trang 1)

---

## ✅ Giải pháp

### Bước 1: Thêm query parameter vào link "Chi tiết"

**File:** `app/admin/results/page.tsx` (dòng 256)

**Trước:**
```tsx
<Link href={`/admin/results/${result.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
    Chi tiết
</Link>
```

**Sau:**
```tsx
<Link href={`/admin/results/${result.id}?page=${page}`} className="text-blue-600 hover:text-blue-900 mr-4">
    Chi tiết
</Link>
```

**Giải thích:** Thêm `?page=${page}` vào URL để lưu vị trí trang hiện tại.

---

### Bước 2: Đọc query parameter và redirect về đúng trang

**File:** `app/admin/results/[id]/page.tsx`

#### 2.1. Import `useSearchParams` (dòng 4)
```typescript
import { useRouter, useSearchParams } from 'next/navigation';
```

#### 2.2. Khởi tạo `searchParams` (dòng 9)
```typescript
const router = useRouter();
const searchParams = useSearchParams();
```

#### 2.3. Tạo hàm `handleBack` (dòng 33-41)
```typescript
const handleBack = () => {
    const page = searchParams.get('page');
    if (page) {
        router.push(`/admin/results?page=${page}`);
    } else {
        router.push('/admin/results');
    }
};
```

#### 2.4. Sử dụng `handleBack` thay vì `window.history.back()` (dòng 67)
```tsx
<button
    onClick={handleBack}
    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
>
    Quay lại
</button>
```

---

### Bước 3: Khôi phục vị trí trang khi load

**File:** `app/admin/results/page.tsx`

#### 3.1. Import `useSearchParams` (dòng 4)
```typescript
import { useSearchParams } from 'next/navigation';
```

#### 3.2. Khởi tạo `searchParams` (dòng 8)
```typescript
const searchParams = useSearchParams();
```

#### 3.3. Khởi tạo `page` từ query parameter (dòng 14-18)
```typescript
const [page, setPage] = useState(() => {
    // Khởi tạo page từ query parameter nếu có
    const pageParam = searchParams.get('page');
    return pageParam ? parseInt(pageParam) : 1;
});
```

**Giải thích:** Khi load trang `/admin/results?page=5`, state `page` sẽ được khởi tạo với giá trị `5`.

---

## 🎯 Kịch bản được fix

### Kịch bản 1: Xem chi tiết và quay lại
1. Admin vào `/admin/results` (trang 1)
2. Chuyển đến trang 5 → URL: `/admin/results` (client-side state)
3. Click "Chi tiết" kết quả → URL: `/admin/results/abc-123?page=5` ✅
4. Ấn "Quay lại" → Redirect `/admin/results?page=5` ✅
5. Trang load với `page = 5` ✅

### Kịch bản 2: Xem chi tiết từ trang 1
1. Admin vào `/admin/results` (trang 1)
2. Click "Chi tiết" → URL: `/admin/results/abc-123?page=1` ✅
3. Ấn "Quay lại" → Redirect `/admin/results?page=1` ✅
4. Trang load với `page = 1` ✅

### Kịch bản 3: Truy cập trực tiếp link chi tiết (không có page param)
1. User vào trực tiếp `/admin/results/abc-123` (không có `?page=X`)
2. Ấn "Quay lại" → Redirect `/admin/results` (mặc định trang 1) ✅

---

## 🔄 Luồng hoạt động

```
Admin ở trang 5 → Click "Chi tiết"
    ↓
URL: /admin/results/[id]?page=5
    ↓
Trang chi tiết load
    ↓
searchParams.get('page') → "5"
    ↓
Admin ấn "Quay lại"
    ↓
handleBack() → router.push('/admin/results?page=5')
    ↓
Trang danh sách load
    ↓
useState(() => {
    const pageParam = searchParams.get('page'); // "5"
    return pageParam ? parseInt(pageParam) : 1; // 5
})
    ↓
Trang load với page = 5 ✅
    ↓
fetchData(5) → Hiển thị dữ liệu trang 5 ✅
```

---

## 📊 So sánh

| Tình huống | Trước (BUG) | Sau (FIXED) |
|------------|-------------|-------------|
| **Ở trang 5 → Chi tiết → Quay lại** | Về trang 1 ❌ | Về trang 5 ✅ |
| **Ở trang 10 → Chi tiết → Quay lại** | Về trang 1 ❌ | Về trang 10 ✅ |
| **Truy cập trực tiếp link chi tiết** | Về trang 1 ✅ | Về trang 1 ✅ |

---

## ⚠️ Lưu ý

### Query Parameter vs Client State
- **Trước:** Pagination chỉ dùng client state (`useState`)
- **Sau:** Pagination dùng cả query parameter (`?page=X`) và client state
- **Lợi ích:** 
  - URL phản ánh đúng trạng thái
  - Có thể bookmark/share link với trang cụ thể
  - Quay lại đúng vị trí

### Fallback
- Nếu không có `?page=X` trong URL → Mặc định `page = 1`
- Đảm bảo không bị lỗi khi truy cập trực tiếp

### Performance
- `useState(() => {...})` chỉ chạy 1 lần khi component mount
- Không ảnh hưởng performance

---

## 📋 Checklist

- ✅ Link "Chi tiết" lưu thông tin trang hiện tại
- ✅ Nút "Quay lại" redirect về đúng trang
- ✅ Trang danh sách khôi phục vị trí từ query parameter
- ✅ Fallback về trang 1 nếu không có query parameter
- ✅ Không ảnh hưởng logic khác

---

## 📄 Files đã sửa

1. ✅ `app/admin/results/page.tsx` - Thêm `?page=${page}` vào link, khôi phục page từ query param
2. ✅ `app/admin/results/[id]/page.tsx` - Đọc query param và redirect về đúng trang
3. ✅ `FIX_PAGINATION_BACK_NAVIGATION.md` - Tài liệu này

---

## 🚀 Cải tiến thêm (Optional)

Nếu muốn tối ưu hơn, có thể:

1. **Sync URL với pagination state:**
   ```typescript
   useEffect(() => {
       router.replace(`/admin/results?page=${page}`, { scroll: false });
   }, [page]);
   ```

2. **Lưu thêm filter và search:**
   ```typescript
   ?page=5&sessionId=abc&search=nguyen
   ```

3. **Sử dụng Next.js Router Events** để track navigation

Nhưng giải pháp hiện tại đã đủ tốt và đơn giản! ✅
