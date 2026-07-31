import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function PUT(request: Request) {
    try {
        const userIdOrErr = await requirePermission('topics.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const body = await request.json();
        const { items } = body; // Array of { id, order }

        if (!Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Use transaction to update all
        await prisma.$transaction(
            items.map((item: any) =>
                prisma.topic.update({
                    where: { id: item.id },
                    data: { order: item.order }
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error reordering topics:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
