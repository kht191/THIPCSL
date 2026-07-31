import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function PATCH(request: Request) {
    try {
        const userIdOrErr = await requirePermission('users.edit');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;

        const body = await request.json();
        const { ids, is_active } = body;

        if (!Array.isArray(ids) || ids.length === 0 || typeof is_active !== 'boolean') {
            return NextResponse.json({ error: 'Thiếu ids hoặc is_active' }, { status: 400 });
        }

        await prisma.user.updateMany({
            where: { id: { in: ids } },
            data: { is_active },
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error('Batch PATCH error:', error);
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}
