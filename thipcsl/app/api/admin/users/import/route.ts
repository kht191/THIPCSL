import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import * as XLSX from 'xlsx';
import { requirePermission } from '@/lib/permissions';

export async function POST(request: Request) {
    try {
        const userIdOrErr = await requirePermission('users.import_export');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Chua chon file' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet) as any[];

        let createdCount = 0;
        let updatedCount = 0;
        let errors = [];

        for (const row of data) {
            const username = row['Username'] || row['username'];
            const password = row['Pass'] || row['password'];
            const full_name = row['Name'] || row['full_name'];
            const department = row['Dept'] || row['department'];
            const field = row['Field'] || row['field'];

            if (!username) continue;

            const normalizedUsername = String(username).toLowerCase();

            try {
                const existingUser = await prisma.user.findUnique({
                    where: { username: normalizedUsername }
                });

                if (existingUser) {
                    // Update existing user
                    const updateData: any = {};
                    if (full_name) updateData.full_name = String(full_name);
                    if (department) updateData.department = String(department);
                    if (field) updateData.field = String(field);
                    if (password) {
                        updateData.password_hash = await hashPassword(String(password));
                    }

                    if (Object.keys(updateData).length > 0) {
                        await prisma.user.update({
                            where: { username: normalizedUsername },
                            data: updateData
                        });
                        updatedCount++;
                    }
                } else {
                    // Create new user
                    if (full_name && password) {
                        const password_hash = await hashPassword(String(password));
                        await prisma.user.create({
                            data: {
                                username: normalizedUsername,
                                password_hash,
                                full_name: String(full_name),
                                department: String(department || ''),
                                field: String(field || ''),
                                role: 'CANDIDATE',
                            }
                        });
                        createdCount++;
                    } else {
                        errors.push(`Bỏ qua ${username}: Thiếu mật khẩu hoặc họ tên để tạo mới`);
                    }
                }
            } catch (e) {
                console.error(`Error processing user ${username}:`, e);
                errors.push(`Lỗi xử lý ${username}: ${e instanceof Error ? e.message : 'Lỗi không xác định'}`);
            }
        }

        return NextResponse.json({
            success: true,
            created: createdCount,
            updated: updatedCount,
            errors
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}
