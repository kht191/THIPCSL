import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
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

        // Fetch user to get department
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { department: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Fetch all ACTIVE sessions that are currently happening
        // Only fetch sessions that have at least one OFFICIAL exam
        const now = new Date();
        const sessions = await prisma.examSession.findMany({
            where: {
                status: 'ACTIVE',
                startTime: { lte: now },
                endTime: { gte: now },
                exams: {
                    some: {
                        type: { in: ['OFFICIAL', 'TWO_PART'] }
                    }
                }
            },
            include: {
                exams: {
                    select: {
                        id: true,
                        title: true,
                        duration: true,
                        allowed_users: true,
                        max_attempts: true,
                        type: true,
                        creatorId: true
                    }
                }
            },
            orderBy: { startTime: 'asc' }
        });

        // Fetch user's results to check attempts
        const userResults = await prisma.result.findMany({
            where: { user_id: userId },
            select: { exam_id: true, status: true }
        });

        // Filter sessions and exams based on permissions
        const availableSessions = sessions.map((session: any) => {
            const validExams = session.exams.filter((exam: any) => {
                // Only OFFICIAL exams
                if (exam.type !== 'OFFICIAL' && exam.type !== 'TWO_PART') return false;

                // Check allowed_users
                try {
                    const allowed = JSON.parse(exam.allowed_users);
                    if (Array.isArray(allowed)) {
                        if (!allowed.includes(userId) && !allowed.includes('ALL')) return false;
                    } else {
                        return false;
                    }
                } catch (e) {
                    return false;
                }

                // Check max_attempts
                const attempts = userResults.filter(r => r.exam_id === exam.id && r.status !== 'IN_PROGRESS').length;
                if (attempts >= (exam.max_attempts || 1)) return false;

                return true;
            });

            if (validExams.length === 0) return null;

            return {
                ...session,
                exams: validExams
            };
        }).filter(Boolean);

        return NextResponse.json(availableSessions);

    } catch (error) {
        console.error('Error fetching active exams:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
