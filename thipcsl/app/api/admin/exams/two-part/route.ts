import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

// POST: Tạo đề thi 2 phần (TWO_PART)
export async function POST(request: Request) {
    try {
        const userIdOrErr = await requirePermission('exams.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const body = await request.json();
        const {
            title,
            duration,
            part1Matrix,
            part2Matrix,
            part1PassPercent,
            part2PassPercent,
            allowed_users,
            max_attempts,
            max_violations,
        } = body;
        // part1Matrix, part2Matrix: { [topicId: string]: number }

        if (!title || !duration || !part1Matrix || !part2Matrix) {
            return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        // Helper function: chọn câu hỏi từ matrix
        async function selectQuestions(matrix: Record<string, number>): Promise<string[]> {
            const ids: string[] = [];
            for (const [topicId, count] of Object.entries(matrix)) {
                const quantity = Number(count);
                if (quantity > 0) {
                    const questions = await prisma.question.findMany({
                        where: { topicId: topicId },
                        select: { id: true },
                    });

                    if (questions.length < quantity) {
                        throw new Error(
                            `Không đủ câu hỏi cho chủ đề ${topicId}. Cần ${quantity}, có ${questions.length}`
                        );
                    }

                    const shuffled = questions.sort(() => 0.5 - Math.random());
                    const selected = shuffled.slice(0, quantity).map((q) => q.id);
                    ids.push(...selected);
                }
            }
            return ids;
        }

        // Chọn câu hỏi cho từng phần
        let part1QuestionIds: string[];
        let part2QuestionIds: string[];
        try {
            part1QuestionIds = await selectQuestions(part1Matrix);
            part2QuestionIds = await selectQuestions(part2Matrix);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }

        const totalQuestions = part1QuestionIds.length + part2QuestionIds.length;

        if (totalQuestions === 0) {
            return NextResponse.json({ error: 'Chưa chọn câu hỏi nào' }, { status: 400 });
        }

        if (totalQuestions > 50) {
            return NextResponse.json(
                { error: `Tổng số câu hỏi không được vượt quá 50. Hiện tại: ${totalQuestions}` },
                { status: 400 }
            );
        }

        // Tạo cấu hình 2 phần
        const twoPartConfig = {
            part1Label: 'Yêu cầu chung',
            part2Label: 'Yêu cầu riêng',
            part1PassPercent: Number(part1PassPercent) || 70,
            part2PassPercent: Number(part2PassPercent) || 70,
            part1QuestionIds,
            part2QuestionIds,
        };

        // Gộp chung question_ids (phẳng)
        const combinedQuestionIds = [...part1QuestionIds, ...part2QuestionIds];

        // Lưu settings với đầy đủ matrix và twoPartConfig
        const settings = {
            part1Matrix,
            part2Matrix,
            twoPartConfig,
        };

        const newExam = await prisma.exam.create({
            data: {
                title,
                duration: Number(duration),
                max_attempts: Number(max_attempts) || 1,
                max_violations: Number(max_violations) || 3,
                question_ids: JSON.stringify(combinedQuestionIds),
                allowed_users: JSON.stringify(allowed_users || []),
                status: 'OPEN',
                type: 'TWO_PART',
                pass_score: 5.0, // Không dùng pass_score cho TWO_PART, dùng per-part
                settings: JSON.stringify(settings),
            },
        });

        return NextResponse.json(newExam, { status: 201 });
    } catch (error) {
        console.error('Error creating two-part exam:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
