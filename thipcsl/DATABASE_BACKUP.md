# Database Backup & Restore Guide

## 📦 Backup Database

Tạo bản sao lưu database hiện tại:

```bash
npm run backup
```

Backup sẽ được lưu trong thư mục `backups/` với tên file có timestamp.

**Ví dụ:**
- `dev_2026-01-29_10-06-46.db`
- `prisma_dev_2026-01-29_10-06-46.db`

---

## 🔄 Restore Database

Khôi phục database từ backup:

```bash
npm run restore
```

Script sẽ:
1. Hiển thị danh sách các backup có sẵn
2. Cho phép bạn chọn backup muốn restore
3. Xác nhận trước khi ghi đè
4. Restore database

**Lưu ý:** Sau khi restore, cần restart server!

---

## 🔧 Safe Migration

Chạy migration an toàn với auto-backup:

```bash
npm run migrate
```

Script sẽ:
1. **Tự động tạo backup** trước khi migrate
2. Chạy `prisma db push` (không reset data)
3. Nếu thất bại → Có thể restore từ backup

**⚠️ QUAN TRỌNG:**
- **LUÔN dùng `npm run migrate`** thay vì `npx prisma migrate dev`
- `prisma migrate dev` có thể **XÓA TOÀN BỘ DỮ LIỆU** với SQLite!

---

## 📋 Best Practices

### 1. Backup thường xuyên
```bash
# Backup trước khi thay đổi quan trọng
npm run backup
```

### 2. Backup trước khi deploy
```bash
npm run backup
npm run build
```

### 3. Backup định kỳ
Tạo backup hàng ngày/tuần để đảm bảo an toàn dữ liệu.

### 4. Kiểm tra backup
```bash
# Liệt kê các backup
ls backups/

# Hoặc dùng restore để xem danh sách
npm run restore
```

---

## 🚨 Emergency Recovery

Nếu mất dữ liệu:

1. **Dừng server** (Ctrl+C)
2. **Restore từ backup:**
   ```bash
   npm run restore
   ```
3. **Chọn backup gần nhất**
4. **Restart server:**
   ```bash
   npm run dev
   ```

---

## 📁 Backup Location

Tất cả backup được lưu trong:
```
./backups/
├── dev_2026-01-29_10-06-46.db
├── prisma_dev_2026-01-29_10-06-46.db
├── pre_migrate_2026-01-29_11-30-00.db
└── ...
```

**Lưu ý:** 
- Thêm `backups/` vào `.gitignore` để không commit backup lên Git
- Nên copy backup ra ngoài thư mục project để bảo vệ tốt hơn

---

## 🔐 Production Recommendations

Cho môi trường production:

1. **Chuyển sang PostgreSQL/MySQL** thay vì SQLite
2. **Sử dụng automated backup** (cron job, cloud backup)
3. **Lưu backup ở nhiều nơi** (local, cloud, external drive)
4. **Test restore định kỳ** để đảm bảo backup hoạt động

---

## ❓ Troubleshooting

### Lỗi: "No backup files found"
→ Chưa có backup nào. Chạy `npm run backup` trước.

### Lỗi: "Permission denied"
→ Đóng server trước khi restore: Ctrl+C

### Database vẫn cũ sau restore
→ Restart server: `npm run dev`

---

## 📞 Support

Nếu gặp vấn đề, liên hệ admin hoặc tạo issue.
