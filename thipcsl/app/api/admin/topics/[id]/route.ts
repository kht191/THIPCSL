import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('topics.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;
        const body = await request.json();
        const { name, parentId, isActive } = body;

        // Check uniqueness for Level 1 (parentId is null)
        if (!parentId) {
            const existing = await prisma.topic.findFirst({
                where: {
                    name: name,
                    parentId: null,
                    NOT: { id: id } // Exclude current topic
                }
            });
            if (existing) {
                return NextResponse.json({ error: 'Tên chủ đề cấp 1 đã tồn tại' }, { status: 400 });
            }
        }

        const updatedTopic = await prisma.topic.update({
            where: { id },
            data: {
                name,
                parentId: parentId || null,
                isActive: isActive !== undefined ? isActive : undefined,
                order: body.order !== undefined ? parseInt(body.order) : undefined
            },
        });

        // Cascading status: Update all children to match parent's status
        if (isActive !== undefined) {
            await prisma.topic.updateMany({
                where: { parentId: id },
                data: { isActive: isActive }
            });
        }

        return NextResponse.json(updatedTopic);
    } catch (error) {
        return NextResponse.json({ error: 'Lỗi server khi cập nhật chủ đề' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('topics.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;

        const topicIdsToDelete: string[] = [id];
        let frontier = [id];

        while (frontier.length > 0) {
            const children = await prisma.topic.findMany({
                where: { parentId: { in: frontier } },
                select: { id: true },
            });

            frontier = children.map((t) => t.id);
            topicIdsToDelete.push(...frontier);
        }

        await prisma.$transaction([
            prisma.question.deleteMany({ where: { topicId: { in: topicIdsToDelete } } }),
            prisma.topic.deleteMany({ where: { id: { in: topicIdsToDelete } } }),
        ]);

        return NextResponse.json({ success: true, deletedTopics: topicIdsToDelete.length });
    } catch (error) {
        console.error('Error deleting topic:', error);
        return NextResponse.json({ error: 'Lỗi server khi xóa chủ đề' }, { status: 500 });
    }
}
