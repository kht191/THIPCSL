import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserPermissions, requirePermission } from '@/lib/permissions';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const viewerId = await requirePermission('monitor.view');
        if (typeof viewerId !== 'string') return viewerId;
        const permissions = await getUserPermissions(viewerId);
        if (!permissions.includes('monitor.answers')) {
            return NextResponse.json({ error: 'Bạn chưa được cấp quyền xem đáp án đang làm của thí sinh' }, { status: 403 });
        }
        const { id } = await params;
        const result = await prisma.result.findUnique({
            where: { id },
            select: {
                id: true, details: true, started_at: true, status: true, is_locked: true,
                user: { select: { username: true, full_name: true, department: true } },
                exam: { select: { title: true, type: true, settings: true, duration: true, question_ids: true } },
            },
        });
        if (!result) return NextResponse.json({ error: 'Không tìm thấy bài làm' }, { status: 404 });
        const viewer = await prisma.user.findUnique({ where: { id: viewerId }, select: { role: true } });
        const isAdmin = viewer?.role === 'ADMIN';
        const details = JSON.parse(result.details || '{}');
        const ids: string[] = Array.isArray(details.questionOrder) ? details.questionOrder : JSON.parse(result.exam.question_ids);
        const rows = await prisma.question.findMany({
            where: { id: { in: ids } },
            select: { id: true, content: true, options: true, correct_answer: isAdmin },
        });
        const byId = new Map(rows.map(q => [q.id, q]));
        return NextResponse.json({ result, questions: ids.map(id => byId.get(id)).filter(Boolean),
            viewerRole: viewer?.role, canUnlock: permissions.includes('exam.unlock') });
    } catch (error) {
        console.error('Error loading monitor detail:', error);
        return NextResponse.json({ error: 'Không thể tải chi tiết giám sát' }, { status: 500 });
    }
}
