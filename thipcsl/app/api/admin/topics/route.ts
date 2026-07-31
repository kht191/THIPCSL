import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function GET(request: Request) {
    try {
        const userIdOrErr = await requirePermission('topics.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get('activeOnly') === 'true';

        const where: any = {};
        if (activeOnly) {
            where.isActive = true;
        }

        const topics = await prisma.topic.findMany({
            where: where,
            include: {
                children: {
                    include: {
                        _count: { select: { questions: true } }
                    }
                },
                parent: true,
                _count: { select: { questions: true } }
            },
            orderBy: { order: 'asc' },
        });
        return NextResponse.json(topics);
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userIdOrErr = await requirePermission('topics.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const body = await request.json();
        const { name, parentId, isActive } = body;

        if (!name) {
            return NextResponse.json({ error: 'Thieu ten chu de' }, { status: 400 });
        }

        // Check uniqueness for Level 1 (parentId is null)
        if (!parentId) {
            const existing = await prisma.topic.findFirst({
                where: {
                    name: name,
                    parentId: null
                }
            });
            if (existing) {
                return NextResponse.json({ error: 'Tên chủ đề cấp 1 đã tồn tại' }, { status: 400 });
            }
        }

        // Get max order
        const maxOrderTopic = await prisma.topic.findFirst({
            where: { parentId: parentId || null },
            orderBy: { order: 'desc' }
        });
        const nextOrder = (maxOrderTopic?.order ?? 0) + 1;

        const newTopic = await prisma.topic.create({
            data: {
                name,
                parentId: parentId || null,
                isActive: isActive !== undefined ? isActive : true,
                order: nextOrder
            },
        });

        return NextResponse.json(newTopic, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}
