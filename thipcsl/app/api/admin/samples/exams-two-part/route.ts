import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
    const data = [
        {
            'Tên đề thi': 'Đề thi 2 phần Kỹ thuật',
            'Thời gian (phút)': 60,
            'Loại đề': 'TWO_PART',
            'Điểm đạt P1 (%)': 70,
            'Điểm đạt P2 (%)': 70,
            'Số lần thi': 1,
            'Vi phạm tối đa': 3,
            'Chủ đề 1': 'Kỹ thuật > Điện',
            'Số câu 1': 10,
            'Phần 1': 1,
            'Chủ đề 2': 'Kỹ thuật > Cơ khí',
            'Số câu 2': 5,
            'Phần 2': 1,
            'Chủ đề 3': 'Kỹ thuật > Nhiệt',
            'Số câu 3': 3,
            'Phần 3': 2,
        },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TWO_PART');
    const buf = Buffer.from(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Disposition': 'attachment; filename="mau_import_de_thi_2PHAN.xlsx"',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
    });
}
