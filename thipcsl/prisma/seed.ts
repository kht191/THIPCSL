import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PERMISSION_DEFINITIONS = [
  { key: 'users.view',         name: 'Xem danh sách người dùng',    group: 'Người dùng' },
  { key: 'users.create',       name: 'Tạo người dùng mới',          group: 'Người dùng' },
  { key: 'users.edit',         name: 'Chỉnh sửa người dùng',        group: 'Người dùng' },
  { key: 'users.delete',       name: 'Xóa người dùng',              group: 'Người dùng' },
  { key: 'users.import_export', name: 'Import/Export người dùng',   group: 'Người dùng' },
  { key: 'questions.manage',   name: 'Quản lý câu hỏi',             group: 'Câu hỏi & Chủ đề' },
  { key: 'topics.manage',      name: 'Quản lý chủ đề',              group: 'Câu hỏi & Chủ đề' },
  { key: 'exams.manage',       name: 'Quản lý đề thi',              group: 'Đề thi & Ca thi' },
  { key: 'sessions.manage',    name: 'Quản lý ca thi',              group: 'Đề thi & Ca thi' },
  { key: 'monitor.view',       name: 'Xem giám sát thi',            group: 'Giám sát & Kết quả' },
  { key: 'results.view',       name: 'Xem kết quả thi',             group: 'Giám sát & Kết quả' },
  { key: 'results.print_export', name: 'In/Xuất kết quả',           group: 'Giám sát & Kết quả' },
  { key: 'exam.unlock',        name: 'Mở khóa bài thi',             group: 'Giám sát & Kết quả' },
  { key: 'statistics.view',    name: 'Xem thống kê',                group: 'Thống kê' },
  { key: 'users.permissions',  name: 'Quản lý phân quyền',          group: 'Người dùng' },
]

async function main() {
    // Seed Permissions
    for (const def of PERMISSION_DEFINITIONS) {
        await prisma.permission.upsert({
            where: { key: def.key },
            update: { name: def.name, group_name: def.group },
            create: {
                key: def.key,
                name: def.name,
                group_name: def.group,
                description: '',
            },
        })
    }
    console.log(`Seeded ${PERMISSION_DEFINITIONS.length} permissions`)

    // Seed Admin
    const passwordHash = await bcrypt.hash('admin', 10)
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password_hash: passwordHash,
            full_name: 'Administrator',
            department: 'IT',
            role: 'ADMIN',
        },
    })
    console.log({ admin })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
