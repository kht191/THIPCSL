# HƯỚNG DẪN KIỂM TRA VÀ SỬA LỖI THỐNG KÊ

## Vấn đề
Trang thống kê vẫn hiển thị kết quả ôn tập (PRACTICE) mặc dù đã lọc.

## Nguyên nhân có thể
1. **Server chưa restart** - Code mới chưa được load
2. **Cache trình duyệt** - Frontend đang dùng dữ liệu cũ
3. **Code frontend có vấn đề** - Đang fetch từ endpoint khác

## Các bước kiểm tra

### Bước 1: Restart server
```bash
# Dừng server hiện tại (Ctrl+C)
# Sau đó chạy lại:
npm run dev
```

### Bước 2: Xóa cache trình duyệt
1. Mở trang thống kê
2. Nhấn **Ctrl + Shift + R** (hoặc Cmd + Shift + R trên Mac)
3. Hoặc mở DevTools (F12) → Tab Network → Check "Disable cache"

### Bước 3: Kiểm tra API response
1. Mở DevTools (F12)
2. Vào tab **Network**
3. Reload trang thống kê
4. Tìm request đến `/api/admin/statistics`
5. Click vào request đó
6. Xem tab **Response**
7. Kiểm tra:
   - `summary.total` - Phải là số kết quả OFFICIAL (hiện tại là 1)
   - `results` - Phải chỉ có kết quả OFFICIAL

### Bước 4: Kiểm tra Console log
Sau khi restart server và reload trang, xem terminal server, phải thấy log:
```
[Statistics API] Total results: 20, Official: 1, Practice: 19
```

## Kết quả mong đợi

Với dữ liệu hiện tại trong database:
- **Tổng kết quả COMPLETED**: 20
- **Kết quả OFFICIAL**: 1 (đề "p10" của user "tiepkh")
- **Kết quả PRACTICE**: 19

➡️ Trang thống kê phải hiển thị:
- Tổng thí sinh: **1**
- Danh sách chi tiết: **1 dòng** (Kiều Hoàng Tiệp - p10 - Điểm: 1)
- **KHÔNG có** bất kỳ kết quả ôn tập nào

## Nếu vẫn thấy kết quả PRACTICE

Hãy chụp màn hình:
1. Trang thống kê (phần danh sách chi tiết)
2. DevTools → Network → Response của `/api/admin/statistics`
3. Terminal server (phần log)

Để tôi kiểm tra thêm.

## Code đã sửa

File: `app/api/admin/statistics/route.ts`
- Dòng 56-57: Filter chỉ giữ lại `exam.type === 'OFFICIAL'`
- Dòng 60-125: Tất cả tính toán dùng `officialResults`

File: `app/admin/statistics/page.tsx`
- Dòng 299: Thêm chú thích "Chỉ thống kê đề thi chính thức"
