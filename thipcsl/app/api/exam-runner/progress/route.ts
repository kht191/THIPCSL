import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { examId, answers, sessionToken } = body;

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

        // Find IN_PROGRESS result
        const result = await prisma.result.findFirst({
            where: {
                user_id: userId,
                exam_id: examId,
                status: 'IN_PROGRESS'
            }
        });

        if (result && result.session_token && result.session_token !== sessionToken) {
            return NextResponse.json({ error: 'Session expired', code: 'SESSION_EXPIRED' }, { status: 409 });
        }

        if (result) {
            let savedData: any = {};
            try {
                savedData = JSON.parse(result.details || '{}');
            } catch (e) {
                savedData = {};
            }

            // Update answers but keep other data like questionOrder
            savedData.answers = answers;

            await prisma.result.update({
                where: { id: result.id },
                data: {
                    details: JSON.stringify(savedData)
                }
            });
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'No active exam found' }, { status: 404 });
        }

    } catch (error) {
        console.error('Error syncing progress:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
