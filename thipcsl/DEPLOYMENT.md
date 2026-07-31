# Hướng Dẫn Triển Khai Hệ Thống Thi Trực Tuyến (THIPCSL)

Tài liệu này hướng dẫn chi tiết cách chuyển mã nguồn và chạy ứng dụng trên máy chủ mới (Windows Server hoặc Linux).

## 1. Yêu cầu hệ thống (Prerequisites)

Trước khi bắt đầu, máy chủ cần được cài đặt các phần mềm sau:

*   **Node.js**: Phiên bản LTS (Long Term Support) mới nhất (khuyên dùng v18.x hoặc v20.x).
    *   Tải về tại: [https://nodejs.org/](https://nodejs.org/)
*   **Git** (Tùy chọn): Để tải mã nguồn về nếu dùng git.
    *   Tải về tại: [https://git-scm.com/](https://git-scm.com/)

## 2. Cài đặt ứng dụng

### Bước 1: Copy mã nguồn
Copy toàn bộ thư mục dự án `thipcsl` sang máy chủ mới.
*Lưu ý: Không cần copy thư mục `node_modules` và `.next` vì chúng ta sẽ cài đặt và build lại.*

### Bước 2: Cài đặt thư viện (Dependencies)
Mở Terminal (hoặc CMD/PowerShell trên Windows) tại thư mục dự án và chạy lệnh:

```bash
npm install
```

### Bước 3: Cấu hình biến môi trường
Tạo file `.env` ở thư mục gốc (nếu chưa có) và cấu hình các thông số cần thiết. Ví dụ:

```env
# Kết nối Database (SQLite file)
DATABASE_URL="file:./dev.db"

# Secret key cho JWT (đổi thành chuỗi ngẫu nhiên bảo mật)
JWT_SECRET="mat-khau-bi-mat-cua-ban"
```

### Bước 4: Khởi tạo Database
Nếu bạn muốn dùng database mới hoàn toàn:
```bash
npx prisma migrate deploy
```

*Nếu bạn muốn giữ lại dữ liệu cũ, hãy copy file `dev.db` từ máy cũ sang thư mục `prisma/` trên máy mới.*

### Bước 5: Build ứng dụng
Chạy lệnh sau để biên dịch mã nguồn cho môi trường production:

```bash
npm run build
```

## 3. Chạy ứng dụng

### Cách 1: Chạy trực tiếp (Test)
Để chạy thử nghiệm, dùng lệnh:
```bash
npm start
```
Ứng dụng sẽ chạy tại `http://localhost:3000`.

### Cách 2: Chạy bằng PM2 (Khuyên dùng cho Production)
PM2 giúp ứng dụng chạy ngầm và tự động khởi động lại nếu bị lỗi hoặc khi restart máy chủ.

1.  Cài đặt PM2:
    ```bash
    npm install -g pm2
    ```

2.  Khởi chạy ứng dụng:
    ```bash
    pm2 start npm --name "thipcsl" -- start
    ```

3.  Lưu cấu hình để tự khởi động cùng Windows/Linux:
    ```bash
    pm2 save
    pm2 startup
    ```
    *(Làm theo hướng dẫn hiển thị trên màn hình sau khi gõ lệnh `pm2 startup`)*

## 4. Một số lệnh hữu ích

*   Xem log lỗi: `pm2 logs thipcsl`
*   Khởi động lại ứng dụng: `pm2 restart thipcsl`
*   Dừng ứng dụng: `pm2 stop thipcsl`
