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

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = verifyToken(token);
        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.id;

        // Check if source practice exam exists
        const sourceExam = await prisma.exam.findUnique({ where: { id } });
        if (!sourceExam || sourceExam.type !== 'PRACTICE') {
            return NextResponse.json({ error: 'Không tìm thấy đề ôn tập' }, { status: 404 });
        }

        // Check if user already has a personal copy of this official exam
        const existingCopy = await prisma.exam.findFirst({
            where: {
                type: 'PRACTICE',
                creatorId: userId,
                practiceSourceId: null,
                settings: { contains: sourceExam.id },
            },
        });

        // Verify the existing copy is actually a fork of this source
        if (existingCopy) {
            try {
                const settings = JSON.parse(existingCopy.settings || '{}');
                if (settings.forkedFromPracticeId === id || settings.forkedFromExamId === sourceExam.practiceSourceId) {
                    return NextResponse.json({ success: true, examId: existingCopy.id, action: 'existing' });
                }
            } catch { }
        }

        // Create personal copy
        const title = sourceExam.title + ' (bản sao)';

        // Convert official exam settings to practice-compatible matrix format
        const sourceSettings = JSON.parse(sourceExam.settings || '{}');
        const practiceMatrix: { topicIds: string[]; count: number }[] = [];

        if (sourceSettings.twoPartConfig) {
            // TWO_PART structure (source may be PRACTICE type)
            const combined: Record<string, number> = {};
            const p1 = sourceSettings.part1Matrix || {};
            const p2 = sourceSettings.part2Matrix || {};
            for (const [tid, cnt] of Object.entries({ ...p1, ...p2 })) {
                combined[tid] = (combined[tid] || 0) + Number(cnt);
            }
            for (const [tid, cnt] of Object.entries(combined)) {
                practiceMatrix.push({ topicIds: [tid], count: cnt });
            }
        } else if (sourceSettings.matrix) {
            // OFFICIAL: { matrix: { topicId: count } }
            for (const [tid, cnt] of Object.entries(sourceSettings.matrix)) {
                practiceMatrix.push({ topicIds: [tid], count: Number(cnt) });
            }
        }

        // Also extract from question_ids as fallback
        if (practiceMatrix.length === 0 && sourceExam.question_ids) {
            try {
                const qids = JSON.parse(sourceExam.question_ids);
                // Group questions by topic
                const questions = await prisma.question.findMany({
                    where: { id: { in: qids } },
                    select: { id: true, topicId: true },
                });
                const topicCounts: Record<string, number> = {};
                for (const q of questions) {
                    if (q.topicId) topicCounts[q.topicId] = (topicCounts[q.topicId] || 0) + 1;
                }
                for (const [tid, cnt] of Object.entries(topicCounts)) {
                    practiceMatrix.push({ topicIds: [tid], count: cnt });
                }
            } catch { }
        }

        const settings: Record<string, any> = {
            matrix: practiceMatrix,
            forkedFromPracticeId: id,
            isTwoPart: !!sourceSettings.twoPartConfig,
        };
        if (sourceExam.practiceSourceId) {
            settings.forkedFromExamId = sourceExam.practiceSourceId;
        }

        const personalCopy = await prisma.exam.create({
            data: {
                title,
                duration: sourceExam.duration,
                max_attempts: 999,
                max_violations: 3,
                question_ids: sourceExam.question_ids,
                allowed_users: JSON.stringify([userId]),
                status: 'OPEN',
                type: 'PRACTICE',
                pass_score: sourceExam.pass_score,
                settings: JSON.stringify(settings),
                creatorId: userId,
                practiceSourceId: null,
            },
        });

        return NextResponse.json({ success: true, examId: personalCopy.id, action: 'created' });
    } catch (error: any) {
        console.error('Fork practice error:', error?.message || error);
        return NextResponse.json(
            { error: `Lỗi server: ${error?.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}
