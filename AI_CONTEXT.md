# THÔNG TIN DỰ ÁN & BỘ NHỚ AI — THIPCSL

> **Tạo lần đầu:** 2026-07-31
> **Cập nhật gần nhất:** 2026-08-14 — Triển khai thử thành công trên Linux (Ubuntu): build 0 lỗi, admin đăng nhập OK
> **Trạng thái:** ✅ Hoàn thiện 6/6 modules. Đang vận hành thực tế.
> **Mục đích:** File này là bộ nhớ cho các Agent AI (Claude, GPT) hiểu ngay lập tức ngữ cảnh dự án.
> **Quy ước:** Mỗi khi hoàn thành một task, cập nhật trạng thái mới nhất vào file này.

---

## 1. Bức tranh tổng quan (Tech Stack & Kiến trúc)

### Công nghệ chính
| Lớp | Công nghệ | Ghi chú |
|:---|:---|:---|
| **Frontend** | Next.js 16.1.1 (App Router) + React 19.2.3 + Tailwind CSS 4 | Dùng `'use client'` cho các trang có tương tác; Server Components ở layout/admin |
| **Backend** | Next.js API Routes (không tách Express) | Toàn bộ API nằm trong `app/api/*` |
| **Database** | PostgreSQL (qua Prisma ORM 5.22) | Đã migrate từ SQLite lên PostgreSQL. Connection string trong `.env` |
| **Authentication** | JWT (jsonwebtoken + jose) | Token lưu trong HTTP-only cookie `token`, hết hạn 1 ngày |
| **Password Hash** | bcryptjs | Salt rounds = 10 |
| **Biểu đồ** | Recharts 3.7 | Dùng trong trang Thống kê admin |
| **Import/Export** | xlsx 0.18 | Dùng cho import/export Excel câu hỏi và người dùng |
| **UUID** | uuid 13 | Sinh session token |
| **TypeScript** | 5.x, strict mode | `tsconfig.json` với strict: true |

### Cấu trúc thư mục
```
thipcsl/
├── app/                          # Next.js App Router (Pages + API Routes)
│   ├── admin/                    # Trang quản trị (phân quyền: ADMIN, PROCTOR)
│   │   ├── layout.tsx            # Layout chung: Sidebar, user info, navigation
│   │   ├── page.tsx              # Quản lý Người dùng (mặc định)
│   │   ├── exams/                # Quản lý Đề thi (create, edit, two-part)
│   │   ├── questions/            # Ngân hàng câu hỏi (CRUD, import Excel)
│   │   ├── topics/               # Quản lý Chủ đề (cây phân cấp, import/export)
│   │   ├── users/                # CRUD người dùng
│   │   ├── sessions/             # Quản lý Ca thi
│   │   ├── monitor/              # Giám sát thi real-time (ADMIN & PROCTOR)
│   │   ├── results/              # Kết quả thi + In phiếu điểm
│   │   └── statistics/           # Thống kê + biểu đồ
│   ├── exam/                     # Giao diện làm bài của Thí sinh
│   │   ├── page.tsx              # Dashboard danh sách ca thi + kết quả
│   │   ├── [id]/page.tsx         # Exam Runner (fullscreen, anti-cheat, timer)
│   │   └── results/[id]/page.tsx # Trang kết quả sau khi thi
│   ├── practice/                 # Giao diện Ôn tập (PRACTICE mode)
│   ├── login/page.tsx            # Trang đăng nhập (Client Component)
│   ├── maintenance/page.tsx      # Trang bảo trì
│   ├── page.tsx                  # Landing page
│   └── api/                      # TOÀN BỘ REST API
│       ├── auth/login/route.ts   # POST - Đăng nhập
│       ├── auth/me/route.ts      # GET  - Lấy thông tin user hiện tại
│       ├── admin/users/          # CRUD + import/export/batch users
│       ├── admin/questions/      # CRUD + import questions
│       ├── admin/exams/          # CRUD exams (OFFICIAL, TWO_PART, PRACTICE)
│       ├── admin/topics/         # CRUD + import/export/reorder topics
│       ├── admin/sessions/       # CRUD exam sessions
│       ├── admin/results/        # View + unlock + print results
│       ├── admin/monitor/        # Real-time monitoring data
│       ├── admin/statistics/     # Aggregated stats for dashboard
│       ├── admin/stats/          # Topic-specific stats
│       ├── admin/samples/        # Download sample Excel templates
│       ├── exam-runner/          # Làm bài: GET exam, POST submit, progress sync
│       ├── practice/             # Ôn tập: create, fork, reset, pin
│       └── results/              # Xem kết quả cá nhân
├── components/
│   ├── RoleGuard.tsx             # Client component bảo vệ route theo role
│   ├── Pagination.tsx            # Component phân trang dùng chung
│   └── MobileSidebar.tsx         # Sidebar responsive cho mobile
├── lib/
│   ├── auth.ts                   # JWT sign/verify + bcrypt hash/compare
│   ├── prisma.ts                 # PrismaClient singleton
│   ├── permissions.ts            # Hệ thống phân quyền (14 quyền, role defaults, hasPermission, requirePermission)
│   ├── exam-helper.ts            # autoSubmitExam (hết giờ tự nộp)
│   ├── exam-types.ts             # Định nghĩa TWO_PART exam type + scoring
│   └── question-options.ts       # Chuẩn hóa đáp án A,B,C,D,... và parse đáp án đúng
├── prisma/
│   ├── schema.prisma             # PostgreSQL schema (8 models: User, Question, Topic, Exam, ExamSession, Result, Permission, UserPermission)
│   ├── seed.ts                   # Seed data: tạo tài khoản admin mặc định
│   └── migrations/               # Migration history
├── scripts/                      # Các script tiện ích (backup, restore, migrate)
├── public/                       # Static assets (svg icons)
├── backups/                      # Database backup files
├── De thi/                       # Đề thi mẫu (Excel)
├── .env                          # Biến môi trường (DATABASE_URL, JWT_SECRET)
├── middleware.ts                  # Next.js middleware (auth guard, maintenance mode)
├── next.config.ts                # Next.js config
├── package.json                  # Dependencies & scripts
└── tsconfig.json                 # TypeScript config (strict, paths: @/* → ./*)
```

### Database Schema (PostgreSQL — Prisma)
```
User ──< Result >── Exam ──< ExamSession
         │
   Question ──< Topic (cây phân cấp: parentId tự tham chiếu)
```

- **User**: id, username (unique), password_hash, full_name, department, role (ADMIN/PROCTOR/CANDIDATE), is_active, permissionMode (ROLE/CUSTOM — mặc định ROLE), field, timestamps
- **Question**: id, content (Text), options (JSON Text), correct_answer, category, topicId (FK → Topic, optional)
- **Topic**: id, name, parentId (self-ref FK, cascade delete), isActive, order, timestamps
- **Exam**: id, title, duration (phút), max_attempts, max_violations, question_ids (Text JSON array), allowed_users (Text JSON array), status, pass_score, type (OFFICIAL/PRACTICE/TWO_PART), creatorId, settings (Text JSON), practiceSourceId (self-ref FK)
- **ExamSession**: id, name, startTime, endTime, status
- **Result**: id, user_id (FK), exam_id (FK), session_id (FK optional), score, is_passed, is_printed, status (IN_PROGRESS/COMPLETED), details (Text JSON: {answers, questionOrder, optionsOrder, twoPartScore}), started_at, submitted_at, session_token (UUID), is_locked
- **Permission**: id, key (UNIQUE, VD: "users.view"), name, group_name, description — **15 quyền** trong 5 nhóm (14 chức năng + 1 quyền đặc biệt `users.permissions` để quản lý phân quyền)
- **UserPermission**: user_id (FK→User) + permission_id (FK→Permission) — composite PK. Nếu `user.permissionMode === 'CUSTOM'` → dùng danh sách này (có thể rỗng = không có quyền). Nếu `'ROLE'` → fallback về role defaults.

### Quy chuẩn Code
- **TypeScript strict mode**: bắt buộc
- **React Components**: Ưu tiên Functional Components + Hooks
- **Client/Server**: Dùng `'use client'` chỉ khi cần state/effects. Admin layout là Server Component
- **Tên biến/hàm**: camelCase. Tên file: kebab-case hoặc theo Next.js convention (`page.tsx`, `layout.tsx`, `route.ts`)
- **API Routes**: Theo Next.js App Router convention, export async function GET/POST/PUT/PATCH/DELETE
- **Auth check**: Middleware kiểm tra JWT cookie ở tầng Edge; RoleGuard component kiểm tra role ở tầng Client
- **Security**: API `/api/exam-runner` không bao giờ trả về `correct_answer`. Password luôn hash bằng bcrypt

---

## 2. Trạng thái hiện tại

### Đã hoàn thành ✅

#### Module 1: Authentication & User Management
- [x] Đăng nhập JWT (HTTP-only cookie, case-insensitive username)
- [x] Phân quyền 3 role: ADMIN, PROCTOR, CANDIDATE
- [x] CRUD Người dùng (tạo, sửa, xóa đơn lẻ & hàng loạt)
- [x] Import/Export Excel (tạo mới + cập nhật user hiện có)
- [x] Tìm kiếm & Lọc (theo username, tên, đơn vị, lĩnh vực)
- [x] Phân trang 10/25/50/100/Tất cả
- [x] Bulk actions: mở khóa, khóa, chuyển phòng ban, cập nhật lĩnh vực, xóa
- [x] Seed tài khoản admin mặc định (credentials được cấu hình trong quá trình deploy)

#### Module 2: Question Bank & Categorization
- [x] CRUD Câu hỏi (có hỗ trợ đáp án đúng là mảng cho câu hỏi nhiều đáp án)
- [x] Import/Export Excel câu hỏi
- [x] Lọc theo Category (text) và Topic (FK đến bảng Topic)
- [x] Hỗ trợ đáp án dạng key-value (A, B, C, D, ...) mở rộng vô hạn
- [x] Câu hỏi có thể gán vào Chủ đề (Topic) để quản lý ma trận đề

#### Module 3: Exam Configuration
- [x] Tạo/Sửa/Xóa đề thi
- [x] 3 loại đề: OFFICIAL (thi chính thức), PRACTICE (ôn tập), TWO_PART (2 phần riêng)
- [x] Cấu hình ma trận câu hỏi (số câu theo Chủ đề/Topic)
- [x] Gán danh sách User được phép thi
- [x] Đề 2 phần: cấu hình tỉ lệ đạt riêng cho từng phần (part1PassPercent, part2PassPercent)
- [x] Publish đề PRACTICE để fork cho user khác
- [x] Import users vào đề thi từ Excel

#### Module 4: Exam Runner Interface
- [x] Giao diện làm bài: câu hỏi + đáp án (radio/checkbox cho multi-answer)
- [x] Đồng hồ đếm ngược đồng bộ với server time
- [x] Auto-save đáp án vào LocalStorage + sync lên server mỗi khi thay đổi
- [x] Auto-submit khi hết giờ (client + server fallback)
- [x] Chống gian lận: Fullscreen required, block chuột phải/copy/paste, phát hiện chuyển tab, giới hạn vi phạm
- [x] Khóa bài thi khi vượt quá số lần vi phạm
- [x] Giám thị có thể Mở khóa từ trang Monitor
- [x] Hỗ trợ Mobile (bỏ fullscreen requirement trên touch devices)
- [x] Session token chống thi nhiều tab/thiết bị cùng lúc
- [x] Progress sync: lưu đáp án + thứ tự câu hỏi + thứ tự đáp án đã xáo trộn

#### Module 5: Scoring & Reporting
- [x] Server-side scoring (tính điểm chính xác tuyệt đối)
- [x] Hỗ trợ chấm điểm câu hỏi nhiều đáp án (so sánh Set)
- [x] Chấm điểm đề 2 phần: tính riêng Part 1, Part 2, only passed if both passed
- [x] Trang kết quả: hiển thị điểm, số câu đúng/tổng, đạt/không đạt
- [x] Admin Results: xem danh sách kết quả, lọc, xem chi tiết, in phiếu điểm
- [x] Admin Statistics: biểu đồ Recharts (phân bố điểm, theo đơn vị, theo đề thi)
- [x] Export báo cáo thống kê Excel

#### Module 6: Quản lý Quyền Người dùng 🆕
- [x] 14 quyền chia 5 nhóm: Người dùng (5), Câu hỏi & Chủ đề (2), Đề thi & Ca thi (2), Giám sát & Kết quả (4), Thống kê (1)
- [x] Role defaults: ADMIN (tất cả), PROCTOR (5 quyền giám sát/kết quả/thống kê), CANDIDATE (không có quyền admin)
- [x] Override mode: Admin có thể cấp/thu hồi từng quyền riêng cho mỗi người dùng qua tab "Phân quyền"
- [x] Giao diện phân quyền: grouped checkboxes, tìm kiếm, chọn tất cả, khôi phục theo vai trò
- [x] `requirePermission(key)` bảo vệ tất cả 34 admin API routes (sửa lỗ hổng bảo mật cũ)
- [x] Middleware bỏ redirect PROCTOR→monitor, để permission-based layout xử lý
- [x] Menu sidebar hiển thị theo permission thay vì hardcoded role
- [x] Nút/thao tác ẩn/hiện theo permission (`can('users.create')`, ...)
- [x] `api/auth/me` trả về thêm `permissions[]`
- [x] `RoleGuard` component hỗ trợ `requiredPermission` prop

#### Hạ tầng & Bảo mật
- [x] PostgreSQL migration từ SQLite (đã hoàn tất)
- [x] Middleware bảo vệ route (/admin, /exam, /api/admin, /api/exam)
- [x] **Tất cả API admin routes được bảo vệ bởi `requirePermission()`** — vá lỗ hổng auth cũ
- [x] Maintenance mode (biến môi trường MAINTENANCE_MODE)
- [x] Backup/Restore database script
- [x] Kiểm tra session conflict (409 Conflict khi bị takeover)
- [x] Loading/Error states đầy đủ
- [x] Responsive design (hỗ trợ Mobile + iOS double-tap fix)
- [x] Pagination component dùng chung

### 🟢 Đang làm dở / Hoạt động gần đây (Cập nhật: 2026-08-03)

#### Vừa hoàn thành hôm nay:
- [x] **Cải tiến đề TWO_PART** — Bỏ giới hạn 50 câu, chấm điểm theo phần trăm, ẩn pass_score
  - Bỏ toàn bộ điều kiện `totalQuestions > 50` trong 4 API routes và 4 UI pages
  - Số câu mỗi phần = tổng count trong ma trận riêng (part1Matrix, part2Matrix)
  - Tính đạt theo `partXPercent >= partXPassPercent` (so sánh phần trăm thực)
  - Ẩn trường "Điểm đạt" ở UI khi exam.type === 'TWO_PART'
  - Cập nhật `TwoPartScore` interface: thêm `part1Percent`, `part1PassPercent`, `part2Percent`, `part2PassPercent`, `part1Label`, `part2Label`
  - Tương thích ngược: hiển thị dùng fallback cho dữ liệu cũ
  - `npm run build`: ✅ thành công, 0 lỗi TypeScript
- [x] **Sửa 2 bug Ngân hàng câu hỏi**:
  - Database: 2 bảng mới (`Permission`, `UserPermission`), **15 quyền** seed
  - `lib/permissions.ts`: `hasPermission()`, `getUserPermissions()`, `requirePermission()`
  - 34 API routes được bảo vệ (vá lỗ hổng auth cũ)
  - Frontend: tab "Phân quyền" trong user edit, permission-based menu & buttons
  - `npm run build`: thành công, không lỗi TypeScript
- [x] **Audit bảo mật toàn diện** module phân quyền — báo cáo tại `AUDIT_PERMISSION.md`
  - Phát hiện 2 lỗi CRITICAL + 5 lỗi trung bình + 3 lỗi thấp
  - 34/34 API routes đã được verify có `requirePermission` — 0 route thiếu
- [x] **Sửa 2 lỗi CRITICAL**:
  - 🔴 **#1 Override/Fallback**: Thêm `permissionMode` (ROLE|CUSTOM) vào User model — CUSTOM rỗng giờ lưu đúng thay vì rơi về ROLE defaults
  - 🔴 **#2 Thiếu key**: Thêm `users.permissions` key riêng cho API phân quyền (trước trộn với `users.edit`)
- [x] Cập nhật `AI_CONTEXT.md` chi tiết cho AI/Agent tương lai + quy ước cập nhật sau mỗi task
- [x] **Sửa 2 bug Ngân hàng câu hỏi**:
  - 🔧 **Bug #1: Import Excel không phân biệt chủ đề cha/con** — `resolveTopicId()` trong import route không kiểm tra topic đích có children không → câu hỏi bị gán vào chủ đề cha. Fix: thêm `_count.children` check, nếu > 0 thì báo lỗi kèm danh sách chủ đề con.
  - 🔧 **Bug #2: Sửa nhanh không hiển thị đáp án đúng** — `startEdit()` trong inline edit dùng `JSON.parse` trực tiếp → lỗi với `correct_answer` dạng chuỗi trần `"A"` (từ import Excel). Fix: dùng `parseCorrectAnswerValue()` thay `JSON.parse`, hàm này xử lý được mọi định dạng.
  - 🔧 **Serialize nhất quán**: `serializeCorrectAnswer()` giờ luôn lưu JSON array `'["A"]'` thay vì chuỗi trần khi 1 đáp án.

#### Đang hoạt động ổn định:
- [x] Hệ thống đang vận hành thực tế tại Công ty Điện lực Sơn La
- [x] PostgreSQL ổn định, backup/restore hoạt động
- [x] Tất cả 6 modules hoàn chỉnh, không có bug nghiêm trọng
- [x] Permission system: 15 quyền, CUSTOM/ROLE mode rõ ràng, 34 API routes được bảo vệ

### 🟡 Cần làm tiếp theo (Prioritized Roadmap)

#### Ưu tiên CAO — Bảo mật & Ổn định:
- [ ] **Wrap admin pages với RoleGuard** — hiện tại gõ URL trực tiếp vẫn render trang (dù API chặn data)
- [ ] **Chống tự khóa admin cuối cùng** — Admin có thể tự hủy quyền của mình
- [ ] **Middleware role-check cho `/api/admin/*`** — giảm tải DB query không cần thiết
- [ ] **Rate Limiting** cho API (đặc biệt `/api/auth/login` chống brute-force)
- [ ] **Audit Log**: ghi lại ai đã cấp/thu hồi quyền, ai đã sửa/xóa user, ai đã mở khóa bài thi

#### Ưu tiên TRUNG BÌNH — Cải thiện trải nghiệm:
- [ ] **Unit Test** với Vitest/Jest cho `lib/permissions.ts`, `lib/auth.ts`, `lib/exam-types.ts`
- [ ] **Integration Test** cho API routes (dùng `next-test-api-route-handler`)
- [ ] **Thông báo đẹp hơn**: thay `alert()` bằng toast notification component
- [ ] **Dark mode** cho giao diện thi và admin
- [ ] **Dọn dẹp** ~65 script debug ở root thư mục `thipcsl/` (đã gitignored, nhưng vẫn chiếm disk)

#### Ưu tiên THẤP — Mở rộng:
- [ ] **Quên mật khẩu / Reset password** cho CANDIDATE
- [ ] **Lịch sử thay đổi quyền** — xem ai đã sửa quyền của ai, lúc nào
- [ ] **Dashboard tổng quan** cho Admin (tổng số user, số bài thi hôm nay, tỉ lệ đạt)
- [ ] **Email notification** khi được gán vào kỳ thi mới
- [ ] **Multi-language** (hiện tại UI toàn tiếng Việt, có thể thêm EN)

### 🔴 Nợ kỹ thuật (Technical Debt)
- [ ] `is_active` flag không được kiểm tra trong middleware và hầu hết API routes
- [ ] Admin có thể tự khóa quyền của chính mình (chưa chặn "last admin")
- [ ] Trang admin chưa wrap với `RoleGuard` — gõ URL trực tiếp vẫn render trang (dù API chặn data)
- [ ] Một số API response trả về tiếng Việt, một số tiếng Anh — cần nhất quán
- [ ] `next-env.d.ts` bị gitignored nhưng một số môi trường cần nó
- [ ] Không có health check endpoint (`/api/health`)
- [ ] `prisma.$transaction` có thể gây lock khi nhiều user cùng thi — cần theo dõi
- [ ] Permission `*.manage` còn thô (gộp view/create/edit/delete) — tương lai nên tách nhỏ hơn

---

## 3. Sơ đồ luồng dữ liệu chính

### Luồng Đăng nhập
```
Client (login/page.tsx) → POST /api/auth/login → Prisma check user + bcrypt compare
  → JWT sign → Set cookie 'token' → Response {user}
  → Client redirect: ADMIN→/admin, PROCTOR→/admin/monitor, CANDIDATE→/exam
```

### Luồng Làm bài thi
```
1. CANDIDATE vào /exam → GET /api/exam-runner/active → hiển thị danh sách ca thi
2. Click "Vào thi" → GET /api/exam-runner/[id]
   → Middleware verify JWT cookie
   → Check: exam OPEN, user in allowed_users, chưa hết attempts
   → Check: không có bài IN_PROGRESS nào khác (Official only)
   → Tạo Result IN_PROGRESS với questionOrder + optionsOrder đã shuffle
   → Trả về questions (KHÔNG có correct_answer) + sessionToken + serverTime
3. Client hiển thị màn hình quy định → Yêu cầu Fullscreen → Bắt đầu thi
4. Mỗi khi chọn đáp án → handleAnswerChange → LocalStorage + POST /api/exam-runner/progress
5. Hết giờ hoặc Nộp bài → POST /api/exam-runner/[id]
   → Server tính điểm (so sánh Set cho multi-answer)
   → Nếu TWO_PART: calculateTwoPartScore → kiểm tra pass từng phần
   → Update Result: status=COMPLETED, score, is_passed
   → Cleanup localStorage → Redirect /exam/results/[resultId]
```

### Luồng Giám sát
```
Giám thị vào /admin/monitor → GET /api/admin/monitor (poll 10s)
  → Hiển thị tất cả IN_PROGRESS results: tên TS, đề thi, tiến độ, trạng thái khóa
  → Có thể Mở khóa nếu TS bị khóa do vi phạm (POST /api/admin/results/[id]/unlock)
```

### Luồng Ôn tập (PRACTICE)
```
User tạo đề ôn tập từ admin (hoặc fork từ đề public)
  → Exam.type=PRACTICE, Exam.practiceSourceId=null (private) hoặc có id (public fork)
  → Mỗi lần vào thi, hệ thống regenerate câu hỏi mới từ matrix
  → Không giới hạn số lần làm, không áp dụng anti-cheat
```

---

## 4. Các API Endpoints quan trọng

### Admin API (yêu cầu permission tương ứng)

| Method | Endpoint | Permission | Mô tả |
|:---|:---|:---|:---|
| GET | `/api/admin/users` | `users.view` | Danh sách user (phân trang, filter) |
| POST | `/api/admin/users` | `users.create` | Tạo user mới |
| PUT | `/api/admin/users` | `users.edit` | Chuyển phòng ban / cập nhật lĩnh vực hàng loạt |
| DELETE | `/api/admin/users` | `users.delete` | Xóa hàng loạt user |
| GET | `/api/admin/users/[id]` | `users.view` | Chi tiết user + danh sách đề thi + kết quả |
| PUT | `/api/admin/users/[id]` | `users.edit` | Cập nhật thông tin user |
| PATCH | `/api/admin/users/[id]` | `users.edit` | Gán/gỡ đề thi cho user |
| DELETE | `/api/admin/users/[id]` | `users.delete` | Xóa 1 user |
| GET | `/api/admin/users/[id]/permissions` | `users.view` | Xem quyền của user |
| PUT | `/api/admin/users/[id]/permissions` | `users.edit` | Lưu / khôi phục quyền user |
| POST | `/api/admin/users/import` | `users.import_export` | Import Excel users |
| POST | `/api/admin/users/export` | `users.import_export` | Export Excel users |
| PATCH | `/api/admin/users/batch` | `users.edit` | Batch lock/unlock users |
| GET | `/api/admin/users/filters` | `users.view` | Lấy danh sách phòng ban/lĩnh vực để filter |
| GET | `/api/admin/questions` | `questions.manage` | Danh sách câu hỏi (phân trang, filter) |
| POST | `/api/admin/questions` | `questions.manage` | Tạo câu hỏi mới |
| PUT | `/api/admin/questions/[id]` | `questions.manage` | Sửa câu hỏi |
| DELETE | `/api/admin/questions/[id]` | `questions.manage` | Xóa câu hỏi |
| POST | `/api/admin/questions/import` | `questions.manage` | Import Excel câu hỏi |
| GET/POST/PUT/DELETE | `/api/admin/topics` | `topics.manage` | CRUD chủ đề |
| POST | `/api/admin/topics/import` | `topics.manage` | Import Excel chủ đề |
| POST | `/api/admin/topics/reorder` | `topics.manage` | Sắp xếp thứ tự chủ đề |
| GET | `/api/admin/topics/export` | `topics.manage` | Export Excel chủ đề |
| GET/POST | `/api/admin/exams` | `exams.manage` | Danh sách / tạo đề thi |
| GET/PUT/DELETE | `/api/admin/exams/[id]` | `exams.manage` | Chi tiết / sửa / xóa đề thi |
| POST | `/api/admin/exams/import` | `exams.manage` | Import đề thi |
| POST | `/api/admin/exams/import-users` | `exams.manage` | Import users vào đề thi |
| POST | `/api/admin/exams/two-part` | `exams.manage` | Tạo đề 2 phần |
| GET/PUT | `/api/admin/exams/two-part/[id]` | `exams.manage` | Sửa đề 2 phần |
| POST | `/api/admin/exams/[id]/publish-practice` | `exams.manage` | Publish đề thành PRACTICE |
| GET/POST/PUT/DELETE | `/api/admin/sessions` | `sessions.manage` | CRUD ca thi |
| GET | `/api/admin/monitor` | `monitor.view` | Dữ liệu giám sát real-time |
| GET/DELETE | `/api/admin/results` | `results.view` | Danh sách / xóa kết quả |
| GET/PATCH/DELETE | `/api/admin/results/[id]` | `results.view` | Chi tiết / cập nhật in / xóa kết quả |
| POST | `/api/admin/results/[id]/unlock` | `exam.unlock` | Mở khóa bài thi bị khóa |
| GET | `/api/admin/statistics` | `statistics.view` | Dữ liệu thống kê |
| GET | `/api/admin/stats/topics` | `statistics.view` | Thống kê theo chủ đề |
| GET | `/api/admin/samples/*` | `users.view` | Tải file Excel mẫu |

### User-facing API (chỉ cần token hợp lệ)

| Method | Endpoint | Mô tả |
|:---|:---|:---|
| POST | `/api/auth/login` | Đăng nhập — Public |
| GET | `/api/auth/me` | Lấy thông tin user + permissions[] |
| GET | `/api/exam-runner/active` | Danh sách ca thi đang hoạt động cho user |
| GET | `/api/exam-runner/[id]` | Lấy đề thi (KHÔNG có correct_answer) |
| POST | `/api/exam-runner/[id]` | Nộp bài thi |
| POST | `/api/exam-runner/progress` | Đồng bộ tiến độ làm bài |
| POST | `/api/exam-runner/lock` | Khóa bài thi (từ client khi vi phạm) |
| GET | `/api/exam-runner/results` | Kết quả thi của user hiện tại |
| GET/POST | `/api/practice` | Danh sách / tạo đề ôn tập |
| GET/PUT/DELETE | `/api/practice/[id]` | Chi tiết / sửa / xóa đề ôn tập |
| POST | `/api/practice/[id]/fork` | Fork đề ôn tập |
| POST | `/api/practice/[id]/pin` | Pin câu hỏi đề ôn tập |
| POST | `/api/practice/[id]/reset` | Reset câu hỏi đề ôn tập |
| GET | `/api/results` | Kết quả thi của user |
| GET | `/api/results/[id]` | Chi tiết 1 kết quả |

---

## 5. Biến môi trường (.env)

```env
DATABASE_URL="postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:5432/<DB_NAME>"
JWT_SECRET=<your-jwt-secret-here>
# MAINTENANCE_MODE=true   # Bỏ comment để bật chế độ bảo trì
```

---

## 6. Các lệnh thường dùng

```bash
npm run dev        # Chạy dev server (next dev)
npm run build      # Build production
npm run start      # Chạy production
npm run lint       # ESLint
npm run backup     # Backup database
npm run restore    # Restore database từ backup
npm run migrate    # Chạy Prisma migrate an toàn
npx prisma studio  # Mở Prisma Studio xem database
npx tsx prisma/seed.ts  # Seed database (tạo tài khoản admin mặc định)
```

### 6.1 Triển khai & chạy trên Linux 🐧

> **Hệ thống hiện đang chạy trên Windows (PCC).** Khi triển khai lên server Linux, áp dụng các bước dưới đây. Hướng dẫn chi tiết đầy đủ xem file `thipcsl/DEPLOY_LINUX.md` và `thipcsl/HUONG_DAN_DEPLOY_MAY_CHU_MOI.md`.

**1. Yêu cầu:** Node.js 20+ (LTS), PostgreSQL 14+, Nginx (nếu cần reverse proxy).

**2. Tạo database khớp `.env`** (web app nằm trong thư mục con `thipcsl/`):
```bash
sudo -u postgres psql <<'EOF'
CREATE USER exam_admin WITH password '<DB_PASSWORD>';
CREATE DATABASE exam_system OWNER exam_admin;
GRANT ALL PRIVILEGES ON DATABASE exam_system TO exam_admin;
ALTER USER exam_admin WITH CREATEDB;
EOF
```

**3. Cài & đồng bộ schema:**
```bash
cd /opt/thipcsl/thipcsl        # web app thực nằm trong thư mục con
npm install
npx prisma generate
npx prisma db push             # hoặc: npx prisma migrate deploy
npx tsx prisma/seed.ts         # tạo admin mặc định
npm run build                  # BẮT BUỘC pass, 0 lỗi TS
npm start                      # chạy production, mặc định port 3000
```

**4. Chạy nền bằng systemd** (tự khởi động cùng máy):
```ini
# /etc/systemd/system/thipcsl.service
[Service]
User=thipcsl
WorkingDirectory=/opt/thipcsl/thipcsl
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now thipcsl
```

**5. Backup PostgreSQL trên Linux** — dùng script có sẵn:
```bash
chmod +x backup-database-deploy.sh
./backup-database-deploy.sh    # tạo file .backup + .sql trong backups/
```

**6. Lưu ý quan trọng trên Linux:**
- `.env` đang dùng `localhost:5432` — nếu PostgreSQL server khác máy, đổi `DATABASE_URL` cho đúng.
- Đổi `JWT_SECRET` và mật khẩu DB mặc định trước khi đưa vào vận hành (xem `SECURITY_CHECKLIST.md`).
- Tường lửa chỉ mở cổng 80/443; PostgreSQL (5432) không expose ra ngoài.
- Backup tự động qua cron: `0 2 * * * cd /opt/thipcsl/thipcsl && ./backup-database-deploy.sh`
- **Deploy thử đã kiểm chứng 2026-08-14** trên Ubuntu (Node v20.20.2): `npm run build` 0 lỗi, app chạy port 3000, seed tạo admin `admin/admin` (DB trống). Các lỗi hay gặp (EACCES build, `~` sai, shell thipcsl nằm ở home, 401 khi chưa seed) — chi tiết tại `thipcsl/DEPLOY_LINUX.md` mục 11.1.

---

## 7. Ghi chú quan trọng cho AI

### 7.1 Tổng quan hệ thống
1. **Đây là hệ thống đang vận hành thực tế** tại Công ty Điện lực Sơn La, không phải dự án mẫu. Cần cẩn trọng khi thay đổi logic.
2. **Đã migrate từ SQLite → PostgreSQL**: Schema dùng UUID, `@db.Uuid`, `@db.Text`, `@db.DoublePrecision`. Không dùng SQLite-specific features.
3. **Hai thư viện JWT tồn tại song song**: `jsonwebtoken` (trong `lib/auth.ts` + API routes) và `jose` (trong `middleware.ts` + `admin/layout.tsx`). Cả hai dùng chung `JWT_SECRET` từ env. Token format tương thích giữa hai thư viện. Khi thêm auth mới, ưu tiên dùng `verifyToken` từ `lib/auth.ts` hoặc `requirePermission` từ `lib/permissions.ts`.

### 7.2 Hệ thống phân quyền (Permission System)

#### Bảng đầy đủ 15 quyền:
| Key | Tên hiển thị | Nhóm | Mô tả |
|:---|:---|:---|:---|
| `users.view` | Xem danh sách người dùng | Người dùng | Xem danh sách và thông tin người dùng |
| `users.create` | Tạo người dùng mới | Người dùng | Tạo tài khoản người dùng mới |
| `users.edit` | Chỉnh sửa người dùng | Người dùng | Sửa thông tin, vai trò, trạng thái, khóa/mở khóa |
| `users.delete` | Xóa người dùng | Người dùng | Xóa tài khoản người dùng |
| `users.import_export` | Import/Export người dùng | Người dùng | Import Excel và xuất Excel danh sách user |
| `users.permissions` | Quản lý phân quyền | Người dùng | Xem và chỉnh sửa phân quyền của người dùng |
| `questions.manage` | Quản lý câu hỏi | Câu hỏi & Chủ đề | Tạo, sửa, xóa, import câu hỏi |
| `topics.manage` | Quản lý chủ đề | Câu hỏi & Chủ đề | Tạo, sửa, xóa, import, sắp xếp cây chủ đề |
| `exams.manage` | Quản lý đề thi | Đề thi & Ca thi | Tạo, sửa, xóa đề thi, cấu hình ma trận, gán user |
| `sessions.manage` | Quản lý ca thi | Đề thi & Ca thi | Tạo, sửa, xóa ca thi, gán đề thi vào ca |
| `monitor.view` | Xem giám sát thi | Giám sát & Kết quả | Xem danh sách thí sinh đang làm bài real-time |
| `results.view` | Xem kết quả thi | Giám sát & Kết quả | Xem danh sách và chi tiết kết quả thi |
| `results.print_export` | In/Xuất kết quả | Giám sát & Kết quả | In phiếu điểm và xuất danh sách kết quả Excel |
| `exam.unlock` | Mở khóa bài thi | Giám sát & Kết quả | Mở khóa bài thi cho thí sinh bị khóa do vi phạm |
| `statistics.view` | Xem thống kê | Thống kê | Xem biểu đồ, phân bố điểm, báo cáo tổng quan |

#### Role defaults:
```typescript
ADMIN:    [TẤT CẢ 15 quyền]
PROCTOR:  ['monitor.view', 'results.view', 'results.print_export', 'exam.unlock', 'statistics.view']
CANDIDATE:[]
```

#### Logic permissionMode (ROLE vs CUSTOM):
```
User.permissionMode === 'CUSTOM'
    → Dùng chính xác danh sách UserPermission (có thể rỗng = không có quyền admin nào)
User.permissionMode === 'ROLE' (default)
    → Dùng ROLE_DEFAULT_PERMISSIONS[user.role] (role defaults)
```
- `setUserPermissions()` → tự động set `permissionMode = 'CUSTOM'`
- `clearUserPermissions()` ("Khôi phục theo vai trò") → set `permissionMode = 'ROLE'` + xóa UserPermission
- **Quan trọng:** CUSTOM rỗng ≠ ROLE — đây là 2 trạng thái khác nhau. CUSTOM rỗng = user không có quyền admin nào.

"Khôi phục theo vai trò" = xóa hết `UserPermission` → quay về fallback mode.

### 7.3 Code Patterns — API Routes

#### Pattern A: Admin API route có kiểm tra quyền (DÙNG MỚI)
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function GET(request: Request) {
    try {
        // 1. Kiểm tra quyền — trả về 401/403 nếu không có quyền
        const userIdOrErr = await requirePermission('users.view');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        // userIdOrErr giờ là string (userId)

        // 2. Logic nghiệp vụ
        const data = await prisma.user.findMany();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
```

#### Pattern B: User-facing route (chỉ cần xác thực, không cần quyền admin)
```typescript
import { getAuthUserId } from '@/lib/permissions';
// hoặc dùng verifyToken từ lib/auth.ts như cũ

const userIdOrErr = await getAuthUserId();
if (typeof userIdOrErr !== 'string') return userIdOrErr;
```

#### Pattern C: Đọc params trong route handler (Next.js App Router)
```typescript
// params là Promise — dùng await để lấy giá trị
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    // ...
}
```

### 7.4 Code Patterns — Frontend

#### Pattern A: Client Component với permission check
```typescript
'use client';
import { useState, useEffect } from 'react';

export default function MyPage() {
    const [permissions, setPermissions] = useState<string[]>([]);
    const can = (perm: string) => permissions.includes(perm);

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(data => setPermissions(data.permissions || []));
    }, []);

    return (
        <div>
            {can('users.create') && (
                <button>Tạo người dùng mới</button>
            )}
        </div>
    );
}
```

#### Pattern B: Server Component (admin layout) — dùng getUserPermissions từ server
```typescript
// File: app/admin/layout.tsx (Server Component — KHÔNG có 'use client')
import { getUserPermissions } from '@/lib/permissions';

export default async function AdminLayout({ children }) {
    // ... verify JWT bằng jose, lấy user từ DB
    const permissions = await getUserPermissions(userId);
    const can = (perm: string) => permissions.includes(perm);
    // Render menu items conditionally
}
```

#### Pattern C: Form POST/PUT pattern
```typescript
const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, full_name: fullName, department, field, role }),
});
if (res.ok) {
    router.push('/admin');  // thành công → redirect
} else {
    const data = await res.json();
    alert(data.error || 'Lỗi');  // thất bại → hiển thị lỗi
}
```

### 7.5 Middleware Flow (middleware.ts)

```
Request → middleware.ts
  ├─ MAINTENANCE_MODE? → redirect /maintenance
  ├─ path === /login hoặc /api/auth? → next() (public)
  ├─ Không có token cookie? → redirect /login
  ├─ JWT verify (jose) thất bại? → redirect /login
  ├─ path startsWith /admin?
  │   ├─ role !== ADMIN && role !== PROCTOR? → redirect /login
  │   └─ OK → next()
  └─ path khác (/exam, /, /api/...) → next()
```

**Matcher pattern (những path được middleware xử lý):**
```typescript
matcher: ['/admin/:path*', '/exam/:path*', '/', '/api/admin/:path*', '/api/exam/:path*', '/maintenance']
```

**Lưu ý:** Role CANDIDATE bị chặn khỏi `/admin` page routes, nhưng `/api/admin/*` được phép đi qua middleware (chỉ cần token hợp lệ). Việc kiểm tra quyền chi tiết được thực hiện ở từng API route qua `requirePermission()`. Đây là kiến trúc defense-in-depth: middleware là coarse gate (role), API route là fine-grained gate (permission).

### 7.6 Login & Redirect Flow
```
login/page.tsx → POST /api/auth/login
  → thành công: data.user.role === 'ADMIN'    → router.push('/admin')
                data.user.role === 'PROCTOR'  → router.push('/admin/monitor')
                data.user.role === 'CANDIDATE' → router.push('/exam')
  → thất bại: hiển thị data.error (Sai tài khoản hoặc mật khẩu / Tài khoản đã bị khóa)
```

### 7.7 Exam Runner — Chi tiết kỹ thuật

1. **Time sync**: Server gửi `serverTime` (ISO string) trong response. Client tính `timeOffset = serverTime - Date.now()`. Tất cả tính toán thời gian đều dùng `Date.now() + timeOffset` để đồng bộ với server.
2. **Question order + Options order**: Lưu vào `Result.details.questionOrder` và `Result.details.optionsOrder` khi tạo `IN_PROGRESS`. Khi F5, order được tải lại từ DB, không shuffle lại.
3. **Session conflict**: Mỗi lần GET exam tạo `session_token` UUID mới lưu vào Result. Khi POST progress/submit, client gửi sessionToken. Server so sánh — nếu khác → 409 SESSION_EXPIRED.
4. **Auto-submit khi hết giờ**: Client tự gọi handleSubmit khi timeLeft ≤ 0. Ngoài ra, `autoSubmitExam()` trong `lib/exam-helper.ts` được gọi từ server nếu GET exam thấy `started_at + duration + 2 phút < now` (fallback nếu client bị đóng).
5. **Multi-answer scoring**: 
   ```typescript
   const setA = new Set(userAns);  // user answers
   const setB = new Set(correctAns);  // correct answers
   const isCorrect = setA.size === setB.size && [...setA].every(v => setB.has(v));
   ```

### 7.8 TWO_PART Exam — Cách hoạt động (Cập nhật 2026-08-03)

- **KHÔNG CÒN giới hạn 50 câu**: Tổng số câu = tổng câu từ part1Matrix + tổng câu từ part2Matrix. Mỗi phần phải có ít nhất 1 câu.
- **Số câu mỗi phần lấy từ ma trận riêng**: part1Total = tổng count trong part1Matrix; part2Total = tổng count trong part2Matrix.
- **Cấu hình**: `Exam.settings` chứa JSON `{ twoPartConfig: { part1Label, part2Label, part1PassPercent, part2PassPercent, part1QuestionIds, part2QuestionIds }, part1Matrix: {topicId: count}, part2Matrix: {topicId: count} }`
- **Chấm điểm**: `calculateTwoPartScore()` trong `lib/exam-types.ts` — tính điểm riêng Part 1 và Part 2 dựa trên ma trận topic.
- **Tính đạt theo phần trăm từng phần (KHÔNG dùng pass_score)**:
  - part1Percent = (part1Correct / part1Total) * 100 (phần trăm thực, không làm tròn)
  - part2Percent = (part2Correct / part2Total) * 100 (phần trăm thực, không làm tròn)
  - part1Passed = part1Percent >= part1PassPercent
  - part2Passed = part2Percent >= part2PassPercent
  - isPassed = part1Passed && part2Passed
- **Điểm thang 10 vẫn được tính** (part1Score, part2Score) để tham khảo/thống kê nhưng KHÔNG dùng để xác định đạt/không đạt.
- **Ẩn trường "Điểm đạt" (pass_score)** ở giao diện khi exam.type === 'TWO_PART'. pass_score lưu mặc định 5.0 trong DB để tương thích schema.
- **Kết quả**: Lưu `twoPartScore` vào `Result.details.twoPartScore` với cấu trúc mới.

**Cấu trúc twoPartScore mới (2026-08-03)**:
```typescript
{
  part1Label: string,       // "Yêu cầu chung"
  part2Label: string,       // "Yêu cầu riêng"
  part1Correct: number,
  part1Total: number,
  part1Percent: number,     // Phần trăm thực (VD: 66.666...), không làm tròn
  part1PassPercent: number, // Tỷ lệ yêu cầu (VD: 70)
  part1Score: number,       // Thang 10 (tham khảo)
  part1Passed: boolean,
  part2Correct: number,
  part2Total: number,
  part2Percent: number,     // Phần trăm thực
  part2PassPercent: number, // Tỷ lệ yêu cầu
  part2Score: number,       // Thang 10 (tham khảo)
  part2Passed: boolean,
  overallPassed: boolean,
}
```
- **Tương thích ngược**: code hiển thị dùng fallback `twoPartScore.part1Percent ?? (part1Correct/part1Total*100)` và `twoPartScore.part1PassPercent ?? 70` nên đọc được cả dữ liệu cũ và mới.

### 7.9 PRACTICE Mode — Điểm khác biệt với OFFICIAL
- Không giới hạn số lần làm (bỏ qua `max_attempts`)
- Không yêu cầu fullscreen, không anti-cheat
- Mỗi lần vào thi regenerate câu hỏi mới từ matrix (VD: mỗi topic lấy ngẫu nhiên N câu)
- Có thể fork từ đề public: `practiceSourceId` trỏ đến đề gốc
- Có thể pin (lưu câu hỏi hiện tại) hoặc reset (tạo câu hỏi mới)

### 7.10 Các điểm cần lưu ý khi thêm tính năng mới

1. **API mới cần `requirePermission(key)`** nếu là admin route. Chọn key phù hợp từ bảng 14 quyền.
2. **Nếu thêm quyền mới**: Thêm vào `PERMISSION_DEFINITIONS` trong `lib/permissions.ts`, thêm vào `PERM_GROUPS` trong `app/admin/users/[id]/page.tsx`, cập nhật `prisma/seed.ts`.
3. **Nếu thêm role mới**: Cập nhật `ROLE_DEFAULT_PERMISSIONS` trong `lib/permissions.ts`, cập nhật middleware role check, cập nhật login redirect, cập nhật admin layout role badge.
4. **Frontend page mới trong /admin**: Wrap trong Server Component layout (tự động có sidebar). Dùng `can()` helper để ẩn/hiện nút.
5. **Không import trực tiếp `cookies` từ `next/headers` trong API routes nữa** — dùng `requirePermission()` hoặc `getAuthUserId()` từ `lib/permissions.ts`.
6. **TypeScript strict**: Không dùng `any` trừ khi bắt buộc. Params là `Promise<>` trong Next.js App Router.
7. **Database migration**: Dùng `npx prisma db push` nếu không có quyền CREATE DATABASE. File migration SQL nên được commit riêng.

### 7.11 Các lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|:---|:---|:---|
| `Cannot find name 'cookies'` | Import `cookies` bị xóa khi thay thế auth check cũ | Dùng `requirePermission()` — không cần `cookies` nữa |
| `params must be awaited` | Next.js App Router yêu cầu `await params` | Thêm `const { id } = await params;` |
| `Type error in backup files` | tsconfig include quét cả thư mục backups | Đã exclude trong tsconfig — nếu thêm thư mục mới, cập nhật tsconfig |
| `Permission denied to create database` | PostgreSQL user không có quyền CREATEDB | Dùng `prisma db push` thay vì `migrate dev` |
| Build thành công nhưng runtime lỗi | Thiếu `DATABASE_URL` env khi chạy production | Kiểm tra `.env` hoặc biến môi trường hệ thống |

### 7.12 Quy ước đặt tên
- **Permission key**: `resource.action` — VD: `users.view`, `exams.manage`, `exam.unlock`
- **API response error**: `{ error: 'Mô tả lỗi tiếng Việt' }` — status 400/401/403/404/500
- **HTTP status convention**:
  - 200: Thành công
  - 400: Bad request (thiếu field, sai format)
  - 401: Chưa đăng nhập / token không hợp lệ
  - 403: Không có quyền (sai role hoặc thiếu permission)
  - 404: Không tìm thấy resource
  - 409: Conflict (session takeover, double submit)
  - 500: Lỗi server
