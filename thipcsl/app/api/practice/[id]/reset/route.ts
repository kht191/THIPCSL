import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = verifyToken(token);
        if (!decoded?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        const userId = decoded.id;

        const exam = await prisma.exam.findUnique({ where: { id } });
        if (!exam || exam.type !== 'PRACTICE' || exam.creatorId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Find source exam
        let sourceId: string | null = null;
        try {
            const s = JSON.parse(exam.settings || '{}');
            sourceId = s.forkedFromPracticeId || s.forkedFromExamId;
        } catch { }

        if (!sourceId) {
            return NextResponse.json({ error: 'Không tìm thấy đề gốc' }, { status: 400 });
        }

        // Try practice exam first, then official exam
        let sourceExam = await prisma.exam.findUnique({ where: { id: sourceId } });
        if (!sourceExam) {
            // Try finding the original practice exam by practiceSourceId
            sourceExam = await prisma.exam.findFirst({
                where: { practiceSourceId: sourceId },
            });
        }
        if (!sourceExam) {
            return NextResponse.json({ error: 'Đề gốc không còn tồn tại' }, { status: 404 });
        }

        // Reset to source exam's question_ids and settings
        await prisma.exam.update({
            where: { id },
            data: {
                question_ids: sourceExam.question_ids,
                settings: exam.settings, // Keep forkedFrom metadata, will be updated below
            },
        });

        // Regenerate settings preserving forkedFrom metadata
        const forkedSettings = JSON.parse(exam.settings || '{}');
        const sourceSettings = JSON.parse(sourceExam.settings || '{}');

        // Convert source to practice matrix format
        const practiceMatrix: { topicIds: string[]; count: number }[] = [];
        if (sourceSettings.twoPartConfig) {
            // TWO_PART structure (source may be PRACTICE type with twoPartConfig)
            const combined: Record<string, number> = {};
            for (const [tid, cnt] of Object.entries({ ...(sourceSettings.part1Matrix || {}), ...(sourceSettings.part2Matrix || {}) })) {
                combined[tid] = (combined[tid] || 0) + Number(cnt);
            }
            for (const [tid, cnt] of Object.entries(combined)) {
                practiceMatrix.push({ topicIds: [tid], count: cnt });
            }
        } else if (sourceSettings.matrix) {
            for (const [tid, cnt] of Object.entries(sourceSettings.matrix)) {
                practiceMatrix.push({ topicIds: [tid], count: Number(cnt) });
            }
        }

        const newSettings: any = { matrix: practiceMatrix, isTwoPart: !!sourceSettings.twoPartConfig };
        if (forkedSettings.forkedFromPracticeId) newSettings.forkedFromPracticeId = forkedSettings.forkedFromPracticeId;
        if (forkedSettings.forkedFromExamId) newSettings.forkedFromExamId = forkedSettings.forkedFromExamId;
        if (forkedSettings.pinned !== undefined) newSettings.pinned = forkedSettings.pinned;

        await prisma.exam.update({
            where: { id },
            data: { settings: JSON.stringify(newSettings) },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
    }
}
