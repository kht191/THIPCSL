# VAI TRÒ GIÁM THỊ (PROCTOR)

## Tổng quan

Hệ thống hiện hỗ trợ **3 vai trò**:

1. **ADMIN** (👑 Quản trị viên) - Toàn quyền quản lý hệ thống
2. **PROCTOR** (👁️ Giám thị) - Giám sát thi và mở khóa bài thi
3. **CANDIDATE** (📝 Thí sinh) - Tham gia thi

## Quyền hạn của PROCTOR

### ✅ Được phép:
- **Giám sát thi** (`/admin/monitor`)
  - Xem danh sách thí sinh đang làm bài real-time
  - Xem tiến độ làm bài của từng thí sinh
  - **Mở khóa bài thi** cho thí sinh bị khóa do vi phạm
  - Lọc theo ca thi, tìm kiếm thí sinh

- **Xem kết quả thi** (`/admin/results`)
  - Xem danh sách kết quả thi
  - Xem chi tiết bài làm của thí sinh
  - Lọc theo ca thi, trạng thái

- **Xem thống kê** (`/admin/statistics`)
  - Xem thống kê tổng quan
  - Xem phân bố điểm
  - Xem thống kê theo đơn vị, đề thi
  - Xuất báo cáo Excel

### ❌ Không được phép:
- Quản lý người dùng
- Quản lý chủ đề
- Quản lý câu hỏi
- Quản lý đề thi
- Quản lý ca thi
- Xóa kết quả thi

## Cách tạo tài khoản Giám thị

### Cách 1: Tạo thủ công
1. Đăng nhập với tài khoản **ADMIN**
2. Vào **Quản lý Người dùng**
3. Click **+ Thêm nhân viên**
4. Điền thông tin:
   - Tài khoản: `giamthi01`
   - Mật khẩu: `password123`
   - Họ tên: `Nguyễn Văn A`
   - Phòng ban: `Phòng Thi`
   - Lĩnh vực: (để trống)
   - **Vai trò: Giám thị (PROCTOR)** ⭐
5. Click **Tạo mới**

### Cách 2: Import Excel
1. Tải file mẫu từ trang Quản lý Người dùng
2. Thêm dòng mới với cột Role = `PROCTOR`
3. Upload file Excel

Ví dụ:
```
Username | Password | Full Name    | Department | Field | Role
giamthi01| 123456   | Nguyễn Văn A | Phòng Thi  |       | PROCTOR
giamthi02| 123456   | Trần Thị B   | Phòng Thi  |       | PROCTOR
```

## Giao diện Giám thị

Khi đăng nhập với tài khoản PROCTOR:

### Sidebar
```
┌─────────────────────────┐
│ Giám thị                │
│                         │
│ Nguyễn Văn A            │
│ Phòng Thi               │
│ 👁️ Giám thị            │
├─────────────────────────┤
│ ⭐ Giám sát thi        │ ← Trang chính
│ Kết quả thi             │
│ Thống kê                │
│                         │
│ Đăng xuất               │
└─────────────────────────┘
```

### Trang Giám sát thi
- Hiển thị danh sách thí sinh đang làm bài
- Cột: Họ tên, Username, Đơn vị, Đề thi, Ca thi, Tiến độ, Trạng thái
- **Nút "Mở khóa"** cho thí sinh bị khóa
- Bộ lọc: Tìm kiếm, Lọc theo ca thi
- Tự động cập nhật mỗi 10 giây

## Quy trình mở khóa bài thi

### Khi nào cần mở khóa?
Thí sinh bị khóa khi:
- Vi phạm quá số lần cho phép (mặc định: 3 lần)
- Vi phạm bao gồm:
  - Thoát fullscreen
  - Chuyển tab/cửa sổ khác
  - Mất focus khỏi trang thi

### Cách mở khóa:
1. Vào trang **Giám sát thi**
2. Tìm thí sinh bị khóa (badge đỏ "Đang bị khóa")
3. Click nút **"Mở khóa"**
4. Xác nhận: "Bạn có chắc muốn mở khóa cho thí sinh này?"
5. Thí sinh có thể tiếp tục làm bài

### Lưu ý:
- ⚠️ Chỉ mở khóa khi **xác minh** thí sinh có lý do chính đáng
- ⚠️ Thí sinh cần **reload trang** (F5) sau khi được mở khóa
- ⚠️ Số lần vi phạm **không reset** sau khi mở khóa

## Ví dụ kịch bản

### Kịch bản 1: Thí sinh bị khóa do lỗi kỹ thuật
```
Thí sinh: "Em bị mất mạng giữa chừng, giờ bị khóa bài thi!"
Giám thị:
1. Vào trang Giám sát thi
2. Tìm thí sinh trong danh sách
3. Xác minh tình huống (kiểm tra log nếu cần)
4. Click "Mở khóa"
5. Hướng dẫn thí sinh reload trang (F5)
6. Thí sinh tiếp tục làm bài
```

### Kịch bản 2: Giám sát nhiều phòng thi
```
Giám thị có thể:
1. Lọc theo Ca thi để xem từng phòng
2. Tìm kiếm nhanh theo tên thí sinh
3. Theo dõi tiến độ real-time
4. Xử lý mở khóa kịp thời
```

## Bảo mật

### Phân quyền chặt chẽ:
- ✅ PROCTOR **không thể** xem/sửa/xóa người dùng
- ✅ PROCTOR **không thể** tạo/sửa đề thi
- ✅ PROCTOR **không thể** xóa kết quả thi
- ✅ PROCTOR **chỉ có thể** giám sát và mở khóa

### Kiểm tra quyền:
- Frontend: Sidebar chỉ hiển thị menu được phép
- Backend: API kiểm tra role trước khi xử lý
- Redirect: Tự động chuyển về trang Giám sát nếu truy cập trang không được phép

## Câu hỏi thường gặp

**Q: Giám thị có thể xem đáp án đúng không?**
A: Có, khi xem chi tiết kết quả thi sau khi thí sinh nộp bài.

**Q: Giám thị có thể sửa điểm không?**
A: Không, điểm được tính tự động và không thể sửa.

**Q: Giám thị có thể xóa kết quả thi không?**
A: Không, chỉ ADMIN mới có quyền xóa.

**Q: Giám thị có thể tạo đề thi không?**
A: Không, chỉ ADMIN mới có quyền quản lý đề thi.

**Q: Một người có thể vừa là Giám thị vừa là Thí sinh không?**
A: Không, mỗi tài khoản chỉ có 1 vai trò duy nhất.

## Thay đổi vai trò

### Nâng cấp CANDIDATE → PROCTOR:
1. ADMIN vào Quản lý Người dùng
2. Click "Sửa" tài khoản cần nâng cấp
3. Đổi Vai trò thành "Giám thị (PROCTOR)"
4. Lưu

### Hạ cấp PROCTOR → CANDIDATE:
Tương tự, đổi vai trò về "Thí sinh (CANDIDATE)"

## Tổng kết

Vai trò **PROCTOR** được thiết kế để:
- ✅ Giảm tải công việc cho ADMIN
- ✅ Tăng tốc độ xử lý sự cố trong kỳ thi
- ✅ Phân quyền rõ ràng, bảo mật cao
- ✅ Dễ sử dụng, giao diện thân thiện

**Lưu ý quan trọng:**
- Chỉ giao quyền PROCTOR cho người **đáng tin cậy**
- Giám thị cần được **đào tạo** về quy trình xử lý sự cố
- Mọi thao tác mở khóa nên được **ghi chép** (có thể thêm log sau này)
