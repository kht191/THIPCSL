import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userIdOrErr = await requirePermission('exams.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;
        const body = await request.json();
        const { publish } = body;

        // Find source exam
        const sourceExam = await prisma.exam.findUnique({ where: { id } });
        if (!sourceExam) {
            return NextResponse.json({ error: 'Không tìm thấy đề thi' }, { status: 404 });
        }

        if (publish) {
            // Check if already published
            const existing = await prisma.exam.findFirst({
                where: { practiceSourceId: id },
            });

            if (existing) {
                // Already published - update it
                await prisma.exam.update({
                    where: { id: existing.id },
                    data: {
                        title: sourceExam.title,
                        duration: sourceExam.duration,
                        question_ids: sourceExam.question_ids,
                        settings: sourceExam.settings,
                        status: 'OPEN',
                    },
                });
                return NextResponse.json({ success: true, practiceExamId: existing.id, action: 'updated' });
            }

            // Create new practice exam from official exam
            const practiceExam = await prisma.exam.create({
                data: {
                    title: sourceExam.title,
                    duration: sourceExam.duration,
                    max_attempts: 999,
                    max_violations: 3,
                    question_ids: sourceExam.question_ids,
                    allowed_users: JSON.stringify([]), // public - all users can access
                    status: 'OPEN',
                    type: 'PRACTICE',
                    pass_score: sourceExam.pass_score,
                    settings: sourceExam.settings,
                    practiceSourceId: id,
                },
            });

            return NextResponse.json({ success: true, practiceExamId: practiceExam.id, action: 'created' });
        } else {
            // Unpublish - delete the practice copy AND all user forks
            const practiceExam = await prisma.exam.findFirst({
                where: { practiceSourceId: id },
                select: { id: true },
            });

            if (practiceExam) {
                // Delete all personal copies (forks) created from this practice exam
                const allForks = await prisma.exam.findMany({
                    where: {
                        type: 'PRACTICE',
                        practiceSourceId: null,
                    },
                    select: { id: true, settings: true },
                });

                const forksToDelete: string[] = [];
                for (const fork of allForks) {
                    try {
                        const s = JSON.parse(fork.settings || '{}');
                        if (s.forkedFromPracticeId === practiceExam.id) {
                            forksToDelete.push(fork.id);
                        }
                    } catch { }
                }

                if (forksToDelete.length > 0) {
                    await prisma.exam.deleteMany({ where: { id: { in: forksToDelete } } });
                }

                // Delete the public practice exam
                await prisma.exam.delete({ where: { id: practiceExam.id } });
            }

            return NextResponse.json({
                success: true,
                deletedPractice: !!practiceExam,
                deletedForks: practiceExam ? (await prisma.exam.findMany({
                    where: {
                        type: 'PRACTICE',
                        practiceSourceId: null,
                    },
                    select: { id: true, settings: true },
                })).filter(f => {
                    try { const s = JSON.parse(f.settings || '{}'); return s.forkedFromPracticeId === practiceExam.id; } catch { return false; }
                }).length : 0,
                action: 'deleted'
            });
        }
    } catch (error: any) {
        console.error('Publish practice error:', error?.message || error);
        return NextResponse.json(
            { error: `Lỗi server: ${error?.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userIdOrErr = await requirePermission('exams.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;

        const practiceExam = await prisma.exam.findFirst({
            where: { practiceSourceId: id },
            select: { id: true, status: true },
        });

        return NextResponse.json({
            published: !!practiceExam,
            practiceExamId: practiceExam?.id || null,
            status: practiceExam?.status || null,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: `Lỗi server: ${error?.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}
