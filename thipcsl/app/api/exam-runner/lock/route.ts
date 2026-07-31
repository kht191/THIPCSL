import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { resultId } = body;

        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = verifyToken(token);
        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Optional: Check if the user owns the result (or is admin)
        // For now, we assume the student locks their own exam via frontend trigger

        await prisma.result.update({
            where: { id: resultId },
            data: { is_locked: true }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error locking exam:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
