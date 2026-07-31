import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function GET() {
    try {
        const userIdOrErr = await requirePermission('statistics.view');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const groups = await prisma.question.groupBy({
            by: ['topicId'],
            _count: {
                _all: true
            },
            where: {
                topicId: { not: null }
            }
        });

        const counts: Record<string, number> = {};
        groups.forEach(g => {
            if (g.topicId) {
                counts[g.topicId] = g._count._all;
            }
        });

        return NextResponse.json(counts);
    } catch (error) {
        console.error('Error fetching topic stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
