import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('exams.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;
        const exam = await prisma.exam.findUnique({
            where: { id },
        });

        if (!exam) {
            return NextResponse.json({ error: 'Khong tim thay de thi' }, { status: 404 });
        }

        return NextResponse.json(exam);
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('exams.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;
        const body = await request.json();
        const { title, duration, status, allowed_users, matrix, pass_score, max_violations,
            part1Matrix, part2Matrix, part1PassPercent, part2PassPercent, regenerate } = body;

        const exam = await prisma.exam.findUnique({ where: { id } });
        if (!exam) {
            return NextResponse.json({ error: 'Khong tim thay de thi' }, { status: 404 });
        }

        const updateData: any = {
            title,
            duration: duration ? Number(duration) : undefined,
            max_attempts: body.max_attempts ? Number(body.max_attempts) : undefined,
            status,
            allowed_users: allowed_users ? JSON.stringify(allowed_users) : undefined,
            pass_score: pass_score ? parseFloat(pass_score) : undefined,
            max_violations: max_violations ? Number(max_violations) : undefined,
        };

        // Helper
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

        if (exam.type === 'TWO_PART') {
            // Cập nhật đề 2 phần
            const oldSettings: any = (() => { try { return JSON.parse(exam.settings || '{}'); } catch { return {}; } })();
            const finalPart1Pass = part1PassPercent !== undefined ? Number(part1PassPercent) : (oldSettings.twoPartConfig?.part1PassPercent || 70);
            const finalPart2Pass = part2PassPercent !== undefined ? Number(part2PassPercent) : (oldSettings.twoPartConfig?.part2PassPercent || 70);

            let p1Ids = oldSettings.twoPartConfig?.part1QuestionIds || [];
            let p2Ids = oldSettings.twoPartConfig?.part2QuestionIds || [];

            if (regenerate && (part1Matrix || part2Matrix)) {
                const p1m = part1Matrix || oldSettings.part1Matrix || {};
                const p2m = part2Matrix || oldSettings.part2Matrix || {};
                try {
                    p1Ids = Object.keys(p1m).length > 0 ? await selectQuestions(p1m) : p1Ids;
                    p2Ids = Object.keys(p2m).length > 0 ? await selectQuestions(p2m) : p2Ids;
                } catch (err: any) {
                    return NextResponse.json({ error: err.message }, { status: 400 });
                }
            }

            const total = p1Ids.length + p2Ids.length;
            if (total > 50) return NextResponse.json({ error: `Tong so cau khong duoc vuot qua 50. Hien tai: ${total}` }, { status: 400 });

            updateData.question_ids = JSON.stringify([...p1Ids, ...p2Ids]);
            updateData.settings = JSON.stringify({
                part1Matrix: part1Matrix || oldSettings.part1Matrix || {},
                part2Matrix: part2Matrix || oldSettings.part2Matrix || {},
                twoPartConfig: {
                    part1Label: 'Yeu cau chung',
                    part2Label: 'Yeu cau rieng',
                    part1PassPercent: finalPart1Pass,
                    part2PassPercent: finalPart2Pass,
                    part1QuestionIds: p1Ids,
                    part2QuestionIds: p2Ids,
                }
            });
        } else {
            // Cập nhật đề thường (giữ nguyên logic cũ)
            if (matrix) {
                let selectedQuestionIds: string[] = [];
                try {
                    selectedQuestionIds = await selectQuestions(matrix);
                } catch (err: any) {
                    return NextResponse.json({ error: err.message }, { status: 400 });
                }
                if (selectedQuestionIds.length > 0) {
                    updateData.question_ids = JSON.stringify(selectedQuestionIds);
                    updateData.settings = JSON.stringify({ matrix });
                }
            }
        }

        const updatedExam = await prisma.exam.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(updatedExam);
    } catch (error) {
        console.error('Error updating exam:', error);
        return NextResponse.json({ error: 'Loi server: ' + (error as any).message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('exams.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;

        // Find and delete the public practice exam and all user forks
        const publicPractice = await prisma.exam.findFirst({
            where: { practiceSourceId: id },
            select: { id: true },
        });

        let deletedForks = 0;

        if (publicPractice) {
            // Find all personal copies (forks) of this practice exam
            const allForks = await prisma.exam.findMany({
                where: { type: 'PRACTICE', practiceSourceId: null },
                select: { id: true, settings: true },
            });

            const forkIds: string[] = [];
            for (const fork of allForks) {
                try {
                    const s = JSON.parse(fork.settings || '{}');
                    if (s.forkedFromPracticeId === publicPractice.id) {
                        forkIds.push(fork.id);
                    }
                } catch { }
            }

            // Delete forks
            if (forkIds.length > 0) {
                await prisma.result.deleteMany({ where: { exam_id: { in: forkIds } } });
                await prisma.exam.deleteMany({ where: { id: { in: forkIds } } });
                deletedForks = forkIds.length;
            }

            // Delete public practice exam
            await prisma.result.deleteMany({ where: { exam_id: publicPractice.id } });
            await prisma.exam.delete({ where: { id: publicPractice.id } });
        }

        // Delete associated results
        await prisma.result.deleteMany({
            where: { exam_id: id },
        });

        await prisma.exam.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, deletedForks });
    } catch (error) {
        console.error('Error deleting exam:', error);
        return NextResponse.json({ error: 'Loi server khi xoa de thi' }, { status: 500 });
    }
}
