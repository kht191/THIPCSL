import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('exam.unlock');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;

        const { id } = await params; // resultId

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
