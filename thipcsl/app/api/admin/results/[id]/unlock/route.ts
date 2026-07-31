import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // resultId

        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = verifyToken(token);
        if (!decoded || !decoded.id || (decoded.role !== 'ADMIN' && decoded.role !== 'PROCTOR')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.result.update({
            where: { id },
            data: { is_locked: false }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error unlocking exam:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
