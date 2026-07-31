import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

// GET: Lấy chi tiết đề thi 2 phần
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('exams.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;
        const exam = await prisma.exam.findUnique({
            where: { id },
        });

        if (!exam || exam.type !== 'TWO_PART') {
            return NextResponse.json({ error: 'Không tìm thấy đề thi 2 phần' }, { status: 404 });
        }

        // Parse settings để lấy twoPartConfig
        let twoPartConfig = null;
        let part1Matrix = {};
        let part2Matrix = {};
        try {
            const settings = JSON.parse(exam.settings || '{}');
            twoPartConfig = settings.twoPartConfig || null;
            part1Matrix = settings.part1Matrix || {};
            part2Matrix = settings.part2Matrix || {};
        } catch (e) {
            // ignore
        }

        return NextResponse.json({
            ...exam,
            twoPartConfig,
            part1Matrix,
            part2Matrix,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}

// PUT: Cập nhật đề thi 2 phần
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('exams.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;
        const body = await request.json();
        const {
            title,
            duration,
            status,
            allowed_users,
            part1Matrix,
            part2Matrix,
            part1PassPercent,
            part2PassPercent,
            max_attempts,
            max_violations,
            regenerate, // boolean flag: có tạo lại câu hỏi không
        } = body;

        const exam = await prisma.exam.findUnique({ where: { id } });
        if (!exam || exam.type !== 'TWO_PART') {
            return NextResponse.json({ error: 'Không tìm thấy đề thi 2 phần' }, { status: 404 });
        }

        // Parse settings cũ
        let oldSettings: any = {};
        try {
            oldSettings = JSON.parse(exam.settings || '{}');
        } catch (e) {
            oldSettings = {};
        }

        const updateData: any = {
            title: title || exam.title,
            duration: duration ? Number(duration) : exam.duration,
            max_attempts: max_attempts ? Number(max_attempts) : exam.max_attempts,
            max_violations: max_violations !== undefined ? Number(max_violations) : exam.max_violations,
            status: status || exam.status,
            allowed_users: allowed_users ? JSON.stringify(allowed_users) : exam.allowed_users,
        };

        let newSettings: any = { ...oldSettings };

        // Cập nhật pass percentages
        const finalPart1Matrix = part1Matrix || oldSettings.part1Matrix || {};
        const finalPart2Matrix = part2Matrix || oldSettings.part2Matrix || {};

        let part1QuestionIds = oldSettings.twoPartConfig?.part1QuestionIds || [];
        let part2QuestionIds = oldSettings.twoPartConfig?.part2QuestionIds || [];

        // Nếu regenerate, chọn lại câu hỏi
        if (regenerate && (part1Matrix || part2Matrix)) {
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

            try {
                part1QuestionIds = finalPart1Matrix && Object.keys(finalPart1Matrix).length > 0
                    ? await selectQuestions(finalPart1Matrix)
                    : part1QuestionIds;
                part2QuestionIds = finalPart2Matrix && Object.keys(finalPart2Matrix).length > 0
                    ? await selectQuestions(finalPart2Matrix)
                    : part2QuestionIds;
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 400 });
            }
        }

        const totalQuestions = part1QuestionIds.length + part2QuestionIds.length;
        if (totalQuestions > 50) {
            return NextResponse.json(
                { error: `Tổng số câu hỏi không được vượt quá 50. Hiện tại: ${totalQuestions}` },
                { status: 400 }
            );
        }

        // Cập nhật twoPartConfig
        newSettings = {
            part1Matrix: finalPart1Matrix,
            part2Matrix: finalPart2Matrix,
            twoPartConfig: {
                part1Label: 'Yêu cầu chung',
                part2Label: 'Yêu cầu riêng',
                part1PassPercent: part1PassPercent !== undefined ? Number(part1PassPercent) : (oldSettings.twoPartConfig?.part1PassPercent || 70),
                part2PassPercent: part2PassPercent !== undefined ? Number(part2PassPercent) : (oldSettings.twoPartConfig?.part2PassPercent || 70),
                part1QuestionIds,
                part2QuestionIds,
            },
        };

        updateData.question_ids = JSON.stringify([...part1QuestionIds, ...part2QuestionIds]);
        updateData.settings = JSON.stringify(newSettings);

        const updatedExam = await prisma.exam.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(updatedExam);
    } catch (error) {
        console.error('Error updating two-part exam:', error);
        return NextResponse.json({ error: 'Lỗi server: ' + (error as any).message }, { status: 500 });
    }
}

// DELETE: Xóa đề thi 2 phần
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('exams.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;

        // Xóa results trước
        await prisma.result.deleteMany({
            where: { exam_id: id },
        });

        await prisma.exam.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting two-part exam:', error);
        return NextResponse.json({ error: 'Lỗi server khi xóa đề thi' }, { status: 500 });
    }
}
