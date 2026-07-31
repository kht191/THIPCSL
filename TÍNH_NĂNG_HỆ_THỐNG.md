# TÀI LIỆU TÍNH NĂNG HỆ THỐNG THI TRẮC NGHIỆM TRỰC TUYẾN

## 📋 MỤC LỤC

1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Module Quản lý Nhân viên](#1-module-quản-lý-nhân-viên)
3. [Module Quản lý Câu hỏi](#2-module-quản-lý-câu-hỏi)
4. [Module Quản lý Chủ đề](#3-module-quản-lý-chủ-đề)
5. [Module Quản lý Đề thi](#4-module-quản-lý-đề-thi)
6. [Module Quản lý Ca thi](#5-module-quản-lý-ca-thi)
7. [Module Giám sát Thi](#6-module-giám-sát-thi)
8. [Module Kết quả Thi](#7-module-kết-quả-thi)
9. [Module Thống kê](#8-module-thống-kê)
10. [Module Thi sinh - Làm bài thi](#9-module-thi-sinh---làm-bài-thi)
11. [Module Ôn tập](#10-module-ôn-tập)
12. [Hệ thống Bảo mật & Chống gian lận](#11-hệ-thống-bảo-mật--chống-gian-lận)

---

## TỔNG QUAN HỆ THỐNG

### Kiến trúc
- **Frontend**: Next.js 14 (React, TypeScript, Tailwind CSS)
- **Backend**: Next.js API Routes
- **Database**: SQLite với Prisma ORM
- **Authentication**: JWT Token-based

### Vai trò người dùng
1. **ADMIN**: Quản trị viên - Toàn quyền quản lý hệ thống
2. **CANDIDATE**: Thí sinh - Tham gia thi và ôn tập

### Cấu trúc Database chính
- **User**: Thông tin người dùng (username, password, full_name, department, field, role)
- **Question**: Ngân hàng câu hỏi
- **Topic**: Cây chủ đề phân cấp
- **Exam**: Đề thi (OFFICIAL/PRACTICE)
- **ExamSession**: Ca thi
- **Result**: Kết quả thi (IN_PROGRESS/COMPLETED)

---

## 1. MODULE QUẢN LÝ NHÂN VIÊN

**Đường dẫn**: `/admin` (trang chủ admin)

### 1.1. Tính năng Xem danh sách
- ✅ Hiển thị danh sách nhân viên dạng bảng
- ✅ Phân trang (10/25/50/100/Tất cả)
- ✅ Hiển thị: Username, Họ tên, Phòng ban, Lĩnh vực, Vai trò

### 1.2. Tính năng Tìm kiếm & Lọc
- ✅ **Tìm kiếm**: Theo tên đăng nhập hoặc họ tên (debounce 500ms)
- ✅ **Lọc theo Đơn vị**: Dropdown danh sách phòng ban có sẵn
- ✅ **Lọc theo Lĩnh vực**: Dropdown danh sách lĩnh vực có sẵn
- ✅ **Nút Xóa lọc**: Reset tất cả bộ lọc về mặc định

### 1.3. Tính năng Thêm nhân viên
- ✅ Form thêm mới: Username, Password, Họ tên, Phòng ban, Lĩnh vực, Vai trò
- ✅ Validation: Username phải unique
- ✅ Mã hóa mật khẩu bằng bcrypt

### 1.4. Tính năng Sửa nhân viên
- ✅ Cập nhật thông tin: Họ tên, Phòng ban, Lĩnh vực, Vai trò
- ✅ Đổi mật khẩu (chỉ khi nhập mật khẩu mới)
- ✅ Không cho phép sửa Username

### 1.5. Tính năng Xóa nhân viên
- ✅ Xóa đơn lẻ với xác nhận
- ✅ **Xóa hàng loạt**: Chọn nhiều nhân viên → Nút "Xóa (n)"
- ✅ Cascade delete: Tự động xóa kết quả thi liên quan

### 1.6. Tính năng Import/Export Excel
- ✅ **Import**: Upload file Excel (.xlsx, .xls)
  - Cột: Username | Password | Full Name | Department | Field
  - Tự động tạo mới hoặc cập nhật nếu username đã tồn tại
  - Báo cáo chi tiết: Số dòng tạo mới, cập nhật, lỗi
  - Tải file mẫu: `/api/admin/samples/users`
  
- ✅ **Export**: Xuất danh sách nhân viên đã chọn ra Excel
  - Chọn nhiều nhân viên → Nút "Xuất Excel (n)"
  - File tên: `export_users_[timestamp].xlsx`

### 1.7. Tính năng Chuyển phòng ban hàng loạt
- ✅ Chọn nhiều nhân viên → Nút "Chuyển phòng ban (n)"
- ✅ Modal cho phép:
  - Chọn phòng ban có sẵn từ dropdown
  - Hoặc nhập tên phòng ban mới
- ✅ Cập nhật hàng loạt với 1 lần click

### 1.8. Tính năng Cập nhật Lĩnh vực hàng loạt
- ✅ Chọn nhiều nhân viên → Nút "Cập nhật Lĩnh vực (n)"
- ✅ Modal cho phép:
  - Chọn lĩnh vực có sẵn từ dropdown
  - Nhập lĩnh vực mới
  - Hoặc **xóa lĩnh vực** (checkbox "Xóa lĩnh vực")

### 1.9. Tính năng Chọn hàng loạt
- ✅ Checkbox "Chọn tất cả" ở header bảng
- ✅ Checkbox từng dòng
- ✅ Highlight dòng đã chọn (màu xanh nhạt)
- ✅ Hiển thị số lượng đã chọn trên các nút hành động

---

## 2. MODULE QUẢN LÝ CÂU HỎI

**Đường dẫn**: `/admin/questions`

### 2.1. Tính năng Xem danh sách
- ✅ Hiển thị: Nội dung câu hỏi, Chủ đề, Đáp án đúng
- ✅ Phân trang (10/25/50/100/Tất cả)
- ✅ Hiển thị tổng số câu hỏi

### 2.2. Tính năng Tìm kiếm & Lọc
- ✅ **Tìm kiếm**: Theo nội dung câu hỏi (debounce)
- ✅ **Lọc theo Chủ đề**: Dropdown cây chủ đề phân cấp
- ✅ Nút "Xóa lọc"

### 2.3. Tính năng Thêm câu hỏi
- ✅ Form nhập:
  - Nội dung câu hỏi (textarea)
  - Chọn chủ đề (dropdown cây phân cấp)
  - Nhập 4 đáp án (A, B, C, D)
  - Chọn đáp án đúng (checkbox - hỗ trợ nhiều đáp án)
- ✅ Validation: Phải có ít nhất 1 đáp án đúng

### 2.4. Tính năng Sửa câu hỏi
- ✅ Cập nhật nội dung, chủ đề, đáp án
- ✅ Thay đổi đáp án đúng (single/multiple)

### 2.5. Tính năng Xóa câu hỏi
- ✅ Xóa đơn lẻ với xác nhận
- ✅ **Xóa hàng loạt**: Chọn nhiều câu → Nút "Xóa (n)"

### 2.6. Tính năng Import/Export Excel
- ✅ **Import**: Upload file Excel
  - Cột: Content | Topic | A | B | C | D | Correct
  - Tự động map chủ đề theo tên
  - Hỗ trợ đáp án đúng dạng "A", "AB", "ABC"
  - Tải file mẫu: `/api/admin/samples/questions`
  
- ✅ **Export**: Xuất câu hỏi đã chọn ra Excel

### 2.7. Tính năng Chuyển chủ đề hàng loạt
- ✅ Chọn nhiều câu hỏi → Nút "Chuyển chủ đề (n)"
- ✅ Modal chọn chủ đề mới từ cây phân cấp
- ✅ Cập nhật hàng loạt

---

## 3. MODULE QUẢN LÝ CHỦ ĐỀ

**Đường dẫn**: `/admin/topics`

### 3.1. Tính năng Cây chủ đề phân cấp
- ✅ Hiển thị dạng cây (parent-child)
- ✅ Expand/Collapse từng nhánh
- ✅ Hiển thị số lượng câu hỏi trong mỗi chủ đề
- ✅ Hiển thị trạng thái Active/Inactive

### 3.2. Tính năng Thêm chủ đề
- ✅ Thêm chủ đề gốc (root topic)
- ✅ Thêm chủ đề con (chọn parent)
- ✅ Nhập tên chủ đề
- ✅ Chọn trạng thái Active/Inactive

### 3.3. Tính năng Sửa chủ đề
- ✅ Đổi tên chủ đề
- ✅ Thay đổi parent (di chuyển trong cây)
- ✅ Bật/tắt trạng thái Active

### 3.4. Tính năng Xóa chủ đề
- ✅ Xóa chủ đề (chỉ khi không có câu hỏi)
- ✅ Cảnh báo nếu có chủ đề con
- ✅ Cascade delete chủ đề con (nếu cho phép)

### 3.5. Tính năng Sắp xếp thứ tự
- ✅ Trường `order` để sắp xếp hiển thị
- ✅ Drag & drop (nếu có UI hỗ trợ)
- ✅ Hoặc nhập số thứ tự thủ công

### 3.6. Tính năng Tối ưu thêm chủ đề
- ✅ **Modal tạo nhanh**: Nhập nhiều chủ đề cùng lúc (mỗi dòng 1 chủ đề)
- ✅ Tự động tạo với parent đã chọn
- ✅ Giảm thời gian thêm từ nhiều phút xuống vài giây

---

## 4. MODULE QUẢN LÝ ĐỀ THI

**Đường dẫn**: `/admin/exams`

### 4.1. Tính năng Xem danh sách
- ✅ Hiển thị: Tên đề, Loại (Chính thức/Ôn tập), Trạng thái, Số câu, Thời gian
- ✅ Phân trang
- ✅ Badge màu phân biệt loại đề

### 4.2. Tính năng Tìm kiếm & Lọc
- ✅ Tìm kiếm theo tên đề
- ✅ Lọc theo loại (OFFICIAL/PRACTICE)
- ✅ Lọc theo trạng thái (OPEN/CLOSED)

### 4.3. Tính năng Tạo đề thi Chính thức
- ✅ Nhập thông tin cơ bản:
  - Tên đề thi
  - Thời gian làm bài (phút)
  - Số lần làm tối đa
  - Số lần vi phạm tối đa
  - Điểm đạt (pass score)
  
- ✅ **Chọn câu hỏi theo 2 cách**:
  1. **Chọn thủ công**: Tick checkbox từng câu
  2. **Tạo ma trận tự động**:
     - Chọn các chủ đề cần thi
     - Nhập số câu cho mỗi chủ đề
     - Hệ thống random câu hỏi theo ma trận
     - Lưu cấu hình ma trận để tái tạo đề

- ✅ **Phân quyền thí sinh**:
  - Tất cả thí sinh
  - Theo phòng ban cụ thể
  - Chọn từng thí sinh

### 4.4. Tính năng Tạo đề Ôn tập (Practice)
- ✅ Tương tự đề chính thức
- ✅ Chỉ người tạo mới thấy và làm được
- ✅ Không giới hạn số lần làm
- ✅ Không có chống gian lận

### 4.5. Tính năng Sửa đề thi
- ✅ Cập nhật thông tin cơ bản
- ✅ Thêm/bớt câu hỏi
- ✅ **Tái tạo ma trận**: Nút "Tạo lại ma trận" để random lại câu hỏi theo cấu hình đã lưu
- ✅ Thay đổi phân quyền thí sinh

### 4.6. Tính năng Xóa đề thi
- ✅ Xóa đơn lẻ
- ✅ Cảnh báo nếu đã có kết quả thi
- ✅ Cascade delete kết quả (nếu cho phép)

### 4.7. Tính năng Mở/Đóng đề thi
- ✅ Toggle trạng thái OPEN/CLOSED
- ✅ Chỉ đề OPEN mới cho phép thi sinh làm bài

### 4.8. Tính năng Xem trước đề thi
- ✅ Xem danh sách câu hỏi trong đề
- ✅ Hiển thị đầy đủ nội dung và đáp án
- ✅ Kiểm tra trước khi mở đề

---

## 5. MODULE QUẢN LÝ CA THI

**Đường dẫn**: `/admin/sessions`

### 5.1. Tính năng Xem danh sách
- ✅ Hiển thị: Tên ca thi, Đề thi, Thời gian bắt đầu, Thời gian kết thúc, Trạng thái
- ✅ Badge màu: ACTIVE (xanh), INACTIVE (xám)

### 5.2. Tính năng Tạo ca thi
- ✅ Nhập tên ca thi
- ✅ Chọn đề thi (dropdown)
- ✅ Chọn thời gian bắt đầu (datetime picker)
- ✅ Chọn thời gian kết thúc (datetime picker)
- ✅ Chọn trạng thái ban đầu

### 5.3. Tính năng Sửa ca thi
- ✅ Cập nhật tên, thời gian
- ✅ Thay đổi đề thi
- ✅ Bật/tắt trạng thái

### 5.4. Tính năng Xóa ca thi
- ✅ Xóa với xác nhận
- ✅ Cảnh báo nếu có kết quả thi

### 5.5. Tính năng Kích hoạt/Vô hiệu hóa
- ✅ Toggle ACTIVE/INACTIVE
- ✅ Chỉ ca ACTIVE mới hiển thị cho thí sinh

---

## 6. MODULE GIÁM SÁT THI

**Đường dẫn**: `/admin/monitor`

### 6.1. Tính năng Giám sát thời gian thực
- ✅ Hiển thị danh sách thí sinh đang làm bài (status = IN_PROGRESS)
- ✅ **Tự động cập nhật**: Poll server mỗi 10 giây
- ✅ Hiển thị thời gian cập nhật cuối

### 6.2. Tính năng Hiển thị thông tin thí sinh
- ✅ Họ tên, Username, Phòng ban
- ✅ Tên đề thi
- ✅ Tên ca thi (nếu có)
- ✅ Thời gian bắt đầu làm bài

### 6.3. Tính năng Hiển thị tiến độ
- ✅ **Progress bar**: Thanh tiến trình % hoàn thành
- ✅ **Số câu đã làm / Tổng số câu**: Ví dụ "15 / 50 câu"
- ✅ Tính toán real-time từ `details.answers`

### 6.4. Tính năng Hiển thị trạng thái
- ✅ **Đang thi**: Badge xanh, có hiệu ứng pulse
- ✅ **Đang bị khóa**: Badge đỏ, hiển thị nút "Mở khóa"

### 6.5. Tính năng Mở khóa bài thi
- ✅ Nút "Mở khóa" cho thí sinh bị khóa
- ✅ Xác nhận trước khi mở
- ✅ Cập nhật `is_locked = false` trong database
- ✅ Thí sinh có thể tiếp tục làm bài

### 6.6. Tính năng Xem chi tiết bài làm
- ✅ Link "Chi tiết" → `/admin/monitor/[resultId]`
- ✅ Xem câu hỏi, đáp án thí sinh đã chọn (real-time)
- ✅ Không hiển thị đáp án đúng (tránh rò rỉ)

### 6.7. Tính năng Tìm kiếm & Lọc
- ✅ **Tìm kiếm**: Theo tên thí sinh, username, tên đề thi
- ✅ **Lọc theo Ca thi**: Dropdown danh sách ca thi
- ✅ Lọc client-side (không reload trang)
- ✅ Hiển thị thông báo khi không tìm thấy kết quả

### 6.8. Tính năng Tự động nộp bài hết giờ
- ✅ Kiểm tra thời gian khi poll
- ✅ Nếu quá giờ + 2 phút buffer → Tự động gọi `autoSubmitExam()`
- ✅ Loại khỏi danh sách giám sát

---

## 7. MODULE KẾT QUẢ THI

**Đường dẫn**: `/admin/results`

### 7.1. Tính năng Xem danh sách
- ✅ Hiển thị: Thí sinh, Bài thi, Ca thi, Điểm số, Đạt/Không đạt, Thời gian nộp
- ✅ Phân trang (10/25/50/100/Tất cả)
- ✅ Badge màu: Đạt (xanh), Không đạt (đỏ), Ôn tập (xanh dương)

### 7.2. Tính năng Tìm kiếm & Lọc
- ✅ **Tìm kiếm**: Theo tên thí sinh, username, tên đề thi
- ✅ **Lọc theo Ca thi**: Dropdown danh sách ca thi
- ✅ **Lọc theo Kết quả**: Đạt/Không đạt (gợi ý từ conversation history)
- ✅ Debounce search

### 7.3. Tính năng Xem chi tiết kết quả
- ✅ Link "Chi tiết" → `/admin/results/[resultId]`
- ✅ Hiển thị:
  - Thông tin thí sinh
  - Thông tin đề thi
  - Điểm số, trạng thái đạt/không đạt
  - Danh sách câu hỏi với đáp án thí sinh chọn
  - Đánh dấu đúng/sai từng câu
  - Hiển thị đáp án đúng

### 7.4. Tính năng Xóa kết quả
- ✅ Xóa đơn lẻ với xác nhận
- ✅ **Xóa hàng loạt**: Chọn nhiều kết quả → Nút "Xóa (n) mục đã chọn"
- ✅ Xác nhận số lượng trước khi xóa

### 7.5. Tính năng Chọn hàng loạt
- ✅ Checkbox "Chọn tất cả"
- ✅ Checkbox từng dòng
- ✅ Highlight dòng đã chọn

### 7.6. Tính năng Export kết quả
- ✅ Xuất kết quả ra Excel (dự kiến)
- ✅ Bao gồm thông tin chi tiết từng câu

---

## 8. MODULE THỐNG KÊ

**Đường dẫn**: `/admin/statistics`

### 8.1. Tính năng Thống kê tổng quan
- ✅ Tổng số thí sinh
- ✅ Tổng số câu hỏi
- ✅ Tổng số đề thi
- ✅ Tổng số kết quả thi

### 8.2. Tính năng Thống kê theo đề thi
- ✅ Số lượt thi
- ✅ Điểm trung bình
- ✅ Tỷ lệ đạt/không đạt
- ✅ Biểu đồ phân bố điểm

### 8.3. Tính năng Thống kê theo phòng ban
- ✅ Số thí sinh mỗi phòng ban
- ✅ Tỷ lệ đạt theo phòng ban
- ✅ So sánh giữa các phòng ban

### 8.4. Tính năng Thống kê theo thời gian
- ✅ Lọc theo khoảng thời gian
- ✅ Xu hướng điểm số theo thời gian
- ✅ Số lượt thi theo ngày/tuần/tháng

---

## 9. MODULE THI SINH - LÀM BÀI THI

**Đường dẫn**: `/exam/[id]`

### 9.1. Tính năng Màn hình bắt đầu
- ✅ Hiển thị tên đề thi
- ✅ Hiển thị quy định thi:
  - Yêu cầu toàn màn hình (nếu là đề chính thức)
  - Số lần vi phạm tối đa
  - Cảnh báo tự động nộp bài nếu vi phạm
- ✅ Nút "Bắt đầu làm bài"
- ✅ Tự động vào fullscreen khi bắt đầu

### 9.2. Tính năng Hiển thị đề thi
- ✅ **Header cố định**:
  - Tên đề thi
  - Đồng hồ đếm ngược (MM:SS)
  - Số lần vi phạm hiện tại / tối đa
  - Nút "Nộp bài"
  
- ✅ **Danh sách câu hỏi**:
  - Hiển thị từng câu với số thứ tự
  - 4 đáp án (A, B, C, D)
  - Hỗ trợ câu hỏi nhiều đáp án (checkbox)
  - Câu hỏi đơn đáp án (radio button)
  - Ghi chú "(Câu hỏi có nhiều đáp án)" nếu cần

- ✅ **Sidebar danh sách câu**:
  - Lưới 5 cột hiển thị số câu
  - Màu xanh: Đã làm
  - Màu xám: Chưa làm
  - Click để scroll đến câu hỏi
  - Hiển thị "Đã làm: X / Tổng: Y"

### 9.3. Tính năng Xáo trộn câu hỏi & đáp án
- ✅ **Xáo trộn thứ tự câu hỏi**: Mỗi thí sinh có thứ tự khác nhau
- ✅ **Xáo trộn thứ tự đáp án**: A, B, C, D được shuffle
- ✅ **Lưu thứ tự vào database**: Đảm bảo F5 không đổi thứ tự
- ✅ Lưu trong `details.questionOrder` và `details.optionsOrder`

### 9.4. Tính năng Tự động lưu tiến độ
- ✅ Lưu đáp án vào localStorage ngay khi chọn
- ✅ **Đồng bộ lên server**: Gọi API `/api/exam-runner/progress` mỗi khi chọn đáp án
- ✅ Khôi phục tiến độ khi F5 hoặc mất kết nối tạm thời

### 9.5. Tính năng Đồng hồ đếm ngược
- ✅ Hiển thị thời gian còn lại (MM:SS)
- ✅ Đổi màu đỏ + pulse khi còn < 5 phút
- ✅ **Tự động nộp bài** khi hết giờ
- ✅ Đồng bộ thời gian từ server (không dựa vào client)

### 9.6. Tính năng Nộp bài
- ✅ Nút "Nộp bài" ở header
- ✅ Xác nhận trước khi nộp:
  - Nếu còn câu chưa làm: "Bạn còn X câu chưa làm. Bạn có chắc muốn nộp bài?"
  - Nếu đã làm hết: "Bạn có chắc muốn nộp bài sớm?"
- ✅ Tính điểm tự động
- ✅ Hiển thị điểm ngay sau khi nộp
- ✅ Chuyển sang trang kết quả

### 9.7. Tính năng Chống gian lận (Anti-Cheating)
- ✅ **Bắt buộc toàn màn hình**: Không cho thoát fullscreen
- ✅ **Phát hiện chuyển tab**: Khi blur hoặc visibility change
- ✅ **Phát hiện thoát fullscreen**: Khi fullscreenchange
- ✅ **Đếm số lần vi phạm**: Lưu vào localStorage và database
- ✅ **Khóa bài thi** khi đạt số lần vi phạm tối đa
- ✅ **Vô hiệu hóa**:
  - Chuột phải (context menu)
  - Copy/Paste/Cut
  - Select text

### 9.8. Tính năng Khóa bài thi
- ✅ Màn hình khóa toàn màn hình
- ✅ Icon khóa 🔒
- ✅ Thông báo: "Bài thi bị khóa! Bạn đã vi phạm quy chế thi..."
- ✅ Nút "Đã được mở khóa? Tải lại trang"
- ✅ Chờ giám thị mở khóa từ module Giám sát

### 9.9. Tính năng Xử lý xung đột phiên (Session Conflict)
- ✅ **Phát hiện đăng nhập nhiều nơi**: Khi sessionToken không khớp
- ✅ **Màn hình thông báo**:
  - Icon 🔄
  - "Phiên làm việc bị gián đoạn!"
  - "Tài khoản của bạn đang được đăng nhập ở một cửa sổ/thiết bị khác"
  - Nút "Tải lại trang & Tiếp tục"
  - Nút "Quay lại trang chủ"
- ✅ **Ổn định phiên**: Giữ sessionToken khi F5 để tránh lỗi giả

### 9.10. Tính năng Xử lý mất kết nối
- ✅ Lưu đáp án vào localStorage
- ✅ Khôi phục khi kết nối lại
- ✅ Đồng bộ lên server khi có mạng

### 9.11. Tính năng Ngăn làm nhiều đề cùng lúc
- ✅ Kiểm tra khi vào đề mới
- ✅ Nếu đang có đề IN_PROGRESS khác → Chặn và thông báo
- ✅ Yêu cầu nộp bài đề cũ trước

### 9.12. Tính năng Giới hạn số lần làm
- ✅ Kiểm tra `max_attempts` của đề thi
- ✅ Đếm số lần đã làm (status = COMPLETED)
- ✅ Chặn nếu đã hết lượt
- ✅ Hiển thị thông báo: "Bạn đã hết số lần làm bài (X/Y)"

### 9.13. Tính năng Xử lý nộp bài trùng lặp
- ✅ Phát hiện double-click nút "Nộp bài"
- ✅ Kiểm tra kết quả đã COMPLETED trong 30s gần nhất
- ✅ Trả về kết quả cũ thay vì báo lỗi

---

## 10. MODULE ÔN TẬP

**Đường dẫn**: `/practice`

### 10.1. Tính năng Tạo đề ôn tập
- ✅ Tương tự tạo đề chính thức
- ✅ Chọn chủ đề và số câu cho mỗi chủ đề
- ✅ Hệ thống random câu hỏi
- ✅ Chỉ người tạo mới thấy

### 10.2. Tính năng Làm bài ôn tập
- ✅ Không yêu cầu toàn màn hình
- ✅ Không có chống gian lận
- ✅ Không giới hạn số lần làm
- ✅ Có đồng hồ đếm ngược
- ✅ Tự động lưu tiến độ

### 10.3. Tính năng Xem kết quả ôn tập
- ✅ Xem điểm ngay sau khi nộp
- ✅ Xem chi tiết từng câu
- ✅ Hiển thị đáp án đúng
- ✅ Đánh dấu câu đúng/sai

### 10.4. Tính năng Quản lý đề ôn tập
- ✅ Xem danh sách đề đã tạo
- ✅ Sửa/Xóa đề ôn tập
- ✅ Tái tạo ma trận để làm lại với câu hỏi mới

---

## 11. HỆ THỐNG BẢO MẬT & CHỐNG GIAN LẬN

### 11.1. Xác thực & Phân quyền
- ✅ **JWT Token**: Lưu trong HTTP-only cookie
- ✅ **Middleware**: Kiểm tra token ở mọi API route
- ✅ **Role-based Access**: ADMIN vs CANDIDATE
- ✅ **Mã hóa mật khẩu**: bcrypt với salt rounds = 10

### 11.2. Chống gian lận khi thi
- ✅ **Toàn màn hình bắt buộc**: Không cho thoát
- ✅ **Phát hiện chuyển tab**: Đếm vi phạm
- ✅ **Khóa bài thi tự động**: Khi vi phạm quá số lần
- ✅ **Vô hiệu hóa copy/paste**: Ngăn sao chép đề
- ✅ **Vô hiệu hóa chuột phải**: Ngăn inspect element
- ✅ **Session Token**: Ngăn làm bài trên nhiều thiết bị cùng lúc

### 11.3. Bảo mật dữ liệu
- ✅ **Xáo trộn câu hỏi**: Mỗi thí sinh khác nhau
- ✅ **Xáo trộn đáp án**: Ngăn nhìn trộm
- ✅ **Không lộ đáp án đúng**: Khi đang thi
- ✅ **Lưu thứ tự vào DB**: Đảm bảo tính nhất quán

### 11.4. Tự động nộp bài
- ✅ **Hết giờ**: Tự động nộp khi countdown = 0
- ✅ **Quá giờ + buffer**: Server tự động nộp nếu client không nộp
- ✅ **Vi phạm quá nhiều**: Tự động nộp và khóa

### 11.5. Ngăn chặn đa phiên
- ✅ **Session Token**: Unique cho mỗi lần làm bài
- ✅ **Kiểm tra token**: Khi sync progress và submit
- ✅ **Thông báo xung đột**: Khi phát hiện đăng nhập nơi khác
- ✅ **Ổn định phiên**: Giữ token khi F5

---

## 12. TÍNH NĂNG KỸ THUẬT NỔI BẬT

### 12.1. Real-time Sync
- ✅ Auto-save đáp án mỗi khi chọn
- ✅ Sync lên server không chặn UI
- ✅ Khôi phục tiến độ khi reload

### 12.2. Optimistic UI
- ✅ Cập nhật UI ngay lập tức
- ✅ Rollback nếu API fail

### 12.3. Debounce & Throttle
- ✅ Debounce search input (500ms)
- ✅ Throttle scroll events

### 12.4. Pagination
- ✅ Server-side pagination
- ✅ Tùy chọn số dòng hiển thị
- ✅ Giữ trạng thái page khi filter

### 12.5. Error Handling
- ✅ Try-catch ở mọi API call
- ✅ Thông báo lỗi thân thiện
- ✅ Fallback UI khi lỗi

### 12.6. Performance
- ✅ Lazy loading components
- ✅ Memoization với React.memo
- ✅ Optimized re-renders

---

## 13. ROADMAP TÍNH NĂNG TƯƠNG LAI

### 13.1. Đã hoàn thành ✅
- [x] Quản lý nhân viên với import/export Excel
- [x] Quản lý câu hỏi với chủ đề phân cấp
- [x] Tạo đề thi với ma trận tự động
- [x] Giám sát thi real-time
- [x] Chống gian lận toàn diện
- [x] Xử lý xung đột phiên
- [x] Bộ lọc cho module Giám sát

### 13.2. Đang phát triển 🚧
- [ ] Thống kê nâng cao với biểu đồ
- [ ] Export kết quả chi tiết ra Excel
- [ ] Lọc kết quả theo Đạt/Không đạt

### 13.3. Kế hoạch 📋
- [ ] Ngân hàng câu hỏi có hình ảnh
- [ ] Báo cáo phân tích chi tiết
- [ ] Hệ thống thông báo real-time (WebSocket)
- [ ] Mobile responsive
- [ ] Dark mode
- [ ] Multi-language support

---

## 14. HƯỚNG DẪN SỬ DỤNG NHANH

### Cho Admin:
1. **Thêm nhân viên**: Admin → Import Excel hoặc Thêm thủ công
2. **Thêm câu hỏi**: Questions → Import Excel hoặc Thêm thủ công
3. **Tạo đề thi**: Exams → Tạo mới → Chọn ma trận hoặc chọn thủ công
4. **Tạo ca thi**: Sessions → Tạo mới → Chọn đề và thời gian
5. **Giám sát**: Monitor → Xem real-time → Mở khóa nếu cần
6. **Xem kết quả**: Results → Lọc theo ca thi → Xem chi tiết

### Cho Thí sinh:
1. **Đăng nhập**: Username + Password
2. **Chọn đề thi**: Exam → Chọn đề đang mở
3. **Làm bài**: Bắt đầu → Làm bài trong fullscreen → Nộp bài
4. **Xem kết quả**: Tự động chuyển sau khi nộp

---

## 15. LƯU Ý QUAN TRỌNG

### Về bảo mật:
- ⚠️ Không share sessionToken
- ⚠️ Không mở nhiều tab khi làm bài
- ⚠️ Không thoát fullscreen khi làm đề chính thức
- ⚠️ Đảm bảo kết nối mạng ổn định

### Về dữ liệu:
- 💾 Backup database định kỳ
- 💾 Kiểm tra dữ liệu trước khi import
- 💾 Xem trước đề thi trước khi mở
- 💾 Không xóa kết quả thi khi chưa backup

### Về hiệu suất:
- ⚡ Giới hạn số câu hỏi trong 1 đề (khuyến nghị < 200 câu)
- ⚡ Không mở quá nhiều ca thi cùng lúc
- ⚡ Sử dụng pagination khi xem danh sách lớn

---

**Phiên bản tài liệu**: 1.0  
**Ngày cập nhật**: 28/01/2026  
**Người tạo**: Hệ thống Antigravity AI
