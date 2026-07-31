import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { requirePermission } from '@/lib/permissions';

export async function POST(request: Request) {
    try {
        const userIdOrErr = await requirePermission('users.import_export');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'Danh sách ID không hợp lệ' }, { status: 400 });
        }

        const users = await prisma.user.findMany({
            where: {
                id: { in: ids }
            },
            select: {
                username: true,
                full_name: true,
                department: true,
                field: true
            }
        });

        // Map to the format expected by the import tool
        const data = users.map(user => ({
            'Username': user.username,
            'Pass': '', // Leave empty for editing
            'Name': user.full_name,
            'Dept': user.department,
            'Field': user.field
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

        const buf = Buffer.from(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Disposition': 'attachment; filename="export_users.xlsx"',
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
