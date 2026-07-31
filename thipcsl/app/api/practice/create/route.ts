import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
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
        // matrix: [{ topicId: '...', count: 5 }, ...]

        if (!name || !duration || !matrix || !Array.isArray(matrix)) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        // Giới hạn thời gian ôn tập tối đa 999 phút để tránh treo bài
        const durationNum = parseInt(duration);
        if (durationNum < 1 || durationNum > 999) {
            return NextResponse.json({ error: 'Thời gian làm bài phải từ 1 đến 999 phút' }, { status: 400 });
        }

        let selectedQuestionIds: string[] = [];

        // Select questions based on matrix
        for (const item of matrix) {
            const { topicIds, count } = item; // topicIds is array of strings
            if (!topicIds || topicIds.length === 0 || count <= 0) continue;

            // Get all question IDs for these topics
            const questions = await prisma.question.findMany({
                where: { topicId: { in: topicIds } },
                select: { id: true }
            });

            if (questions.length < count) {
                return NextResponse.json({
                    error: `Khong du cau hoi cho nhom chu de da chon. Can ${count}, co ${questions.length}`
                }, { status: 400 });
            }

            // Shuffle and pick 'count'
            const shuffled = questions.sort(() => 0.5 - Math.random());
            const picked = shuffled.slice(0, count).map(q => q.id);
            selectedQuestionIds = [...selectedQuestionIds, ...picked];
        }

        if (selectedQuestionIds.length === 0) {
            return NextResponse.json({ error: 'Không tìm thấy câu hỏi nào phù hợp với cấu trúc đã chọn' }, { status: 400 });
        }

        // Create Exam
        const exam = await prisma.exam.create({
            data: {
                title: name,
                duration: durationNum,
                max_attempts: 999, // Unlimited attempts for practice
                question_ids: JSON.stringify(selectedQuestionIds),
                allowed_users: JSON.stringify([userId]), // Only creator
                status: 'OPEN',
                pass_score: 5.0, // Default
                type: 'PRACTICE',
                creatorId: userId,
                settings: JSON.stringify({ matrix })
            }
        });

        return NextResponse.json({ success: true, examId: exam.id });

    } catch (error) {
        console.error('Error creating practice exam:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
