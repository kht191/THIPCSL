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

export async function POST(request: Request) {
    try {
        const userIdOrErr = await requirePermission('topics.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;

        const body = await request.json();
        const { topicIds } = body as { topicIds: string[] };

        if (!topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
            return NextResponse.json(
                { error: 'Vui lòng chọn ít nhất một chủ đề' },
                { status: 400 }
            );
        }

        // Collect all topic IDs (including descendants)
        const allTopicIds: string[] = [];
        for (const id of topicIds) {
            const ids = await getDescendantTopicIds(id);
            allTopicIds.push(...ids);
        }
        // Remove duplicates
        const uniqueTopicIds = [...new Set(allTopicIds)];

        // Fetch topic names for the filename
        const selectedTopics = await prisma.topic.findMany({
            where: { id: { in: topicIds } },
            select: { name: true },
        });

        const questions = await prisma.question.findMany({
            where: { topicId: { in: uniqueTopicIds } },
            include: { topic: { include: { parent: true } } },
            orderBy: { createdAt: 'asc' },
        });

        if (questions.length === 0) {
            return NextResponse.json(
                { error: 'Không có câu hỏi nào trong các chủ đề đã chọn' },
                { status: 404 }
            );
        }

        // Determine max option columns
        let maxOptionCount = 0;
        for (const q of questions) {
            try {
                const opts: Record<string, string> = JSON.parse(q.options || '{}');
                const keys = sortOptionKeys(Object.keys(opts));
                if (keys.length > maxOptionCount) maxOptionCount = keys.length;
            } catch {
                // skip malformed options
            }
        }

        // Generate option headers: A, B, C, ...
        const optionHeaders: string[] = [];
        for (let i = 0; i < maxOptionCount; i++) {
            optionHeaders.push(String.fromCharCode(65 + i));
        }

        // Build export rows
        const rows = questions.map(q => {
            let opts: Record<string, string> = {};
            try {
                opts = JSON.parse(q.options || '{}');
            } catch {
                // keep empty opts
            }

            let correctAnswer: string;
            try {
                const parsed = JSON.parse(q.correct_answer);
                correctAnswer = Array.isArray(parsed) ? parsed.join(',') : String(parsed);
            } catch {
                correctAnswer = q.correct_answer || '';
            }

            const row: Record<string, string> = { Content: q.content };
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

        // Create filename from selected topic names
        const namePart = selectedTopics
            .map(t => t.name.replace(/[^a-zA-Z0-9_À-ỹ]/g, '_'))
            .join('_')
            .substring(0, 80);

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="cau_hoi_${namePart}.xlsx"`,
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });
    } catch (error: any) {
        console.error('Bulk export questions error:', error?.message || error, error?.stack);
        return NextResponse.json(
            { error: `Lỗi server khi xuất câu hỏi: ${error?.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}
