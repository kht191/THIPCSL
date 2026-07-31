import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requirePermission } from '@/lib/permissions';

export async function GET() {
    const userIdOrErr = await requirePermission('users.view');
    if (typeof userIdOrErr !== 'string') return userIdOrErr;
    const data = [
        { Username: 'user1', Pass: '123456', Name: 'Nguyen Van A', Dept: 'IT', Field: 'Software' },
        { Username: 'user2', Pass: '123456', Name: 'Tran Thi B', Dept: 'HR', Field: 'Recruitment' },
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    const buf = Buffer.from(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Disposition': 'attachment; filename="sample_users.xlsx"',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
    });
}
