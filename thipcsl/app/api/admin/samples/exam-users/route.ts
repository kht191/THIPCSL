import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
    const data = [
        {
            'Tên đề thi': 'Đề thi An toàn lao động',
            'Mã NV': 'user001',
        },
        {
            'Tên đề thi': 'Đề thi An toàn lao động',
            'Mã NV': 'user002',
        },
        {
            'Tên đề thi': 'Đề thi 2 phần Kỹ thuật',
            'Mã NV': 'user003',
        },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Người thi');
    const buf = Buffer.from(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Disposition': 'attachment; filename="mau_import_nguoi_thi.xlsx"',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
    });
}
