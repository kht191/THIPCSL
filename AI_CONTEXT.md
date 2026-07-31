# THÔNG TIN DỰ ÁN & BỘ NHỚ AI — THIPCSL

> **Cập nhật gần nhất:** 2026-07-31 (thêm Module Quản lý Quyền Người dùng)
> **Mục đích:** File này là bộ nhớ cho các Agent AI (Claude, GPT) hiểu ngay lập tức ngữ cảnh dự án mà không cần phân tích lại toàn bộ codebase.

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

- **User**: id, username (unique), password_hash, full_name, department, role (ADMIN/PROCTOR/CANDIDATE), is_active, field, timestamps
- **Question**: id, content (Text), options (JSON Text), correct_answer, category, topicId (FK → Topic, optional)
- **Topic**: id, name, parentId (self-ref FK, cascade delete), isActive, order, timestamps
- **Exam**: id, title, duration (phút), max_attempts, max_violations, question_ids (Text JSON array), allowed_users (Text JSON array), status, pass_score, type (OFFICIAL/PRACTICE/TWO_PART), creatorId, settings (Text JSON), practiceSourceId (self-ref FK)
- **ExamSession**: id, name, startTime, endTime, status
- **Result**: id, user_id (FK), exam_id (FK), session_id (FK optional), score, is_passed, is_printed, status (IN_PROGRESS/COMPLETED), details (Text JSON: {answers, questionOrder, optionsOrder, twoPartScore}), started_at, submitted_at, session_token (UUID), is_locked
- **Permission**: id, key (UNIQUE, VD: "users.view"), name, group_name, description — 14 quyền trong 5 nhóm
- **UserPermission**: user_id (FK→User) + permission_id (FK→Permission) — composite PK. Nếu user có bản ghi → override mode; nếu không → fallback về role defaults

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

### Đang làm dở / Cần chú ý ⚠️
- [ ] Một số file test scripts (`check-*.ts`, `debug-*.ts`, `create-*.ts`) nằm rải rác ở root — là script dùng 1 lần, đã gitignored + excluded khỏi tsconfig
- [ ] API chưa có rate limiting
- [ ] Chưa có Unit Test / Integration Test chính thức (chỉ có script test thủ công)

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

| Method | Endpoint | Mô tả | Auth |
|:---|:---|:---|:---|
| POST | `/api/auth/login` | Đăng nhập, trả về JWT cookie | Public |
| GET | `/api/auth/me` | Lấy thông tin user từ JWT | Token |
| GET | `/api/admin/users` | Danh sách user (phân trang, filter) | ADMIN |
| POST | `/api/admin/users/import` | Import Excel users | ADMIN |
| DELETE | `/api/admin/users` | Xóa hàng loạt user | ADMIN |
| PUT | `/api/admin/users` | Chuyển phòng ban / cập nhật lĩnh vực hàng loạt | ADMIN |
| GET | `/api/admin/questions` | Danh sách câu hỏi (phân trang, filter) | ADMIN |
| POST | `/api/admin/questions/import` | Import Excel câu hỏi | ADMIN |
| GET | `/api/admin/exams` | Danh sách đề thi | ADMIN |
| POST | `/api/admin/exams` | Tạo đề thi mới | ADMIN |
| POST | `/api/admin/exams/two-part` | Tạo đề 2 phần | ADMIN |
| GET | `/api/admin/topics` | Cây chủ đề | ADMIN |
| POST | `/api/admin/topics/import` | Import Excel chủ đề | ADMIN |
| POST | `/api/admin/topics/reorder` | Sắp xếp lại thứ tự chủ đề | ADMIN |
| GET | `/api/admin/monitor` | Dữ liệu giám sát real-time | ADMIN, PROCTOR |
| POST | `/api/admin/results/[id]/unlock` | Mở khóa bài thi bị khóa | ADMIN, PROCTOR |
| GET | `/api/admin/statistics` | Dữ liệu thống kê | ADMIN, PROCTOR |
| GET | `/api/exam-runner/active` | Danh sách ca thi đang hoạt động cho user | Token |
| GET | `/api/exam-runner/[id]` | Lấy đề thi để làm (không có đáp án) | Token |
| POST | `/api/exam-runner/[id]` | Nộp bài thi | Token |
| POST | `/api/exam-runner/progress` | Đồng bộ tiến độ làm bài | Token |
| POST | `/api/exam-runner/lock` | Khóa bài thi (từ client khi vi phạm) | Token |
| GET | `/api/admin/samples/*` | Tải file Excel mẫu | ADMIN |

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

---

## 7. Ghi chú quan trọng cho AI

1. **Đây là hệ thống đang vận hành thực tế** tại Công ty Điện lực Sơn La, không phải dự án mẫu. Cần cẩn trọng khi thay đổi logic.
2. **Đã migrate từ SQLite → PostgreSQL**: Schema dùng UUID, `@db.Uuid`, `@db.Text`, `@db.DoublePrecision`. Không dùng SQLite-specific features.
3. **Hệ thống 3 role + Permission-based quyền**:
   - Role: ADMIN, PROCTOR, CANDIDATE (giữ nguyên làm nhóm quyền mặc định)
   - Permission: 14 quyền chi tiết trong 5 nhóm, lưu trong bảng `Permission` + `UserPermission`
   - Nếu user có bản ghi `UserPermission` → override mode (dùng đúng danh sách đó)
   - Nếu không có → fallback về role defaults
   - ADMIN mặc định: tất cả 14 quyền. PROCTOR: 5 quyền (monitor.view, results.view, results.print_export, exam.unlock, statistics.view). CANDIDATE: không có quyền admin nào
4. **Cách kiểm tra quyền trong API**: Dùng `requirePermission(key)` từ `lib/permissions.ts`
   ```typescript
   const userIdOrErr = await requirePermission('users.view');
   if (typeof userIdOrErr !== 'string') return userIdOrErr; // trả về 401/403
   ```
5. **Cách kiểm tra quyền ở Client**: Gọi `/api/auth/me` → lấy `data.permissions[]` → dùng `can(key)` helper
6. **Exam type**: OFFICIAL (thi thật, giới hạn attempts, anti-cheat), PRACTICE (ôn tập, không giới hạn, không anti-cheat), TWO_PART (2 phần riêng biệt, phải đạt cả 2).
7. **Shuffle questions & options**: Mỗi lần bắt đầu thi, câu hỏi và đáp án được xáo trộn và lưu vĩnh viễn vào `Result.details`. Không shuffle lại khi F5.
8. **Session token**: Mỗi lần tạo Result IN_PROGRESS sẽ có `session_token` UUID để phát hiện thi nhiều tab/thiết bị.
9. **Anti-cheat**: Yêu cầu Fullscreen API, phát hiện tab hidden + window blur, chặn chuột phải/copy/paste. Mobile được miễn fullscreen.
10. **Multi-answer questions**: Đáp án đúng có thể là mảng (VD: `["A","C"]`), chấm điểm bằng so sánh Set.
11. **Các script TS ở root**: Hầu hết là script tạm dùng 1 lần, đã gitignored + excluded khỏi tsconfig. Không cần quan tâm khi build.
