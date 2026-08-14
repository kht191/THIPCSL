# 🛡️ BẢO MẬT — CHECKLIST TRƯỚC KHI ĐƯA VÀO VẬN HÀNH

> **Áp dụng cho:** Hệ thống THIPCSL (Next.js 16 + PostgreSQL + Prisma)
> **Mức độ:** Hệ thống đang vận hành thực tế tại Công ty Điện lực Sơn La — dữ liệu thi cử + người dùng nhạy cảm
> **Nguyên tắc:** File này là checklist **phải duyệt** trước khi bất kỳ đợt release nào được đưa lên hệ thống production.

---

## 🔴 PHẦN A — Các lỗi CRITICAL phải ưu tiên khắc phục TRƯỚC TIÊN

> Những mục này là lỗ hổng nghiêm trọng hoặc đang nằm trong nợ kỹ thuật, liên quan trực tiếp đến quyền admin và dữ liệu. **Chưa xử lý xong không đưa vào vận hành.**

| # | Mục | Mô tả nguy cơ | Trạng thái | Mức ưu tiên |
|:--|:--|:--|:--|:--|
| A1 | **Chống tự khóa admin cuối cùng** | Admin có thể tự hủy quyền / khóa tài khoản của chính mình → hệ thống có thể rơi vào trạng thái **không còn admin nào** (lock-out toàn bộ). | ⬜ Chưa xử lý | P0 |
| A2 | **Wrap trang admin bằng `RoleGuard`** | Hiện gõ URL trực tiếp vẫn render trang admin (dù API chặn data). Lộ layout, cấu trúc, thông tin nhạy cảm dù user không có quyền. | ⬜ Chưa xử lý | P0 |
| A3 | **Middleware role-check cho `/api/admin/*`** | `/api/admin/*` cho phép đi qua middleware (chỉ cần token hợp lệ). API route mới dễ quên thêm `requirePermission()` → lỗ hổng leo quyền. | ⬜ Chưa xử lý | P0 |
| A4 | **Rate Limiting** | Không có giới hạn tần suất request → nguy cơ **brute-force mật khẩu** `/api/auth/login`. | ⬜ Chưa xử lý | P1 |
| A5 | **Audit Log** | Không ghi log ai cấp/thu hồi quyền, sửa/xóa user, mở khóa bài thi → không truy vết được hành vi admin. | ⬜ Chưa xử lý | P1 |
| A6 | **Kiểm tra `is_active`** | `is_active` không được kiểm tra trong middleware và hầu hết API routes → user đã bị khóa vẫn có thể thao tác. | ⬜ Chưa xử lý | P1 |

---

## 🟠 PHẦN B — Cấu hình & Vận hành

> Checklist hạ tầng. Hoàn thành trước khi mở cổng ra internet.

| # | Mục | Chi tiết / Lệnh kiểm tra | Trạng thái |
|:--|:--|:--|:--|
| B1 | **JWT_SECRET mạnh & riêng biệt** | Không dùng mật khẩu mặc định. Tạo bằng: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | ⬜ |
| B2 | **Mật khẩu DB PostgreSQL mạnh** | Đổi mật khẩu `exam_admin` mặc định. KHÔNG dùng `postgres` làm user app. | ⬜ |
| B3 | **Không hardcode secret trong code** | Secret phải nằm trong `.env`, `.env` phải nằm trong `.gitignore`. Kiểm tra: `git ls-files | grep -E "\.env"` — KHÔNG được có `.env` trong repo. | ⬜ |
| B4 | **HTTPS bắt buộc** | Bật TLS (Let's Encrypt / Nginx). Chặn HTTP plaintext hoặc redirect 301 sang HTTPS. | ⬜ |
| B5 | **Tường lửa** | Chỉ mở cổng 80/443 và SSH (22). **PostgreSQL (5432) chỉ truy cập nội bộ** (bind 127.0.0.1), không expose ra ngoài. | ⬜ |
| B6 | **Backup tự động hoạt động** | Chạy `backup-database-deploy.sh` qua cron daily. **Test khôi phục (restore) thật** trên máy khác. | ⬜ |
| B7 | **Phân quyền ISOLATED cho app user** | App chạy bằng user riêng (không phải root). Thư mục `/opt/thipcsl` chỉ user app ghi. | ⬜ |
| B8 | **Maintenance mode sẵn sàng** | Test `MAINTENANCE_MODE=true` bật/tắt hoạt động đúng. | ⬜ |
| B9 | **Giới hạn upload file** | Cấu hình `client_max_body_size` hợp lý (tránh DoS qua upload). | ⬜ |
| B10 | **Cập nhật bản vá** | Node, PostgreSQL, Next.js, npm dependencies luôn ở bản có hỗ trợ bảo mật. Chạy `npm audit` định kỳ. | ⬜ |

---

## 🟡 PHẦN C — Mã nguồn (Code-level)

> Dựa trên kiến trúc hiện tại của dự án (Auth JWT, Permission system, API routes).

| # | Mục | Cách kiểm tra | Trạng thái |
|:--|:--|:--|:--|
| C1 | **Tất cả API admin gọi `requirePermission()`** | Grep kiểm tra 34 API routes trong `app/api/admin/*`. Không route nào thiếu `requirePermission(key)`. | ✅ Đã verify |
| C2 | **`/api/exam-runner` không leak đáp án** | Đảm bảo response của API lấy đề KHÔNG bao giờ chứa `correct_answer` / `correctAnswer`. | ✅ Đảm bảo |
| C3 | **Password luôn hash** | Mọi nơi lưu password dùng `bcryptjs` (salt rounds = 10). Không bao giờ lưu plaintext. | ✅ Đảm bảo |
| C4 | **Không lộ thông tin trong response** | Kiểm tra response không trả thừa `password_hash`, `session_token`, `JWT_SECRET`. | ⬜ Kiểm tra lại |
| C5 | **Quyền `users.permissions` tách riêng** | Chỉ admin có `users.permissions` mới sửa được phân quyền người khác (không trộn với `users.edit`). | ✅ Đã sửa |
| C6 | **Phân biệt `permissionMode` ROLE/CUSTOM** | CUSTOM rỗng ≠ ROLE. Đảm bảo CUSTOM rỗng không fallback về role defaults. | ✅ Đã sửa |
| C7 | **Không nhúng script độc hại (XSS)** | UI render nội dung câu hỏi — kiểm tra khâu escape/sanitize khi render `dangerouslySetInnerHTML` (nếu có). | ⬜ Kiểm tra lại |
| C8 | **Bảo vệ chống SQL Injection** | Toàn bộ query qua Prisma (parameterized) — không concat chuỗi SQL tay. | ✅ Đảm bảo |
| C9 | **JWT hết hạn & validate** | Token hết hạn 1 ngày. Verify chữ ký + expiry ở cả middleware lẫn API route. | ✅ Đảm bảo |
| C10 | **Dọn script debug / file nhạy cảm** | ~65 script `*.ts` debug ở thư mục gốc + các file log. Đảm bảo không chứa credential đẩy lên production. | ⬜ Cần dọn |

---

## 🟢 PHẦN D — Kiểm thử trước khi release

| # | Hạng mục | Thao tác kiểm tra | Kết quả mong đợi | Trạng thái |
|:--|:--|:--|:--|:--|
| D1 | **Login sai mật khẩu nhiều lần** | Brute-force thử phát | Bị chặn (sau khi có Rate Limit A4) | ⬜ |
| D2 | **User bị khóa `is_active=false`** | Đăng nhập bằng user đã khóa | Bị từ chối truy cập | ⬜ |
| D3 | **PROCTOR/CANDIDATE truy cập `/admin/users`** | Vào thẳng URL | Bị chặn (role + permission) | ⬜ |
| D4 | **User không quyền gọi API admin trực tiếp** | Dùng Postman gọi `/api/admin/users` với token CANDIDATE | Nhận 403 | ✅ Dự kiến pass |
| D5 | **Tự khóa admin cuối cùng** | Admin tự thu hồi quyền `users.permissions` của mình | Bị chặn (sau khi có A1) | ⬜ |
| D6 | **Fullstack test thi** | Một CANDIDATE làm bài hoàn chỉnh 3 loại đề (OFFICIAL / PRACTICE / TWO_PART) | Điểm + pass đúng | ⬜ |
| D7 | **Anti-cheat** | Switch tab, thoát fullscreen, mở tab thứ 2 | Phát hiện vi phạm + khóa đúng luật | ⬜ |
| D8 | **Import/Export Excel** | Import câu hỏi + user, export thống kê | Thành công, không lỗi | ✅ |
| D9 | **Session takeover** | Đăng nhập cùng user ở 2 thiết bị làm cùng 1 bài | Cảnh báo session conflict | ✅ |

---

## 📝 PHẦN E — Hướng dẫn đưa release lên môi trường thực tế

> Quy trình deploy an toàn áp dụng **MỌI LẦN** thay đổi lên production.

```bash
# 1. BACKUP TRƯỚC KHI LÀM GÌ
cd /opt/thipcsl/thipcsl && ./backup-database-deploy.sh

# 2. Pull code mới + cài phụ thuộc
sudo -u thipcsl git pull
npm install

# 3. Cập nhật schema (nếu có) VÀ seed
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts

# 4. Build (BẮT BUỘC pass, lỗi TS = dừng)
npm run build

# 5. Restart service
sudo systemctl restart thipcsl

# 6. KIỂM TRA SMOKE ngay lập tức
curl -I http://localhost:3000          # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
```

> 🔴 **Luật vàng:** Nếu `npm run build` có lỗi → **Tuyệt đối KHÔNG deploy**. Khôi phục lại bản cũ hoặc fix trước.

---

## ✅ PHẦN F — Chữ ký nghiệm thu (Sign-off)

Trước khi một phiên bản được xem là "sẵn sàng vận hành", tất cả các bên liên quan phải xác nhận:

| Vai trò | Nội dung xác nhận | Họ tên | Ngày | Ký |
|:--|:--|:--|:--|:--|
| Quản trị hệ thống (Admin) | Các mục Phần A đã xử lý hoặc có kế hoạch thời gian cụ thể | | | |
| Vận hành (Ops) | Phần B: HTTPS, firewall, backup khôi phục OK | | | |
| Nhà phát triển (Dev) | Phần C & D: code audit + kiểm thử pass | | | |

---

*File này được tạo để theo dõi tình trạng bảo mật của hệ thống THIPCSL. Cập nhật trạng thái (⬜→✅) khi từng mục được xử lý.*