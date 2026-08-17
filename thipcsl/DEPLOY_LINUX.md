# 📦 Hướng dẫn triển khai THIPCSL trên Linux

> **Ứng dụng cho:** Hệ thống THIPCSL (Next.js 16 App Router + PostgreSQL + Prisma)
> **Thư mục app:** Web app thực nằm trong thư mục con `thipcsl/`
> **Xem thêm:** [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) — bảo mật trước vận hành

---

## 1. Giới thiệu tóm tắt

| Thành phần | Giá trị |
|:--|:--|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL (Prisma 5.22) |
| Default DB | `exam_system` / user `exam_admin` |
| Port mặc định | `next start` → `3000` |
| Node version | 20+ (LTS `20` hoặc `22`) |

---

## 2. Chuẩn bị máy chủ

### 2.1. Cài Node.js 20+ (LTS)

```bash
# Debian/Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node -v   # >= 20
npm -v
```

### 2.2. Cài PostgreSQL

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo systemctl status postgresql
```

### 2.3. Tạo database & user (khớp với `.env`)

```bash
sudo -u postgres psql <<'EOF'
CREATE USER exam_admin WITH password 'exam_admin_2026';
CREATE DATABASE exam_system OWNER exam_admin;
GRANT ALL PRIVILEGES ON DATABASE exam_system TO exam_admin;
ALTER USER exam_admin WITH CREATEDB;
EOF
```

> ⚠️ **Bảo mật:** Đổi mật khẩu `exam_admin_2026` và `JWT_SECRET` khi vào production (xem [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)).

---

## 3. Lấy mã nguồn

```bash
# User chạy app (không dùng root)
sudo adduser --system --group --home /opt/thipcsl thipcsl

# Clone repo
sudo mkdir -p /opt/thipcsl
sudo chown -R thipcsl /opt/thipcsl
sudo -u thipcsl git clone https://github.com/kht191/THIPCSL.git /opt/thipcsl

# Vào thư mục app thực
cd /opt/thipcsl/thipcsl
```

---

## 4. Cài dependencies & cấu hình môi trường

```bash
cd /opt/thipcsl/thipcsl
npm install
```

**Tạo file `.env`:**
```bash
sudo -u thipcsl nano .env
```
```env
DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"
JWT_SECRET=<đặt chuỗi bí mật dài, ngẫu nhiên>
```

> 🛡️ Tạo `JWT_SECRET` an toàn:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## 5. Khởi tạo Database (Prisma)

```bash
cd /opt/thipcsl/thipcsl
npx prisma generate
npx prisma db push                 # nếu DB chưa có schema
# HOẶC: npx prisma migrate deploy  # nếu có file migration

# Seed admin mặc định
npx tsx prisma/seed.ts
```

---

## 6. Build & test local

```bash
npm run build        # BẮT BUỘC pass, 0 lỗi TypeScript
npm start            # chạy thử, Ctrl+C để dừng
# Mở http://localhost:3000 — test đăng nhập
```

---

## 7. Chạy nền bằng systemd

### 7.1. Tạo service file

```bash
sudo nano /etc/systemd/system/thipcsl.service
```

```ini
[Unit]
Description=THIPCSL Exam System (Next.js)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=thipcsl
Group=thipcsl
WorkingDirectory=/opt/thipcsl/thipcsl
Environment=NODE_ENV=production
EnvironmentFile=/opt/thipcsl/thipcsl/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> 📌 Kiểm tra đường dẫn npm: `which npm`. Nếu path khác, dùng:
> `ExecStart=/usr/bin/node /opt/thipcsl/thipcsl/node_modules/.bin/next start`

### 7.2. Kích hoạt & kiểm tra

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now thipcsl
sudo systemctl status thipcsl
sudo journalctl -u thipcsl -f
```

---

## 8. Cấu hình Nginx (reverse proxy + HTTPS)

### 8.1. Cài Nginx

```bash
sudo apt-get install -y nginx
```

### 8.2. Reverse proxy

```bash
sudo nano /etc/nginx/sites-available/thipcsl
```

```nginx
server {
    listen 80;
    server_name exam.example.com;   # đổi thành domain/IP

    # Chặn tải file nhạy cảm
    location ~* \.(env|md|log|ts)$ { deny all; }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # Giới hạn upload (import Excel)
    client_max_body_size 20M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/thipcsl /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

### 8.3. HTTPS miễn phí (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d exam.example.com
```

---

## 9. Backup & Restore

### 9.1. Backup tự động (script có sẵn)

```bash
cd /opt/thipcsl/thipcsl
chmod +x backup-database-deploy.sh
./backup-database-deploy.sh
```
→ Tạo `exam_system_<TIMESTAMP>.backup` + `.sql` trong `backups/`.

### 9.2. Cron daily

```bash
crontab -e
```
```cron
0 2 * * * cd /opt/thipcsl/thipcsl && ./backup-database-deploy.sh >> backups/backup.log 2>&1
```

### 9.3. Restore

```bash
# Custom format
pg_restore -U exam_admin -h localhost -d exam_system -v backups/<FILE>.backup
# SQL
psql -U exam_admin -d exam_system -f backups/<FILE>.sql
```

### 9.4. Chuyển database từ máy cũ (Windows) sang máy Linux mới 🔁

> Khi setup máy Linux mới, DB thường đang trống (seed mới tạo chỉ có `admin`). Muốn mang **toàn bộ dữ liệu thật** từ máy Windows cũ sang, dùng `pg_dump` → chuyển file → `pg_restore`. **Không qua git.**

> 🔑 **Quy tắc version rất quan trọng:** file backup `.bak` (Custom, nén) **chỉ restore được nếu PostgreSQL hai máy CÙNG BẢN**. VD Windows cài **18**, Linux cài **16** → restore `.bak` lỗi `unsupported version (1.16) in file header`. Trong khi file `.sql` (Plain, text) restore được trên **mọi bản**. ⇒ **Luôn dump cả 2 file**, và nếu 2 bản không khớp thì **dùng file `.sql`**.
> - Kiểm tra bản Linux: `psql --version` / `pg_restore --version`.

#### Bước 1 — Tạo dump trên máy Windows (máy nguồn, có PostgreSQL chạy)

> ⚠️ **Khi dùng PowerShell** (mặc định trong Windows Terminal): Gọi chương trình có đường dẫn cách nhau phải đặt dấu `&` đầu, và đặt mật khẩu bằng `$env:` — **không dùng `set`** (cú pháp củ của cmd sẽ báo `Unexpected token`).

```powershell
$env:PGPASSWORD="exam_admin_2026"
& "C:\Program Files\PostgreSQL\18\bin\pg_dump" -U exam_admin -h localhost -p 5432 -d exam_system -F c -b -v -f D:\exam_system.bak
& "C:\Program Files\PostgreSQL\18\bin\pg_dump" -U exam_admin -h localhost -p 5432 -d exam_system -f D:\exam_system.sql
```
- `.bak` (Custom, nén) → restore nhanh khi hai máy cùng bản.
- `.sql` (Plain, text) → tương thích mọi bản, dễ đọc, dễ sửa. **Khuyến nghị dùng khi version khác nhau.**
- Đường dẫn thư mục PostgreSQL có thể khác (18 → 17, 16...) tùy bản cài: kiểm tra bằng `dir "C:\Program Files\PostgreSQL"`. Đổi `D:\` thành USB nếu cần chuyển vật lý.

#### Bước 2 — Chuyển file sang máy Linux

Nếu 2 máy thông mạng, trên máy Linux:
```bash
scp pcsl@<IP_MÁY_WINDOWS>:D:/path/to/exam_system.sql /tmp/
```
Hoặc dùng USB / WinSCP / FileZilla / Google Drive... theo điều kiện mạng. Đưa ít nhất file `.sql` (và cả `.bak` nếu cùng bản) vào `/tmp/` (hoặc thư mục bạn thích).

#### Bước 3 — Restore trên máy Linux (đảm bảo app không đang chạy)

```bash
# 0. Dừng app nếu đang chạy
# (nếu dùng npm start: Ctrl+C; nếu systemd: sudo systemctl stop thipcsl)

# 1. Tạo lại database sạch (xóa DB trống đang có)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS exam_system WITH (FORCE);"
sudo -u postgres psql -c "CREATE DATABASE exam_system OWNER exam_admin;"

# 2. Vào thư mục chứa file dump
cd /tmp
```

**Cách A — Cùng bản PostgreSQL (dùng `pg_restore` cho `.bak`):**
```bash
pg_restore -U exam_admin -h localhost -d exam_system --no-owner --role=exam_admin -v exam_system.bak
```

**Cách B — Version khác nhau (dùng `psql` cho `.sql`, khuyên dùng):**
```bash
# Trước khi restore, nếu file .sql vừa dump từ bản 18 mà máy Linux là 16,
# phải comment bỏ tham số lạ "transaction_timeout" (PostgreSQL 16 chưa có):
sed -i 's/^SET transaction_timeout = 0;/-- SET transaction_timeout (PostgreSQL 16 khong ho tro);/' exam_system.sql

# Restore:
psql -U exam_admin -h localhost -d exam_system -v ON_ERROR_STOP=1 -f exam_system.sql
```
- `-v ON_ERROR_STOP=1` → dừng ngay khi gặp lỗi, dễ phát hiện.
- Lỗi cuối `ERROR: permission denied to change default privileges` ở câu `ALTER DEFAULT PRIVILEGES` là **vô hại** — user `exam_admin` không phải superuser nên chỉ không đặt được quyền mặc định; toàn bộ dữ liệu + quyền object hiện tại đã restore đầy đủ.

#### Bước 4 — Xác nhận dữ liệu đã vào

```bash
sudo -u postgres psql -d exam_system -c "SELECT username, role FROM \"User\" ORDER BY username LIMIT 10;"
```
→ Phải thấy danh sách user thật (không còn `0 rows`).

#### Bước 5 — Đồng bộ schema nếu DB cũ hơn code (quan trọng nếu data từ máy Windows cũ)

> Nếu DB máy Windows **cũ hơn** code trên Linux, app sẽ báo lỗi đăng nhập như:
> `Invalid prisma.user.findUnique() invocation: The column User.permissionMode does not exist in the current database` (mã `P2022`).
> Cách sửa: **giữ nguyên dữ liệu**, chỉ đồng bộ schema cho khớp code bằng Prisma:
```bash
cd /opt/thipcsl/thipcsl
npx prisma generate
npx prisma db push      # chỉ THÊM cột/thuộc tính/bảng còn thiếu, không xóa dữ liệu
npx tsx prisma/seed.ts  # upsert: nạp permissions mới, KHÔNG đổi password admin cũ
npm run build
```

#### Bước 6 — Lỗi đăng nhập treo khi truy cập HTTP (quan trọng khi test local)

> Khi chạy `NODE_ENV=production` mà vào bằng `http://localhost:3000` (không HTTPS), login thành công nhưng bị **quay vòng về trang đăng nhập** ("treo"). Nguyên nhân: cookie token thường đặt cờ `secure: NODE_ENV==='production'` → cookie `Secure` **không được trình duyệt gửi lại qua HTTP**, nên middleware không thấy token → redirect vô hạn.
> Cách xử lý: làm Secure theo giao thức thực (Nginx đã set `X-Forwarded-Proto`), xem [login/route.ts](thipcsl/app/api/auth/login/route.ts).

> ⚠️ Lưu ý chung:
> - Nếu máy mới đã có data khác cần giữ → **đừng** DROP, thay bằng tạo DB mới tên khác (vd `exam_system_new`) rồi đổi `DATABASE_URL`.
> - `npx prisma db push` ở đây **an toàn** vì chỉ cần các thay đổi không-phá-dữ-liệu (thêm cột có default, thêm bảng). Nếu nó đòi reset thì dừng và xử lý thủ công.
> - Sau restore, khởi động lại app và **đăng nhập lần nữa** để xác nhận phân quyền/phiên hoạt động.

---

## 10. Cập nhật bản mới (release)

```bash
cd /opt/thipcsl/thipcsl && ./backup-database-deploy.sh   # 1. Backup

sudo -u thipcsl git pull                                  # 2. Pull code
npm install                                               # 3. De ps
npx prisma migrate deploy                                 # 4. Schema (nếu có)
npm run build                                             # 5. Build (lỗi = dừng)
sudo systemctl restart thipcsl                            # 6. Restart
```

---

## 11. Kiểm tra & Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân & Cách xử lý |
|:--|:--|
| Không kết nối được DB | `systemctl status postgresql`; kiểm tra `.env`; `psql -U exam_admin -h localhost -d exam_system` |
| `Permission denied to create database` | User thiếu `CREATEDB` → `ALTER USER exam_admin WITH CREATEDB;` hoặc dùng `prisma db push` |
| Port 3000 đã bị chiếm | Đổi port: `next start -p 3001` hoặc kill process cũ |
| Upload Excel bị chặn | Tăng `client_max_body_size` trong Nginx |
| 502 Bad Gateway | App chưa chạy → `sudo journalctl -u thipcsl -f` |
| Quên mật khẩu admin | Chạy lại `npx tsx prisma/seed.ts` |

---

## 11.1 Ghi chú triển khai thực tế (đã kiểm chứng 2026-08-14)

> Những ghi chú này dựa trên lần triển khai thật trên máy Ubuntu (`pcsl@pcsl-p10-laptop-02`, Node v20.20.2, npm 10.8.2). Bổ sung để đoán trước các lỗi hay gặp.

### Môi trường đã xác nhận hoạt động
- Node.js **v20.20.2**, npm **10.8.2** ✅
- `npm install` → **443 packages** (~39s), 0 lỗi. Có cảnh báo `13 vulnerabilities (1 low, 2 moderate, 10 high)` — **KHÔNG chạy `npm audit fix --force`** (có thể phá phiên bản Next.js/Prisist hiện tại). Ghi nhận, xử lý riêng sau.
- `npm run build` → **`✓ Compiled successfully` trong ~9s**, TypeScript 0 lỗi. ✅
- Cảnh báo `The "middleware" file convention is deprecated. Please use "proxy" instead.` — **không phải lỗi**, app vẫn chạy. Next.js 16 đổi tên `middleware.ts` → `proxy.ts`. Để nguyên được hoặc đổi sau.
- App chạy mặc định port **3000** (`http://localhost:3000`).

### Các lỗi thường gặp khi deploy thật & cách xử lý

| Lỗi | Nguyên nhân | Cách sửa |
|:--|:--|:--|
| `cd /opt/thipcsl/thipcsl: Permission denied` | Thư mục quyền `750`, user khác không vào được | `sudo chmod -R o+rX /opt/thipcsl` |
| `EACCES: permission denied, mkdir '.../.next'` | `npm run build` chạy bằng user không phải chủ sở hữu app | Chạy bằng user app: `sudo -u thipcsl npm run build` |
| `cd ~/opt/thipcsl` báo No such file | Dấu `~` trỏ về home user, **không phải `/opt`** | Dùng đường dẫn tuyệt đối `cd /opt/thipcsl/thipcsl` |
| `ERR_MODULE_NOT_FOUND .../prisma/seed.ts` | Sau `sudo -u thipcsl -i`, shell nằm ở `/opt/thipcsl` (home), chưa vào thư mục app | Gõ `cd /opt/thipcsl/thipcsl` trước |
| `sudo -u thipcsl whoami` ra `thipcsl` nhưng không "vào" user được | `thipcsl` là system account (shell `/usr/sbin/nologin`) — **không cần đăng nhập vào**, chỉ dùng `sudo -u thipcsl <lệnh>` hoặc `sudo -u thipcsl -i` | Dùng `sudo -u thipcsl -i` để mở phiên, hoặc đổi shell `sudo usermod -s /bin/bash thipcsl` |
| Đăng nhập `/api/auth/login` báo `401 Sai tai khoan hoac mat khau` với user `admin/admin` | DB trống chưa seed, HOẶC user `admin` đã tồn tại với password khác (seed dùng `upsert update:{}` nên **không đổi password** cũ) | Chạy `npx tsx prisma/seed.ts` (DB trống mới có admin). Nếu có data cũ: đặt lại mật khẩu thủ công |

### Luồng lệnh chuẩn đã chạy thành công (tóm tắt)
```bash
# 1. Phân quyền thư mục
sudo chmod -R o+rX /opt/thipcsl

# 2. Cài dependencies + build (bằng user app)
cd /opt/thipcsl/thipcsl
sudo -u thipcsl npm install
sudo -u thipcsl -i          # bước tới shell thipcsl
cd /opt/thipcsl/thipcsl     # THIẾT YẾU — shell thipcsl bắt đầu ở home /opt/thipcsl
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts      # tạo 15 permissions + admin (admin/admin)
npm run build

# 3. Chạy app
sudo -u thipcsl npm start   # port 3000

# 4. Test đăng nhập
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### 🔴 Bảo mật mặc định cần đổi
- Tài khoản admin mặc định: **`admin` / `admin`** — rất dễ đoán. **PHẢI đổi ngay** trước khi đưa vào vận hành.
- Database: user `exam_admin` / `exam_admin_2026` — đổi mật khẩu DB.
- Xem [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) Phần A & B trước khi mở ra mạng.

---

## 12. 🔐 Checklist bảo mật trước vận hành

- [ ] Đổi `JWT_SECRET` (không dùng mặc định)
- [ ] Đổi mật khẩu `exam_admin` trong PostgreSQL
- [ ] Không dùng user `postgres` làm user app
- [ ] Bật HTTPS (Let's Encrypt)
- [ ] Backup tự động qua cron hoạt động + test khôi phục
- [ ] Tường lửa chỉ mở 80/443 + SSH
- [ ] Test đăng nhập ADMIN / PROCTOR / CANDIDATE
- [ ] Xem chi tiết tại [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)