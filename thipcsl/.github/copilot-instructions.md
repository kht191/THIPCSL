# Copilot Instructions for THIPCSL

## Project shape
- Next.js 16 App Router app for an online exam system.
- Main domains live under `app/admin`, `app/exam`, `app/practice`, `app/login`, and `app/api/*`.
- Prisma is the source of truth for data access; the schema is in `prisma/schema.prisma` and uses PostgreSQL.
- Shared server utilities live in `lib/`; reusable UI bits live in `components/`.

## Architecture to preserve
- Auth is cookie-based JWT: `app/api/auth/login/route.ts` sets `token`, `middleware.ts` enforces it, and `app/api/auth/me/route.ts` + `app/admin/layout.tsx` read it.
- Roles are `ADMIN`, `PROCTOR`, and `CANDIDATE`; `middleware.ts` allows `/admin` for admin/proctor and redirects proctors from `/admin` to `/admin/monitor`.
- Exam flow is stateful: `app/api/exam-runner/[id]/route.ts` creates or resumes `IN_PROGRESS` results, stores shuffled order in `Result.details`, and uses `sessionToken` to detect takeover/double-submit cases.
- Auto-submit logic is centralized in `lib/exam-helper.ts` and reused by monitor/statistics APIs.
- Several columns store JSON as text (`Exam.question_ids`, `Exam.allowed_users`, `Result.details`); parse before using and keep fallback handling.

## Data model patterns
- `User`, `Question`, `Topic`, `Exam`, `ExamSession`, and `Result` relations are defined in `prisma/schema.prisma`.
- `Topic` is hierarchical via `parentId`/`children`; `Question.topicId` is nullable and uses `onDelete: SetNull`.
- `ExamSession` is a many-to-many container for exams; statistics code derives expected candidates from linked exams and their `allowed_users`.

## UI and routing conventions
- Use App Router server components by default; add `'use client'` only for interactive pages like login, pagination, or role guards.
- Use Tailwind utility classes directly; UI copy is mostly Vietnamese and should stay consistent.
- `components/RoleGuard.tsx` is the client-side role gate pattern; `components/Pagination.tsx` is the pagination pattern.
- Admin layout and pages favor direct Prisma reads in server components, with API routes reserved for mutations and JSON endpoints.

## Workflow and commands
- Dev: `npm run dev`
- Build: `npm run build`
- Start prod: `npm run start`
- Lint: `npm run lint`
- Prisma client: `npx prisma generate`
- Safe DB change: `npm run migrate` (this backs up first and runs `prisma db push`)
- Avoid `prisma migrate dev` here; the repo docs warn it can reset data.

## Validation and debugging
- For targeted checks, use the standalone scripts in the repo with `npx tsx`, e.g. `verify-migration.ts`, `test-prisma-connection.ts`, `test-session-takeover.ts`, and `test-multiple-attempts.ts`.
- Database backup/restore is a first-class workflow: see `DATABASE_BACKUP.md` and the `backup-database-deploy.*` scripts.
- Maintenance mode is controlled by `MAINTENANCE_MODE=true` in `.env` and enforced in `middleware.ts`.

## When editing
- Preserve the auth, session, and attempt-limit rules unless explicitly changing those behaviors.
- If you touch login, admin access, or exam execution, check `lib/auth.ts`, `middleware.ts`, `app/api/exam-runner/[id]/route.ts`, and the matching admin pages together.
- If you change schema fields or JSON shapes, update the parsing code in APIs and helpers that read those fields.
