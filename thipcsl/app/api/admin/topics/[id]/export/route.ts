import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { sortOptionKeys } from '@/lib/question-options';
import { requirePermission } from '@/lib/permissions';

async function getDescendantTopicIds(topicId: string): Promise<string[]> {
    const ids: string[] = [topicId];
    const children = await prisma.topic.findMany({
        where: { parentId: topicId },
        select: { id: true },
    });
    for (const child of children) {
        const childIds = await getDescendantTopicIds(child.id);
        ids.push(...childIds);
    }
    return ids;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userIdOrErr = await requirePermission('topics.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const includeChildren = searchParams.get('includeChildren') !== 'false';

        const topic = await prisma.topic.findUnique({ where: { id } });
        if (!topic) {
            return NextResponse.json(
                { error: 'Không tìm thấy chủ đề' },
                { status: 404 }
            );
        }

        const topicIds = includeChildren
            ? await getDescendantTopicIds(id)
            : [id];

        const questions = await prisma.question.findMany({
            where: { topicId: { in: topicIds } },
            include: { topic: { include: { parent: true } } },
            orderBy: { createdAt: 'asc' },
        });

        if (questions.length === 0) {
            return NextResponse.json(
                { error: 'Không có câu hỏi nào trong chủ đề này' },
                { status: 404 }
            );
        }

        // Determine the maximum number of option columns across all questions
        let maxOptionCount = 0;
        for (const q of questions) {
            try {
                const opts: Record<string, string> = JSON.parse(q.options || '{}');
                const keys = sortOptionKeys(Object.keys(opts));
                if (keys.length > maxOptionCount) maxOptionCount = keys.length;
            } catch (parseErr) {
                console.error('Failed to parse options for question:', q.id, q.options);
                // skip this question's options, continue with others
            }
        }

        // Generate option column headers: A, B, C, ..., up to maxOptionCount
        const optionHeaders: string[] = [];
        for (let i = 0; i < maxOptionCount; i++) {
            optionHeaders.push(String.fromCharCode(65 + i));
        }

        // Build export rows matching the import template format
        const rows = questions.map(q => {
            let opts: Record<string, string> = {};
            try {
                opts = JSON.parse(q.options || '{}');
            } catch {
                // keep empty opts if parse fails
            }

            // Handle correct_answer: could be "A", "A,B", or '["A","B"]'
            let correctAnswer: string;
            try {
                const parsed = JSON.parse(q.correct_answer);
                correctAnswer = Array.isArray(parsed)
                    ? parsed.join(',')
                    : String(parsed);
            } catch {
                correctAnswer = q.correct_answer || '';
            }

            const row: Record<string, string> = {
                Content: q.content,
            };
            for (const header of optionHeaders) {
                row[header] = opts[header] ?? '';
            }
            row['Correct Answer'] = correctAnswer;
            row['Parent Topic'] = q.topic?.parent?.name ?? '';
            row['Topic'] = q.topic?.name ?? '';
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
        const buf = Buffer.from(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));

        const safeName = topic.name
            .replace(/[^a-zA-Z0-9_À-ỹ]/g, '_')
            .substring(0, 50);

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="cau_hoi_${safeName}.xlsx"`,
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });
    } catch (error: any) {
        console.error('Export questions error:', error?.message || error, error?.stack);
        return NextResponse.json(
            { error: `Lỗi server khi xuất câu hỏi: ${error?.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}
