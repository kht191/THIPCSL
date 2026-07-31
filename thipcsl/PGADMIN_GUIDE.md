# 🐘 Hướng dẫn xem dữ liệu PostgreSQL qua pgAdmin

## 📥 Bước 1: Cài đặt pgAdmin (nếu chưa có)

### Tải xuống pgAdmin:
- Truy cập: https://www.pgadmin.org/download/pgadmin-4-windows/
- Tải phiên bản mới nhất cho Windows
- Chạy file cài đặt và làm theo hướng dẫn

## 🔌 Bước 2: Kết nối đến PostgreSQL Server

### 2.1. Mở pgAdmin
- Tìm và mở ứng dụng **pgAdmin 4** từ Start Menu
- Chờ pgAdmin khởi động (sẽ mở trong trình duyệt)

### 2.2. Tạo kết nối Server mới

1. **Click chuột phải** vào **"Servers"** ở thanh bên trái
2. Chọn **"Register" → "Server..."**

### 2.3. Nhập thông tin kết nối

#### Tab "General":
```
Name: Exam System
```

#### Tab "Connection":
```
Host name/address: localhost
Port: 5432
Maintenance database: exam_system
Username: exam_admin
Password: exam_admin_2026
```

#### Tùy chọn bổ sung:
- ✅ Tích vào **"Save password?"** để không phải nhập lại mỗi lần

3. **Click "Save"** để lưu kết nối

## 📊 Bước 3: Xem dữ liệu trong Database

### 3.1. Mở rộng cây thư mục
Sau khi kết nối thành công, bạn sẽ thấy:

```
Servers
└── Exam System
    └── Databases
        └── exam_system
            └── Schemas
                └── public
                    └── Tables
```

### 3.2. Xem danh sách bảng

Click vào **"Tables"** để xem tất cả các bảng:
- **User** - Người dùng (885 records)
- **Question** - Câu hỏi (12,815 records)
- **Topic** - Chủ đề (168 records)
- **Exam** - Đề thi (270 records)
- **Result** - Kết quả thi (490 records)
- **ExamSession** - Ca thi (1 record)

### 3.3. Xem dữ liệu trong bảng

**Cách 1: Xem nhanh**
1. Click chuột phải vào tên bảng (ví dụ: **User**)
2. Chọn **"View/Edit Data" → "All Rows"**
3. Dữ liệu sẽ hiển thị ở panel bên phải

**Cách 2: Sử dụng SQL Query**
1. Click chuột phải vào **exam_system**
2. Chọn **"Query Tool"**
3. Nhập câu lệnh SQL, ví dụ:

```sql
-- Xem tất cả người dùng
SELECT * FROM "User" LIMIT 100;

-- Xem người dùng theo vai trò
SELECT username, full_name, department, role 
FROM "User" 
WHERE role = 'ADMIN';

-- Đếm số lượng câu hỏi theo chủ đề
SELECT t.name, COUNT(q.id) as total_questions
FROM "Topic" t
LEFT JOIN "Question" q ON q."topicId" = t.id
GROUP BY t.id, t.name
ORDER BY total_questions DESC;

-- Xem kết quả thi gần đây
SELECT u.full_name, e.title, r.score, r.is_passed, r.submitted_at
FROM "Result" r
JOIN "User" u ON r.user_id = u.id
JOIN "Exam" e ON r.exam_id = e.id
ORDER BY r.submitted_at DESC
LIMIT 20;
```

4. Click nút **"Execute/Refresh"** (▶️) hoặc nhấn **F5**

## 🔍 Bước 4: Các chức năng hữu ích

### 4.1. Tìm kiếm dữ liệu
1. Mở bảng cần tìm
2. Click vào icon **"Filter"** (🔍)
3. Nhập điều kiện lọc

### 4.2. Sắp xếp dữ liệu
- Click vào **tên cột** để sắp xếp tăng/giảm dần

### 4.3. Xuất dữ liệu
1. Sau khi query dữ liệu
2. Click **"Download as CSV"** (F8) để xuất file Excel

### 4.4. Xem cấu trúc bảng
1. Click chuột phải vào tên bảng
2. Chọn **"Properties"**
3. Xem các tab:
   - **Columns**: Các cột và kiểu dữ liệu
   - **Constraints**: Ràng buộc (Primary Key, Foreign Key)
   - **Indexes**: Các chỉ mục

### 4.5. Xem mối quan hệ giữa các bảng
1. Click chuột phải vào database **exam_system**
2. Chọn **"ERD For Database"**
3. Sẽ hiển thị sơ đồ quan hệ giữa các bảng

## 📝 Bước 5: Các câu lệnh SQL hữu ích

### Thống kê tổng quan:
```sql
-- Thống kê tổng quan hệ thống
SELECT 
    (SELECT COUNT(*) FROM "User") as total_users,
    (SELECT COUNT(*) FROM "Question") as total_questions,
    (SELECT COUNT(*) FROM "Topic") as total_topics,
    (SELECT COUNT(*) FROM "Exam") as total_exams,
    (SELECT COUNT(*) FROM "Result") as total_results;
```

### Xem người dùng theo phòng ban:
```sql
SELECT department, COUNT(*) as total
FROM "User"
GROUP BY department
ORDER BY total DESC;
```

### Xem đề thi và số lượng thí sinh đã thi:
```sql
SELECT 
    e.title,
    e.status,
    COUNT(r.id) as total_attempts,
    COUNT(CASE WHEN r.is_passed THEN 1 END) as passed_count
FROM "Exam" e
LEFT JOIN "Result" r ON r.exam_id = e.id
GROUP BY e.id, e.title, e.status
ORDER BY total_attempts DESC;
```

### Xem top thí sinh có điểm cao:
```sql
SELECT 
    u.full_name,
    u.department,
    AVG(r.score) as avg_score,
    COUNT(r.id) as total_exams
FROM "User" u
JOIN "Result" r ON r.user_id = u.id
WHERE u.role = 'CANDIDATE'
GROUP BY u.id, u.full_name, u.department
HAVING COUNT(r.id) > 0
ORDER BY avg_score DESC
LIMIT 10;
```

## ⚠️ Lưu ý quan trọng

### 1. Tên bảng và cột
- PostgreSQL **phân biệt chữ hoa/thường**
- Luôn sử dụng **dấu ngoặc kép** cho tên bảng: `"User"`, `"Question"`
- Không dùng dấu ngoặc kép sẽ bị lỗi!

### 2. Backup trước khi sửa
- **KHÔNG** sửa/xóa dữ liệu trực tiếp qua pgAdmin nếu không chắc chắn
- Luôn backup trước khi thực hiện thay đổi lớn

### 3. Quyền truy cập
- User `exam_admin` có đầy đủ quyền trên database `exam_system`
- Cẩn thận khi thực hiện các lệnh DELETE, UPDATE, DROP

## 🎯 Thông tin kết nối nhanh

```
Server: localhost:5432
Database: exam_system
Username: exam_admin
Password: exam_admin_2026
```

## 🆘 Xử lý lỗi thường gặp

### Lỗi: "Could not connect to server"
- ✅ Kiểm tra PostgreSQL service đang chạy
- ✅ Chạy lệnh: `.\setup-postgres.bat Admin@123`

### Lỗi: "password authentication failed"
- ✅ Kiểm tra lại username và password
- ✅ Đảm bảo đang dùng: `exam_admin` / `exam_admin_2026`

### Lỗi: "database does not exist"
- ✅ Chạy lại script setup: `.\setup-postgres.bat Admin@123`
- ✅ Kiểm tra tên database: `exam_system`

## 📚 Tài liệu tham khảo

- pgAdmin Documentation: https://www.pgadmin.org/docs/
- PostgreSQL Tutorial: https://www.postgresql.org/docs/current/tutorial.html
- SQL Cheat Sheet: https://www.postgresqltutorial.com/postgresql-cheat-sheet/

---

**Chúc bạn sử dụng pgAdmin hiệu quả! 🎉**
