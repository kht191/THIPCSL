import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
    const data = [
        {
            Content: 'Thủ đô của Việt Nam là gì?',
            A: 'Hà Nội',
            B: 'TP.HCM',
            C: 'Đà Nẵng',
            D: 'Hải Phòng',
            E: 'Hue',
            'Correct Answer': 'A',
            'Parent Topic': 'Địa lý',
            Topic: 'Địa lý Việt Nam'
        },
        {
            Content: '2 + 2 = ?',
            A: '3',
            B: '4',
            C: '5',
            D: '6',
            E: '7',
            'Correct Answer': 'B',
            'Parent Topic': 'Toán học',
            Topic: 'Số học'
        },
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    const buf = Buffer.from(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Disposition': 'attachment; filename="sample_questions.xlsx"',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
    });
}
