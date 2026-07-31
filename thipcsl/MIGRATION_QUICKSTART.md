# Quick Start: Migration SQLite → PostgreSQL

## 🚀 Nhanh Chóng (5 Lệnh)

Nếu bạn đã cài PostgreSQL và biết password, chỉ cần chạy 5 lệnh sau:

```powershell
# 1. Backup SQLite
.\backup-sqlite.bat

# 2. Export data
npx tsx scripts/export-sqlite-data.ts

# 3. Setup PostgreSQL (thay YOUR_PASSWORD)
.\setup-postgres.bat YOUR_PASSWORD

# 4. Update .env
# Sửa DATABASE_URL="postgresql://exam_admin:exam_admin_2026@localhost:5432/exam_system"

# 5. Migrate và import
npx prisma generate
npx prisma migrate dev --name init_postgresql
npx tsx scripts/import-postgresql-data.ts
```

## ✅ Verify

```powershell
npx tsx verify-migration.ts
npm run dev
```

## 📚 Chi Tiết

Xem file `MIGRATION_STEPS.md` để có hướng dẫn chi tiết từng bước.

## 🔄 Rollback

Nếu có vấn đề:

```powershell
# Restore .env
# DATABASE_URL="file:./dev.db"

# Restore schema
git checkout HEAD -- prisma/schema.prisma

# Generate
npx prisma generate

# Run
npm run dev
```

## ❓ Cần Giúp?

1. Xem `MIGRATION_STEPS.md` - Hướng dẫn chi tiết
2. Xem `MIGRATION_PLAN_POSTGRESQL.md` - Kế hoạch tổng thể
3. Check logs trong terminal
