import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserId } from '@/lib/permissions';

export async function GET() {
    try {
        const userIdOrErr = await getAuthUserId();
        if (typeof userIdOrErr !== 'string') return userIdOrErr;

        const topics = await prisma.topic.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                parentId: true,
                _count: { select: { questions: true } },
            },
            orderBy: { order: 'asc' },
        });

        // Hide descendants of disabled parents, even if their own flag is active.
        const byId = new Map(topics.map(topic => [topic.id, topic]));
        const visibleTopics = topics.filter(topic => {
            const visited = new Set([topic.id]);
            let parentId = topic.parentId;
            while (parentId) {
                if (visited.has(parentId)) return false;
                visited.add(parentId);
                const parent = byId.get(parentId);
                if (!parent) return false;
                parentId = parent.parentId;
            }
            return true;
        });

        return NextResponse.json(visibleTopics);
    } catch (error) {
        console.error('Error loading practice topics:', error);
        return NextResponse.json({ error: 'Không thể tải chủ đề ôn tập' }, { status: 500 });
    }
}
