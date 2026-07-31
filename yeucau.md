# TECHNICAL SPECIFICATION: INTERNAL ENTERPRISE QUIZ SYSTEM
**Project Name:** Minimalist Corporate Quiz App
**Date:** 2026-01-06
**Version:** 1.0
**Status:** Approved for Development

---

## 1. PROJECT OVERVIEW
Xây dựng hệ thống kiểm tra trắc nghiệm tối giản dành cho doanh nghiệp.
* **Mục tiêu:** Đánh giá năng lực nhân viên, thi tuyển dụng, thi an toàn lao động.
* **Nguyên tắc cốt lõi:** * **Closed System:** Không có đăng ký tự do. Chỉ Admin mới có quyền tạo User.
    * **Security:** Phân quyền chặt chẽ (Admin/Candidate). Bảo mật đề thi.
    * **Minimalism:** Giao diện tối giản, tập trung vào nội dung thi, hỗ trợ Mobile.
    * **Methodology:** Phát triển cuốn chiếu (Iterative Development) - Xong module nào Test & Chốt module đó.

---

## 2. TECHNOLOGY STACK (Yêu cầu bắt buộc)
Để đảm bảo tốc độ phát triển, hiệu năng và khả năng bảo trì:

* **Frontend:** React.js (Next.js Framework) + Tailwind CSS.
* **Backend:** Node.js (Next.js API Routes hoặc Express.js).
* **Database:** PostgreSQL (Ưu tiên) hoặc SQLite (Nếu quy mô < 500 users).
* **Authentication:** JWT (JSON Web Token). *Không dùng Cookie session phức tạp.*
* **Deployment:** Docker / Docker Compose.

---

## 3. DATABASE SCHEMA (Cấu trúc dữ liệu)
Yêu cầu tối thiểu 4 bảng chính với các trường quan trọng sau:

### 3.1. Table `Users`
| Field | Type | Note |
| :--- | :--- | :--- |
| `id` | UUID/Int | PK |
| `username` | String | Mã nhân viên (Unique) |
| `password_hash`| String | |
| `full_name` | String | |
| `department` | String | Dùng để lọc user theo phòng ban |
| `role` | Enum | `['ADMIN', 'CANDIDATE']` |

### 3.2. Table `Questions`
| Field | Type | Note |
| :--- | :--- | :--- |
| `id` | UUID/Int | PK |
| `content` | Text | Nội dung câu hỏi |
| `options` | JSON | `{"A": "...", "B": "...", "C": "...", "D": "..."}` |
| `correct_answer`| String | Key đáp án đúng (VD: "A") |
| `category` | String | **QUAN TRỌNG:** Phân loại (VD: "An toàn", "Kỹ thuật", "IQ") |

### 3.3. Table `Exams`
| Field | Type | Note |
| :--- | :--- | :--- |
| `id` | UUID/Int | PK |
| `title` | String | Tên đợt thi |
| `duration` | Int | Thời gian làm bài (phút) |
| `question_ids` | JSON/Relation| Danh sách ID các câu hỏi trong đề |
| `allowed_users` | JSON/Relation| Danh sách ID nhân viên được phép thi (Whithlist) |
| `status` | Enum | `['OPEN', 'CLOSED']` |

### 3.4. Table `Results`
| Field | Type | Note |
| :--- | :--- | :--- |
| `id` | UUID/Int | PK |
| `user_id` | FK | |
| `exam_id` | FK | |
| `score` | Float | Điểm số |
| `details` | JSON | Lưu lại đáp án user đã chọn (để review nếu cần) |
| `submitted_at` | Datetime | |

---

## 4. DEVELOPMENT ROADMAP & ACCEPTANCE CRITERIA
Dự án chia làm 5 Module. Dev hoàn thiện và hướng dẫn Tester kiểm thử xong Module này mới chuyển sang Module tiếp theo.

### MODULE 1: AUTHENTICATION & USER MANAGEMENT (3-4 Days)
**Chức năng:**
1.  **Login:** Chỉ đăng nhập (Username/Pass). Ẩn hoàn toàn nút Đăng ký.
2.  **Admin Dashboard (Users):**
    * Danh sách nhân viên.
    * Tạo nhân viên mới.
    * **Import Excel:** Upload file danh sách nhân viên (`Username`, `Pass`, `Name`, `Dept`).

> **✅ TEST CASES (Nghiệm thu):**
> * [ ] Truy cập URL `/admin` khi chưa login -> Redirect về Login.
> * [ ] Đăng nhập bằng tài khoản Candidate -> Truy cập `/admin` -> Báo lỗi 403 Forbidden.
> * [ ] Import file Excel 50 users -> Database nhận đủ 50 dòng.

---

### MODULE 2: QUESTION BANK & CATEGORIZATION (4-5 Days)
**Chức năng:**
1.  **Quản lý câu hỏi:** CRUD (Thêm/Sửa/Xóa).
2.  **Import Excel:** Upload câu hỏi kèm cột **Category** (Chủ đề).
    * *Mẫu Excel:* `Content` | `A` | `B` | `C` | `D` | `Correct Answer` | `Category`
3.  **Filter:** Admin lọc câu hỏi theo Category (VD: Chỉ hiện câu "An toàn lao động").

> **✅ TEST CASES (Nghiệm thu):**
> * [ ] Import file Excel có nhiều Category -> DB lưu đúng trường `category`.
> * [ ] Filter "An toàn" -> Chỉ hiện các câu hỏi thuộc nhóm An toàn.

---

### MODULE 3: EXAM CONFIGURATION (3-4 Days)
**Chức năng:**
1.  **Tạo Đề thi:** Đặt tên, thời gian, trạng thái.
2.  **Trộn đề:** Admin chọn câu hỏi từ nhiều Category (VD: Chọn 10 câu An toàn + 5 câu Kỹ thuật).
3.  **Phân quyền thi:** Chọn danh sách User được phép thi (Checklist/Select All by Dept).

> **✅ TEST CASES (Nghiệm thu):**
> * [ ] User A được gán đề thi X -> Login thấy đề X.
> * [ ] User B KHÔNG được gán -> Login thấy danh sách trống.
> * [ ] Kiểm tra nội dung đề: Đảm bảo có đủ số lượng câu hỏi của các Category đã chọn.

---

### MODULE 4: EXAM RUNNER INTERFACE (5-7 Days)
**Chức năng:**
1.  **Giao diện thi:** Hiển thị câu hỏi + Đồng hồ đếm ngược (Sticky Timer).
2.  **Logic:** * **Auto-Save:** Lưu đáp án tạm vào LocalStorage (chống mất dữ liệu khi F5).
    * **Auto-Submit:** Hết giờ tự động nộp bài.
    * **Security:** Chặn chuột phải, chặn copy (CSS/JS cơ bản).

> **✅ TEST CASES (Nghiệm thu):**
> * [ ] Chờ hết giờ -> Hệ thống tự chuyển trang kết quả.
> * [ ] Đang làm bài bấm F5 (Refresh) -> Giữ nguyên đáp án đã chọn & Đồng hồ chạy tiếp đúng thời gian thực.
> * [ ] **Security Audit:** Inspect Element (F12) -> API trả về **KHÔNG** được chứa trường `correct_answer`.

---

### MODULE 5: SCORING & REPORTING (2-3 Days)
**Chức năng:**
1.  **Server-side Scoring:** Tính điểm tại Backend để đảm bảo chính xác.
2.  **Result Page:** User xem điểm ngay sau khi nộp (Số câu đúng/Tổng số).
3.  **Admin Report:** Xem danh sách kết quả của từng đợt thi.

> **✅ TEST CASES (Nghiệm thu):**
> * [ ] Làm đúng 5/10 câu -> Kết quả báo chính xác 50% (hoặc 5 điểm).
> * [ ] Admin vào xem kết quả -> Dữ liệu cập nhật Real-time.

---

## 5. NON-FUNCTIONAL REQUIREMENTS
1.  **Security:** * Passwords phải được Hash (bcrypt/argon2).
    * API Endpoint `/api/questions` không lộ đáp án.
2.  **Performance:** Chịu tải tối thiểu 50-100 concurrent users (người thi cùng lúc).
3.  **UI/UX:** Responsive (Tương thích tốt trên Mobile Web).

---

## 6. DELIVERABLES (Bàn giao)
1.  Full Source Code (Git Repository).
2.  File `README.md` hướng dẫn Setup & Deploy.
3.  File Excel Template (Mẫu Import User & Question).
4.  Tài khoản `admin / admin` mặc định.