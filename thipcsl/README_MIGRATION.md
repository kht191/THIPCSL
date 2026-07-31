# 📦 Migration Package - SQLite to PostgreSQL

## 📋 Tổng Quan

Package này chứa tất cả các công cụ và hướng dẫn để migrate database từ SQLite sang PostgreSQL.

**Trạng thái:** ✅ Đã chuẩn bị xong, sẵn sàng thực hiện migration

---

## 📁 Files Đã Tạo

### 🔧 Scripts Thực Thi

| File | Mô Tả | Cách Dùng |
|------|-------|-----------|
| `backup-sqlite.bat` | Backup SQLite database | `.\backup-sqlite.bat` |
| `setup-postgres.bat` | Setup PostgreSQL database | `.\setup-postgres.bat [password]` |
| `setup-postgres.sql` | SQL script tạo database | (Tự động chạy bởi setup-postgres.bat) |
| `test-postgres.bat` | Test kết nối PostgreSQL | `.\test-postgres.bat [password]` |

### 📜 TypeScript Scripts

| File | Mô Tả | Cách Dùng |
|------|-------|-----------|
| `scripts/export-sqlite-data.ts` | Export data từ SQLite | `npx tsx scripts/export-sqlite-data.ts` |
| `scripts/import-postgresql-data.ts` | Import data vào PostgreSQL | `npx tsx scripts/import-postgresql-data.ts` |
| `verify-migration.ts` | Verify migration thành công | `npx tsx verify-migration.ts` |
| `test-prisma-connection.ts` | Test Prisma connection | `npx tsx test-prisma-connection.ts` |

### 📚 Documentation

| File | Mô Tả | Đọc Khi Nào |
|------|-------|-------------|
| `MIGRATION_QUICKSTART.md` | Quick start guide | ⭐ Đọc đầu tiên |
| `MIGRATION_STEPS.md` | Chi tiết từng bước | Khi cần hướng dẫn chi tiết |
| `MIGRATION_PLAN_POSTGRESQL.md` | Kế hoạch tổng thể | Khi cần hiểu tổng quan |
| `README_MIGRATION.md` | File này | Tổng quan về package |

### ⚙️ Configuration Files

| File | Thay Đổi | Ghi Chú |
|------|----------|---------|
| `prisma/schema.prisma` | ✅ Đã update | SQLite → PostgreSQL |
| `.env` | ⚠️ Cần update | Thay DATABASE_URL |

---

## 🚀 Bắt Đầu Nhanh

### Option 1: Quick Start (Khuyến Nghị)

Nếu bạn muốn làm nhanh và đã biết cơ bản:

```powershell
# Đọc file này
cat MIGRATION_QUICKSTART.md

# Làm theo 5 bước trong đó
```

### Option 2: Step by Step (An Toàn)

Nếu bạn muốn hiểu rõ từng bước:

```powershell
# Đọc file này
cat MIGRATION_STEPS.md

# Làm theo từng bước chi tiết
```

### Option 3: Understand First (Học Hỏi)

Nếu bạn muốn hiểu tại sao và làm thế nào:

```powershell
# Đọc kế hoạch tổng thể
cat MIGRATION_PLAN_POSTGRESQL.md

# Sau đó làm theo MIGRATION_STEPS.md
```

---

## 📊 Workflow Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│                    MIGRATION WORKFLOW                        │
└─────────────────────────────────────────────────────────────┘

1️⃣ BACKUP
   ├─ backup-sqlite.bat
   └─ Tạo file backup trong backups/

2️⃣ EXPORT
   ├─ scripts/export-sqlite-data.ts
   └─ Tạo JSON file trong backups/

3️⃣ SETUP POSTGRESQL
   ├─ setup-postgres.bat
   └─ Tạo database + user

4️⃣ UPDATE CONFIG
   ├─ .env (DATABASE_URL)
   └─ prisma/schema.prisma (đã update sẵn)

5️⃣ MIGRATE SCHEMA
   ├─ npx prisma generate
   └─ npx prisma migrate dev

6️⃣ IMPORT DATA
   ├─ scripts/import-postgresql-data.ts
   └─ Import từ JSON vào PostgreSQL

7️⃣ VERIFY
   ├─ verify-migration.ts
   └─ Test tất cả chức năng

8️⃣ TEST APP
   ├─ npm run dev
   └─ Test thủ công các chức năng
```

---

## ✅ Checklist Trước Khi Bắt Đầu

- [ ] PostgreSQL 18 đã được cài đặt
- [ ] Biết password của user `postgres`
- [ ] Đã đọc ít nhất 1 trong 3 file hướng dẫn
- [ ] Có backup dữ liệu quan trọng
- [ ] Có thời gian 30-60 phút
- [ ] Đã commit code hiện tại vào git (để rollback nếu cần)

---

## 🎯 Các Bước Chính (Tóm Tắt)

### Bước 1: Backup (2 phút)
```powershell
.\backup-sqlite.bat
npx tsx scripts/export-sqlite-data.ts
```

### Bước 2: Setup PostgreSQL (5 phút)
```powershell
.\setup-postgres.bat YOUR_POSTGRES_PASSWORD
```

### Bước 3: Update Config (2 phút)
```env
# .env
DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"
```

### Bước 4: Migrate Schema (3 phút)
```powershell
npx prisma generate
npx prisma migrate dev --name init_postgresql
```

### Bước 5: Import Data (5 phút)
```powershell
npx tsx scripts/import-postgresql-data.ts
```

### Bước 6: Verify (5 phút)
```powershell
npx tsx verify-migration.ts
npm run dev
```

**Tổng thời gian:** ~20-30 phút

---

## 🔍 Verify Thành Công

Sau khi chạy `verify-migration.ts`, bạn sẽ thấy:

```
✅ Migration verification completed!
========================================

📊 Summary:
   Database:  PostgreSQL
   Tables:    6
   Indexes:   20+
   Records:   XXX

✅ Your database is ready for production!
```

---

## 🔄 Rollback Plan

Nếu có vấn đề, rollback trong 5 phút:

```powershell
# 1. Restore .env
# DATABASE_URL="file:./dev.db"

# 2. Restore schema
git checkout HEAD -- prisma/schema.prisma

# 3. Generate
npx prisma generate

# 4. Run
npm run dev
```

---

## 📈 Lợi Ích Sau Migration

### Performance
- ✅ **100+ concurrent users** (trước: ~10 users)
- ✅ **No database locks** (trước: lock khi nhiều writes)
- ✅ **Faster queries** với indexes

### Reliability
- ✅ **ACID compliance** đầy đủ
- ✅ **Row-level locking** thay vì database-level
- ✅ **Crash recovery** tự động

### Scalability
- ✅ **Connection pooling** support
- ✅ **Replication** support
- ✅ **Cloud deployment** ready

### Features
- ✅ **Full-text search**
- ✅ **JSON queries**
- ✅ **Advanced indexes** (GIN, GiST, etc.)
- ✅ **Stored procedures**

---

## 📊 So Sánh Trước/Sau

| Metric | SQLite (Trước) | PostgreSQL (Sau) |
|--------|----------------|------------------|
| **Concurrent Writes** | 1 | Unlimited (MVCC) |
| **Max Users** | ~10 | 100+ |
| **Locking** | Database-level | Row-level |
| **Backup** | Manual copy | pg_dump + auto |
| **Replication** | ❌ | ✅ |
| **Production Ready** | ❌ | ✅ |
| **Cloud Support** | Limited | Full |

---

## 🛠️ Troubleshooting

### Lỗi thường gặp:

1. **"password authentication failed"**
   - Kiểm tra password trong setup-postgres.bat
   - Reset password trong pgAdmin

2. **"database does not exist"**
   - Chạy lại setup-postgres.bat

3. **"relation does not exist"**
   - Chạy lại `npx prisma migrate dev`

4. **Import failed**
   - Kiểm tra export file có tồn tại không
   - Chạy lại import script

5. **Connection timeout**
   - Kiểm tra PostgreSQL service đang chạy
   - Kiểm tra firewall

---

## 📞 Support

### Tài liệu tham khảo:
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Migration Best Practices](https://www.prisma.io/docs/guides/migrate)

### Files hỗ trợ:
- `MIGRATION_STEPS.md` - Troubleshooting section
- `MIGRATION_PLAN_POSTGRESQL.md` - Detailed plan
- PostgreSQL logs: `C:\Program Files\PostgreSQL\18\data\log\`

---

## 🎯 Next Steps Sau Migration

### Ngay lập tức:
1. ✅ Test tất cả chức năng
2. ✅ Monitor performance
3. ✅ Setup backup schedule

### Trong tuần:
1. 📊 Analyze query performance
2. 🔍 Optimize slow queries
3. 📈 Monitor resource usage

### Dài hạn:
1. ☁️ Cân nhắc cloud database (Supabase, Railway, AWS RDS)
2. 🔐 Setup SSL connection
3. 📊 Setup monitoring (Grafana, pgAdmin)
4. 🔄 Setup replication (nếu cần high availability)

---

## 📝 Notes

### Thay đổi quan trọng trong schema:
- ✅ UUID type: `@db.Uuid`
- ✅ Text fields: `@db.Text`
- ✅ Float precision: `@db.DoublePrecision`
- ✅ Indexes: `@@index([field])`
- ✅ Cascade deletes: `onDelete: Cascade`

### Database credentials:
- **Database:** exam_system
- **User:** exam_admin
- **Password:** exam_admin_2026 (đổi trong production!)
- **Port:** 5432
- **Host:** localhost

### Backup location:
- SQLite backups: `backups/dev_before_migration_*.db`
- JSON exports: `backups/sqlite-export-*.json`

---

## ✅ Kết Luận

Package này cung cấp:
- ✅ **10 scripts** tự động hóa migration
- ✅ **4 tài liệu** hướng dẫn chi tiết
- ✅ **Backup & Rollback** plan
- ✅ **Verification** tools
- ✅ **Troubleshooting** guide

**Bạn đã sẵn sàng để migrate! 🚀**

Bắt đầu với:
```powershell
cat MIGRATION_QUICKSTART.md
```

Hoặc nếu muốn chi tiết hơn:
```powershell
cat MIGRATION_STEPS.md
```

**Good luck! 🎉**
