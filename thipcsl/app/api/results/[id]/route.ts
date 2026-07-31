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

        const result = await prisma.result.findUnique({
            where: { id },
            include: {
                exam: {
                    select: {
                        title: true,
                        duration: true,
                        type: true,
                        question_ids: true,
                        settings: true, // Needed for TWO_PART config
                    }
                },
                user: {
                    select: {
                        full_name: true,
                        username: true
                    }
                }
            }
        });

        if (!result) {
            return NextResponse.json({ error: 'Không tìm thấy kết quả' }, { status: 404 });
        }

        // Access Control: Only own result or Admin
        if (result.user_id !== decoded.id && decoded.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Không có quyền xem kết quả này' }, { status: 403 });
        }

        // Fetch questions details for review (optional, but useful for detail view)
        // We might want to return questions with correct answers here if we want to show "Review"
        // For now, let's just return the result and exam info.
        // If we want detailed review (Question content + User Answer + Correct Answer), we need to fetch questions.

        // Fetch questions and sort by saved order
        let questions = [];
        try {
            // Parse saved details to get question order
            let savedData: any = {};
            try {
                savedData = JSON.parse(result.details || '{}');
            } catch (e) {
                savedData = {};
            }

            const questionOrder = savedData.questionOrder || [];

            // Fallback to exam.question_ids if no saved order
            const qIds = questionOrder.length > 0 ? questionOrder : JSON.parse(result.exam.question_ids || '[]');

            const fetchedQuestions = await prisma.question.findMany({
                where: { id: { in: qIds } }
            });

            // Sort questions by saved order
            const questionMap = new Map(fetchedQuestions.map(q => [q.id, q]));
            questions = qIds.map((id: string) => questionMap.get(id)).filter((q: any) => q !== undefined);

        } catch (e) {
            console.error('Error parsing question ids', e);
        }

        return NextResponse.json({
            ...result,
            questions // Return questions in saved order
        });

    } catch (error) {
        console.error('Error fetching result detail:', error);
        return NextResponse.json({ error: 'Lỗi server khi lấy chi tiết kết quả' }, { status: 500 });
    }
}
