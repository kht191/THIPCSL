import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function GET() {
    try {
        const userIdOrErr = await requirePermission('users.view');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;

        // Fetch distinct departments and fields
        const departments = await prisma.user.findMany({
            select: { department: true },
            distinct: ['department'],
            where: { department: { not: '' } }
        });

        const fields = await prisma.user.findMany({
            select: { field: true },
            distinct: ['field'],
            where: { field: { not: null } }
        });

        return NextResponse.json({
            departments: departments.map(d => d.department).filter(Boolean),
            fields: fields.map(f => f.field).filter(Boolean)
        });
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}
