# Hướng Dẫn Deploy Lên Máy Mới

## 📋 Yêu cầu hệ thống

### **Phần mềm cần cài:**
1. ✅ **Node.js** (v18 trở lên) - https://nodejs.org/
2. ✅ **Git** (optional, để clone code) - https://git-scm.com/

### **Kiểm tra:**
```powershell
node --version  # v18.x.x hoặc cao hơn
npm --version   # 9.x.x hoặc cao hơn
```

---

## 🚀 Cách 1: Copy thư mục (Khuyên dùng)

### **Bước 1: Copy toàn bộ thư mục**

Copy thư mục `THIPCSL` sang máy mới, bao gồm:
```
THIPCSL/
├── thipcsl/              ← Copy thư mục này
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── prisma/
│   ├── public/
│   ├── node_modules/     ← Có thể bỏ qua (sẽ cài lại)
│   ├── .next/            ← Có thể bỏ qua (sẽ build lại)
│   ├── package.json
│   ├── prisma/dev.db     ← QUAN TRỌNG: Database
│   └── ...
```

**Lưu ý:**
- ✅ **BẮT BUỘC copy:** `prisma/dev.db` (database)
- ⚠️ **Có thể bỏ qua:** `node_modules/`, `.next/` (sẽ cài/build lại)
- ✅ **Nên copy:** `.env` (nếu có)

---

### **Bước 2: Cài dependencies**

Mở PowerShell/Terminal tại thư mục project:

```powershell
cd path\to\thipcsl

# Cài tất cả packages
npm install

# Hoặc dùng npm ci (nhanh hơn, dùng package-lock.json)
npm ci
```

**Thời gian:** ~2-5 phút (tùy tốc độ mạng)

---

### **Bước 3: Setup database (nếu cần)**

#### **Nếu đã copy `prisma/dev.db`:**
```powershell
# Không cần làm gì, database đã sẵn sàng! ✅
```

#### **Nếu KHÔNG có `dev.db` (database mới):**
```powershell
# Generate Prisma Client
npx prisma generate

# Tạo database mới
npx prisma db push

# (Optional) Seed dữ liệu mẫu
node prisma/seed.js
```

---

### **Bước 4: Chạy ứng dụng**

#### **Development mode:**
```powershell
npm run dev
```

Mở trình duyệt: http://localhost:3000

#### **Production mode:**
```powershell
# Build
npm run build

# Start
npm start
```

---

## 📦 Cách 2: Clone từ Git (Nếu có Git repo)

```powershell
# Clone repository
git clone <repository-url>
cd thipcsl

# Cài dependencies
npm install

# Copy database từ máy cũ
# Hoặc tạo database mới
npx prisma db push

# Chạy
npm run dev
```

---

## 🔧 Troubleshooting

### **Lỗi: "Cannot find module"**

**Nguyên nhân:** Chưa cài dependencies

**Giải pháp:**
```powershell
npm install
```

---

### **Lỗi: "Prisma Client not generated"**

**Nguyên nhân:** Chưa generate Prisma Client

**Giải pháp:**
```powershell
npx prisma generate
```

---

### **Lỗi: "Database not found"**

**Nguyên nhân:** Thiếu file `prisma/dev.db`

**Giải pháp:**
```powershell
# Cách 1: Copy dev.db từ máy cũ
# Cách 2: Tạo database mới
npx prisma db push
```

---

### **Lỗi: "Port 3000 already in use"**

**Nguyên nhân:** Port 3000 đã được dùng

**Giải pháp:**
```powershell
# Cách 1: Đổi port
$env:PORT=3001; npm run dev

# Cách 2: Kill process đang dùng port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

### **Lỗi: "Module not found: Can't resolve 'xyz'"**

**Nguyên nhân:** Thiếu package hoặc version không khớp

**Giải pháp:**
```powershell
# Xóa node_modules và cài lại
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

## 📝 Checklist Deploy

### **Trước khi copy:**
- [ ] Backup database: `prisma/dev.db`
- [ ] Backup `.env` (nếu có)
- [ ] Backup `package.json` và `package-lock.json`
- [ ] (Optional) Export danh sách packages: `npm list --depth=0 > packages.txt`

### **Trên máy mới:**
- [ ] Cài Node.js (v18+)
- [ ] Copy thư mục project
- [ ] Chạy `npm install`
- [ ] Kiểm tra database: `prisma/dev.db` có tồn tại
- [ ] (Nếu cần) Chạy `npx prisma generate`
- [ ] Chạy `npm run dev`
- [ ] Test: Mở http://localhost:3000
- [ ] Login với tài khoản admin
- [ ] Kiểm tra các chức năng chính

---

## 🎯 Files quan trọng cần copy

### **BẮT BUỘC:**
```
✅ package.json
✅ package-lock.json
✅ prisma/schema.prisma
✅ prisma/dev.db          ← DATABASE (QUAN TRỌNG NHẤT!)
✅ app/                   ← Source code
✅ components/
✅ lib/
✅ public/
✅ next.config.js
✅ tsconfig.json
```

### **OPTIONAL (có thể bỏ qua):**
```
⚠️ node_modules/         ← Sẽ cài lại bằng npm install
⚠️ .next/                ← Sẽ build lại
⚠️ .git/                 ← Chỉ cần nếu dùng Git
```

### **NÊN COPY (nếu có):**
```
✅ .env                  ← Environment variables
✅ .env.local
✅ README.md
✅ *.md                  ← Tài liệu
```

---

## 🔐 Environment Variables

Nếu có file `.env`, đảm bảo copy sang máy mới:

```env
# .env
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-key"
NODE_ENV="development"
```

**Lưu ý:** Nếu không có `.env`, ứng dụng vẫn chạy được với config mặc định.

---

## 🚀 Deploy lên Production Server

### **Bước 1: Build**
```powershell
npm run build
```

### **Bước 2: Start**
```powershell
npm start
```

### **Bước 3: (Optional) Dùng PM2 để chạy background**
```powershell
# Cài PM2
npm install -g pm2

# Start với PM2
pm2 start npm --name "exam-system" -- start

# Auto restart khi reboot
pm2 startup
pm2 save

# Xem logs
pm2 logs exam-system

# Restart
pm2 restart exam-system

# Stop
pm2 stop exam-system
```

---

## 📊 So sánh các cách deploy

| Cách | Ưu điểm | Nhược điểm | Thời gian |
|------|---------|------------|-----------|
| **Copy thư mục** | ✅ Nhanh, đơn giản<br>✅ Giữ nguyên database | ❌ Dung lượng lớn (nếu copy `node_modules`) | 5-10 phút |
| **Copy + npm install** | ✅ Dung lượng nhỏ<br>✅ Clean install | ⚠️ Cần internet<br>⚠️ Lâu hơn | 10-15 phút |
| **Git clone** | ✅ Version control<br>✅ Dễ update | ❌ Cần setup Git<br>❌ Mất database | 15-20 phút |

**Khuyên dùng:** Copy thư mục + npm install (cách 1)

---

## 🎓 Tips

### **1. Tăng tốc npm install:**
```powershell
# Dùng npm ci thay vì npm install (nhanh hơn)
npm ci

# Hoặc dùng pnpm (nhanh hơn npm)
npm install -g pnpm
pnpm install
```

### **2. Backup database định kỳ:**
```powershell
# Tạo folder backups
New-Item -ItemType Directory -Force -Path prisma\backups

# Backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "prisma\dev.db" "prisma\backups\dev_${timestamp}.db"
```

### **3. Kiểm tra dung lượng:**
```powershell
# Xem dung lượng thư mục
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum

# Xem dung lượng node_modules
Get-ChildItem node_modules -Recurse | Measure-Object -Property Length -Sum
```

---

## ✅ Tóm tắt

**Để deploy lên máy mới:**

```powershell
# 1. Copy thư mục project (bao gồm prisma/dev.db)
# 2. Cài Node.js
# 3. Mở terminal tại thư mục project
cd path\to\thipcsl

# 4. Cài dependencies
npm install

# 5. Chạy
npm run dev

# 6. Mở http://localhost:3000
```

**Chỉ cần 5 phút!** ⚡

---

## 🎉 Kết luận

**Đúng rồi!** Copy thư mục + cài Node.js + `npm install` là đủ! 

**Quan trọng nhất:** Đừng quên copy `prisma/dev.db` (database)! 🗄️

Chúc bạn deploy thành công! 🚀
