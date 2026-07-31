import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = verifyToken(token);
        if (!decoded || !decoded.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const results = await prisma.result.findMany({
            where: { user_id: decoded.id, status: 'COMPLETED' },
            include: { exam: { select: { title: true } } },
            orderBy: { submitted_at: 'desc' },
            take: 20,
        });

        // Group by exam to count attempts
        const examCounts: Record<string, number> = {};
        const mapped = results.map(r => {
            examCounts[r.exam_id] = (examCounts[r.exam_id] || 0) + 1;
            return {
                id: r.id,
                examId: r.exam_id,
                examTitle: r.exam?.title || '',
                score: r.score,
                isPassed: r.is_passed,
                submittedAt: r.submitted_at,
                attemptNumber: examCounts[r.exam_id],
            };
        });

        return NextResponse.json({ results: mapped });
    } catch (error) {
        console.error('Error fetching results:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
