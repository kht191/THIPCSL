import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requirePermission } from '@/lib/permissions';

export async function GET() {
    const userIdOrErr = await requirePermission('users.view');
    if (typeof userIdOrErr !== 'string') return userIdOrErr;
    const data = [
        {
            'Tên đề thi': 'Đề thi An toàn lao động',
            'Thời gian (phút)': 45,
            'Loại đề': 'OFFICIAL',
            'Điểm đạt': 5,
            'Số lần thi': 1,
            'Vi phạm tối đa': 3,
            'Chủ đề 1': 'PCCC',
            'Số câu 1': 5,
            'Chủ đề 2': 'An toàn lao động > An toàn điện',
            'Số câu 2': 3,
            'Chủ đề 3': '',
            'Số câu 3': '',
        },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'OFFICIAL');
    const buf = Buffer.from(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Disposition': 'attachment; filename="mau_import_de_thi_OFFICIAL.xlsx"',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
    });
}
