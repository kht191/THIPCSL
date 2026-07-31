import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { autoSubmitExam } from '@/lib/exam-helper';
import { requirePermission } from '@/lib/permissions';

export async function GET(request: Request) {
    try {
        const userIdOrErr = await requirePermission('monitor.view');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const results = await prisma.result.findMany({
            where: {
                status: 'IN_PROGRESS'
            },
            include: {
                user: {
                    select: {
                        username: true,
                        full_name: true,
                        department: true
                    }
                },
                exam: {
                    select: {
                        title: true,
                        question_ids: true,
                        duration: true
                    }
                },
                session: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                started_at: 'desc'
            }
        });

        // Lazy Auto-submit Check
        const now = new Date();
        for (const result of results) {
            const startTime = new Date(result.started_at);
            const durationMs = result.exam.duration * 60 * 1000;

            // If time + duration + 2 mins buffer is passed
            if (now.getTime() > startTime.getTime() + durationMs + 2 * 60 * 1000) {
                try {
                    console.log(`[Monitor] Auto-submitting expired exam result: ${result.id}`);
                    await autoSubmitExam(result.id);
                    // Update the local result object so the UI shows it as completed (or filter it out)
                    // For now, we'll just let it be filtered out on next refresh or handle it in UI
                } catch (e) {
                    console.error(`[Monitor] Failed to auto-submit result ${result.id}`, e);
                }
            }
        }

        // Re-fetch or filter results after auto-submit
        const activeResults = results.filter(r => {
            const startTime = new Date(r.started_at);
            const durationMs = r.exam.duration * 60 * 1000;
            return now.getTime() <= startTime.getTime() + durationMs + 2 * 60 * 1000;
        });

        const data = activeResults.map(r => {
            let totalQuestions = 0;
            try {
                const details = JSON.parse(r.details || '{}');
                totalQuestions = Array.isArray(details.questionOrder)
                    ? details.questionOrder.length
                    : JSON.parse(r.exam.question_ids).length;
            } catch (e) { }

            let answeredCount = 0;
            try {
                const details = JSON.parse(r.details);
                // Check if answers are nested in 'answers' property (new format) or direct (old format)
                const answers = details.answers || details;
                answeredCount = Object.keys(answers).length;
            } catch (e) { }

            return {
                id: r.id,
                user: r.user,
                exam: r.exam.title,
                session: r.session?.name,
                sessionId: r.session_id,
                startedAt: r.started_at,
                progress: {
                    answered: answeredCount,
                    total: totalQuestions
                },
                isLocked: r.is_locked
            };
        });

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch monitor data' }, { status: 500 });
    }
}
