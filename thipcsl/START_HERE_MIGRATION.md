# 🚀 START HERE - Migration SQLite → PostgreSQL

## ⚡ Quick Start (5 Lệnh)

```powershell
.\backup-sqlite.bat
npx tsx scripts/export-sqlite-data.ts
.\setup-postgres.bat YOUR_POSTGRES_PASSWORD
# Sửa .env: DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"
npx prisma generate && npx prisma migrate dev --name init_postgresql && npx tsx scripts/import-postgresql-data.ts
```

## 📚 Hoặc Đọc Hướng Dẫn

| Bạn Muốn | Đọc File Này | Thời Gian |
|----------|--------------|-----------|
| **Làm nhanh** | [MIGRATION_QUICKSTART.md](MIGRATION_QUICKSTART.md) | 2 phút |
| **Chi tiết** | [MIGRATION_STEPS.md](MIGRATION_STEPS.md) | 10 phút |
| **Tổng quan** | [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md) | 5 phút |
| **Tất cả files** | [MIGRATION_INDEX.md](MIGRATION_INDEX.md) | 2 phút |

## ✅ Verify

```powershell
npx tsx verify-migration.ts
npm run dev
```

## 🔄 Rollback (Nếu Cần)

```powershell
# Restore .env: DATABASE_URL="file:./dev.db"
git checkout HEAD -- prisma/schema.prisma
npx prisma generate
npm run dev
```

---

**📦 Package:** 14 files mới + 1 file sửa  
**⏱️ Thời gian:** 30-60 phút  
**✅ Trạng thái:** Sẵn sàng thực hiện  

**Bắt đầu:** `cat MIGRATION_INDEX.md`
