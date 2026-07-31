import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function GET(request: Request) {
    try {
        const userIdOrErr = await requirePermission('exams.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;
        const typeFilter = searchParams.get('type');

        const where: any = {};
        if (typeFilter) {
            where.type = { in: typeFilter.split(',') };
        } else {
            where.type = { not: 'PRACTICE' }; // Hiển thị OFFICIAL và TWO_PART theo mặc định
        }

        const [exams, total] = await Promise.all([
            prisma.exam.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.exam.count({ where })
        ]);

        return NextResponse.json({
            data: exams,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userIdOrErr = await requirePermission('exams.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const body = await request.json();
        const { title, duration, matrix, allowed_users, pass_score, type, part1Matrix, part2Matrix, part1PassPercent, part2PassPercent } = body;

        if (!title || !duration) {
            return NextResponse.json({ error: 'Thieu thong tin' }, { status: 400 });
        }

        // Helper: chọn câu hỏi từ matrix
        async function selectQuestions(m: Record<string, number>): Promise<string[]> {
            const ids: string[] = [];
            for (const [topicId, count] of Object.entries(m)) {
                const quantity = Number(count);
                if (quantity > 0) {
                    const questions = await prisma.question.findMany({
                        where: { topicId: topicId },
                        select: { id: true }
                    });
                    if (questions.length < quantity) {
                        throw new Error(`Khong du cau hoi cho chu de ${topicId}. Can ${quantity}, co ${questions.length}`);
                    }
                    const shuffled = questions.sort(() => 0.5 - Math.random());
                    const selected = shuffled.slice(0, quantity).map(q => q.id);
                    ids.push(...selected);
                }
            }
            return ids;
        }

        let selectedQuestionIds: string[] = [];
        let settings: any = {};

        if (type === 'TWO_PART') {
            // Đề thi 2 phần
            if (!part1Matrix || !part2Matrix) {
                return NextResponse.json({ error: 'Thieu ma tran cho de thi 2 phan' }, { status: 400 });
            }

            let part1Ids: string[], part2Ids: string[];
            try {
                part1Ids = await selectQuestions(part1Matrix);
                part2Ids = await selectQuestions(part2Matrix);
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 400 });
            }

            const total = part1Ids.length + part2Ids.length;
            if (total === 0) return NextResponse.json({ error: 'Chua chon cau hoi nao' }, { status: 400 });
            if (total > 50) return NextResponse.json({ error: `Tong so cau hoi khong duoc vuot qua 50. Hien tai: ${total}` }, { status: 400 });

            selectedQuestionIds = [...part1Ids, ...part2Ids];
            settings = {
                part1Matrix,
                part2Matrix,
                twoPartConfig: {
                    part1Label: 'Yeu cau chung',
                    part2Label: 'Yeu cau rieng',
                    part1PassPercent: Number(part1PassPercent) || 70,
                    part2PassPercent: Number(part2PassPercent) || 70,
                    part1QuestionIds: part1Ids,
                    part2QuestionIds: part2Ids,
                }
            };
        } else {
            // Đề thi thường (OFFICIAL)
            if (!matrix) {
                return NextResponse.json({ error: 'Thieu ma tran de thi' }, { status: 400 });
            }

            try {
                selectedQuestionIds = await selectQuestions(matrix);
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 400 });
            }

            if (selectedQuestionIds.length === 0) {
                return NextResponse.json({ error: 'Chua chon cau hoi nao' }, { status: 400 });
            }

            settings = { matrix };
        }

        const newExam = await prisma.exam.create({
            data: {
                title,
                duration: Number(duration),
                max_attempts: Number(body.max_attempts) || 1,
                max_violations: Number(body.max_violations) || 3,
                question_ids: JSON.stringify(selectedQuestionIds),
                allowed_users: JSON.stringify(allowed_users || []),
                status: 'OPEN',
                type: type === 'TWO_PART' ? 'TWO_PART' : 'OFFICIAL',
                pass_score: parseFloat(pass_score) || 5.0,
                settings: JSON.stringify(settings),
            },
        });

        return NextResponse.json(newExam, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}
