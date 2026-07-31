import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = verifyToken(token);
        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.id;

        const exam = await prisma.exam.findUnique({
            where: { id }
        });

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        if (exam.type !== 'PRACTICE' || exam.creatorId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(exam);

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = verifyToken(token);
        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.id;
        const body = await request.json();
        const { name, duration, matrix } = body;

        const exam = await prisma.exam.findUnique({
            where: { id }
        });

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        if (exam.type !== 'PRACTICE' || exam.creatorId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Giới hạn thời gian ôn tập tối đa 999 phút
        const durationNum = parseInt(duration);
        if (durationNum < 1 || durationNum > 999) {
            return NextResponse.json({ error: 'Thời gian làm bài phải từ 1 đến 999 phút' }, { status: 400 });
        }

        // If matrix is provided, regenerate questions
        let data: any = {
            title: name,
            duration: durationNum,
        };

        if (matrix) {
            let selectedQuestionIds: string[] = [];
            for (const item of matrix) {
                const { topicIds, count } = item;
                if (!topicIds || topicIds.length === 0 || count <= 0) continue;

                const questions = await prisma.question.findMany({
                    where: { topicId: { in: topicIds } },
                    select: { id: true }
                });

                if (questions.length < count) {
                    return NextResponse.json({
                        error: `Khong du cau hoi cho nhom chu de da chon. Can ${count}, co ${questions.length}`
                    }, { status: 400 });
                }

                const shuffled = questions.sort(() => 0.5 - Math.random());
                const picked = shuffled.slice(0, count).map(q => q.id);
                selectedQuestionIds = [...selectedQuestionIds, ...picked];
            }

            if (selectedQuestionIds.length === 0) {
                return NextResponse.json({ error: 'Không tìm thấy câu hỏi nào phù hợp' }, { status: 400 });
            }

            data.question_ids = JSON.stringify(selectedQuestionIds);
            // Preserve metadata when updating
            const newSettings: any = { matrix };
            try {
                const oldSettings = JSON.parse(exam.settings || '{}');
                if (oldSettings.forkedFromPracticeId) newSettings.forkedFromPracticeId = oldSettings.forkedFromPracticeId;
                if (oldSettings.forkedFromExamId) newSettings.forkedFromExamId = oldSettings.forkedFromExamId;
                if (oldSettings.isTwoPart) newSettings.isTwoPart = true;
                if (oldSettings.pinned !== undefined) newSettings.pinned = oldSettings.pinned;
            } catch { }
            data.settings = JSON.stringify(newSettings);
        }

        await prisma.exam.update({
            where: { id },
            data: data
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating practice:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = verifyToken(token);
        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.id;

        const exam = await prisma.exam.findUnique({
            where: { id }
        });

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        if (exam.type !== 'PRACTICE') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Block deletion of public official practice exams and forked copies
        if (exam.practiceSourceId) {
            return NextResponse.json({ error: 'Không thể xóa đề ôn tập chính thức' }, { status: 403 });
        }
        try {
            const s = JSON.parse(exam.settings || '{}');
            if (s.forkedFromPracticeId || s.forkedFromExamId) {
                return NextResponse.json({ error: 'Không thể xóa bản sao đề chính thức' }, { status: 403 });
            }
        } catch { }

        if (exam.creatorId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete related records first (transactional would be better but simple sequential is fine here for SQLite/Prisma default)
        // 1. Delete results associated with this exam
        await prisma.result.deleteMany({
            where: { exam_id: id }
        });

        // 2. Find and unlink sessions associated with this exam (many-to-many via "ExamToExamSession")
        const linkedSessions = await prisma.examSession.findMany({
            where: { exams: { some: { id } } }
        });
        for (const session of linkedSessions) {
            await prisma.examSession.delete({
                where: { id: session.id }
            });
        }

        // 3. Finally delete the exam
        await prisma.exam.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting practice exam:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
