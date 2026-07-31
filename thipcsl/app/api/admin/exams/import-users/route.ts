import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

function normalizeText(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
}

interface ImportRow {
    row: number;
    examTitle: string;
    username: string;
}

interface ImportIssue {
    row: number;
    type: 'error' | 'warning';
    message: string;
}

function parseRow(row: Record<string, unknown>, rowIndex: number): ImportRow {
    const get = (keys: string[]) => {
        for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
                return String(row[k]).trim();
            }
        }
        return '';
    };

    return {
        row: rowIndex + 1,
        examTitle: get(['Exam Title', 'exam_title', 'Tên đề thi', 'Ten de thi', 'Exam']),
        username: get(['Username', 'username', 'Mã NV', 'Ma NV', 'User', 'user']),
    };
}

async function validateRow(row: ImportRow): Promise<ImportIssue[]> {
    const issues: ImportIssue[] = [];

    if (!row.examTitle) {
        issues.push({ row: row.row, type: 'error', message: 'Tên đề thi không được để trống' });
    }

    if (!row.username) {
        issues.push({ row: row.row, type: 'error', message: 'Username không được để trống' });
    }

    if (issues.length > 0) return issues;

    // Check exam exists
    const exam = await prisma.exam.findFirst({
        where: { title: row.examTitle },
        select: { id: true, title: true, allowed_users: true },
    });

    if (!exam) {
        issues.push({
            row: row.row,
            type: 'error',
            message: `Đề thi "${row.examTitle}" không tồn tại`,
        });
        return issues;
    }

    // Check user exists
    const user = await prisma.user.findUnique({
        where: { username: normalizeText(row.username) },
        select: { id: true, username: true, full_name: true, role: true },
    });

    if (!user) {
        issues.push({
            row: row.row,
            type: 'error',
            message: `Người dùng "${row.username}" không tồn tại`,
        });
        return issues;
    }

    if (user.role !== 'CANDIDATE') {
        issues.push({
            row: row.row,
            type: 'warning',
            message: `Người dùng "${row.username}" (${user.full_name}) không phải thí sinh (role: ${user.role})`,
        });
    }

    // Check if user already assigned to this exam
    const allowedUsers: string[] = JSON.parse(exam.allowed_users || '[]');
    if (allowedUsers.includes(user.id)) {
        issues.push({
            row: row.row,
            type: 'warning',
            message: `Người dùng "${row.username}" (${user.full_name}) đã được gán vào đề thi "${row.examTitle}"`,
        });
    }

    return issues;
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const validateOnly = formData.get('validateOnly') === 'true';

        if (!file) {
            return NextResponse.json({ error: 'Vui lòng chọn file Excel' }, { status: 400 });
        }

        // Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

        if (data.length === 0) {
            return NextResponse.json({ error: 'File Excel không có dữ liệu' }, { status: 400 });
        }

        // Parse and validate all rows
        const allIssues: ImportIssue[] = [];
        const validRows: { row: ImportRow; examId: string; userId: string; username: string }[] = [];
        let totalRows = 0;

        for (let i = 0; i < data.length; i++) {
            const row = parseRow(data[i], i);
            totalRows++;

            const issues = await validateRow(row);
            allIssues.push(...issues);

            const hasErrors = issues.some(issue => issue.type === 'error');
            if (!hasErrors) {
                // Re-fetch to get IDs
                const exam = await prisma.exam.findFirst({
                    where: { title: row.examTitle },
                    select: { id: true },
                });
                const user = await prisma.user.findUnique({
                    where: { username: normalizeText(row.username) },
                    select: { id: true, username: true },
                });
                if (exam && user) {
                    validRows.push({
                        row,
                        examId: exam.id,
                        userId: user.id,
                        username: user.username,
                    });
                }
            }
        }

        const errorCount = allIssues.filter(i => i.type === 'error').length;
        const warningCount = allIssues.filter(i => i.type === 'warning').length;

        if (validateOnly) {
            return NextResponse.json({
                success: true,
                canImport: errorCount === 0,
                totalRows,
                validRows: validRows.length,
                errorCount,
                warningCount,
                issues: allIssues,
            });
        }

        if (errorCount > 0) {
            return NextResponse.json({
                success: false,
                error: `Có ${errorCount} lỗi. Vui lòng rà soát và sửa lại.`,
                canImport: false,
                totalRows,
                validRows: validRows.length,
                errorCount,
                warningCount,
                issues: allIssues,
            }, { status: 400 });
        }

        // Group by examId and update allowed_users
        const examUsersMap = new Map<string, { examId: string; userIds: Set<string>; title: string }>();

        for (const item of validRows) {
            if (!examUsersMap.has(item.examId)) {
                examUsersMap.set(item.examId, {
                    examId: item.examId,
                    userIds: new Set(),
                    title: item.row.examTitle,
                });
            }
            examUsersMap.get(item.examId)!.userIds.add(item.userId);
        }

        let updatedCount = 0;
        const errors: string[] = [];

        for (const [, entry] of examUsersMap) {
            try {
                const exam = await prisma.exam.findUnique({
                    where: { id: entry.examId },
                    select: { allowed_users: true },
                });

                const currentUsers: string[] = JSON.parse(exam?.allowed_users || '[]');
                const newUserIds = [...entry.userIds].filter(id => !currentUsers.includes(id));
                const mergedUsers = [...currentUsers, ...newUserIds];

                await prisma.exam.update({
                    where: { id: entry.examId },
                    data: { allowed_users: JSON.stringify(mergedUsers) },
                });

                updatedCount += newUserIds.length;
            } catch (err: any) {
                errors.push(`Đề thi "${entry.title}": ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            count: updatedCount,
            totalRows,
            errors: errors.length > 0 ? errors : undefined,
            issues: allIssues,
        });
    } catch (error: any) {
        console.error('Import users to exams error:', error?.message || error);
        return NextResponse.json(
            { error: `Lỗi server khi import người thi: ${error?.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}
