import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const where: any = {};

        if (sessionId) {
            where.session_id = sessionId;
        }

        if (startDate && endDate) {
            where.submitted_at = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        // Fetch results with related data (OFFICIAL exams only, exclude PRACTICE)
        const results = await prisma.result.findMany({
            where: {
                ...where,
                status: 'COMPLETED', // Only completed results
            },
            include: {
                user: {
                    select: {
                        full_name: true,
                        username: true,
                        department: true,
                    },
                },
                session: {
                    select: {
                        name: true,
                    },
                },
                exam: {
                    select: {
                        title: true,
                        pass_score: true,
                        type: true,
                    }
                }
            },
            orderBy: {
                score: 'desc',
            },
        });

        // Filter out PRACTICE exams (keep OFFICIAL and TWO_PART)
        const officialResults = results.filter(r => {
            const t = (r.exam?.type || '').toUpperCase();
            return t === 'OFFICIAL' || t === 'TWO_PART';
        });

        console.log(`[Statistics API] Total results: ${results.length}, Official+TwoPart: ${officialResults.length}, Practice: ${results.length - officialResults.length}`);

        // Determine expected candidates
        let expectedUsers: any[] = [];
        let allAttemptedUsernames = new Set<string>();

        if (sessionId) {
            // ... session-specific logic (unchanged)
            try {
                const allSessionResults = await prisma.result.findMany({
                    where: { session_id: sessionId, status: 'COMPLETED' },
                    select: { user: { select: { username: true } }, exam: { select: { type: true } } }
                });
                for (const r of allSessionResults) {
                    if ((r.exam?.type || '').toUpperCase() !== 'PRACTICE' && r.user?.username) {
                        allAttemptedUsernames.add(r.user.username);
                    }
                }
            } catch (e) {
                console.error('Error fetching all attempted:', e);
            }
            try {
                // ... existing session exam lookup
                const sessionWithExams = await prisma.examSession.findUnique({
                    where: { id: sessionId },
                    include: { exams: { select: { id: true, title: true, allowed_users: true } } }
                });

                if (sessionWithExams) {
                    const allowedSet = new Set<string>();

                    for (const ex of sessionWithExams.exams) {
                        try {
                            const allowed = ex.allowed_users ? JSON.parse(ex.allowed_users) : [];
                            if (Array.isArray(allowed) && allowed.length > 0) {
                                for (const a of allowed) {
                                    if (typeof a === 'string' && a.trim()) allowedSet.add(a.trim());
                                }
                            }
                            // [] or invalid = đề chưa có ai được gán, bỏ qua (không tính là "all users")
                        } catch (e) {
                            // ignore parse errors
                        }
                    }

                    if (allowedSet.size > 0) {
                        const allowedArr = Array.from(allowedSet);
                        const isUuid = (s: string) => /^[0-9a-fA-F-]{36}$/.test(s);
                        if (allowedArr.every(isUuid)) {
                            expectedUsers = await prisma.user.findMany({
                                where: { id: { in: allowedArr } },
                                select: { id: true, username: true, full_name: true, department: true }
                            });
                        } else {
                            expectedUsers = await prisma.user.findMany({
                                where: { username: { in: allowedArr } },
                                select: { id: true, username: true, full_name: true, department: true }
                            });
                        }
                    } else {
                        expectedUsers = [];
                    }
                }
            } catch (e) {
                console.error('Error fetching session exams for expected users:', e);
            }
        } else {
            // No session selected: don't aggregate all exams — only show results without expected/missing
            expectedUsers = [];
        }

        // Calculate Metrics
        const totalCandidates = officialResults.length;
        if (totalCandidates === 0) {
            if (!sessionId) {
                allAttemptedUsernames = new Set(officialResults.map((r: any) => r.user?.username));
            }
            const missingCandidatesEmpty = expectedUsers.length > 0 ? expectedUsers.filter(u => !allAttemptedUsernames.has(u.username)) : [];

            return NextResponse.json({
                summary: {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    avgScore: 0,
                    maxScore: 0,
                    minScore: 0,
                    passRate: 0,
                },
                distribution: [],
                results: [],
                expectedCount: expectedUsers.length,
                attemptedCount: allAttemptedUsernames.size,
                missingCount: missingCandidatesEmpty.length,
                missingCandidates: missingCandidatesEmpty.map(u => ({ id: u.id, username: u.username, full_name: u.full_name, department: u.department })),
            });
        }

        const passedCount = officialResults.filter((r: any) => r.is_passed).length;
        const failedCount = totalCandidates - passedCount;
        const totalScore = officialResults.reduce((sum: number, r: any) => sum + r.score, 0);
        const avgScore = totalScore / totalCandidates;
        const maxScore = Math.max(...officialResults.map((r: any) => r.score));
        const minScore = Math.min(...officialResults.map((r: any) => r.score));

        // Calculate Score Distribution (0-10)
        // Ranges: <5, 5-7, 7-8, 8-9, 9-10
        const distribution = [
            { name: '< 5', count: 0 },
            { name: '5 - 7', count: 0 },
            { name: '7 - 8', count: 0 },
            { name: '8 - 9', count: 0 },
            { name: '9 - 10', count: 0 },
        ];

        officialResults.forEach((r: any) => {
            const s = r.score;
            if (s < 5) distribution[0].count++;
            else if (s < 7) distribution[1].count++;
            else if (s < 8) distribution[2].count++;
            else if (s < 9) distribution[3].count++;
            else distribution[4].count++;
        });

        // Compute missing candidates if we have expectedUsers list
        let expectedCount = expectedUsers.length;
        if (!sessionId) {
            allAttemptedUsernames = new Set(officialResults.map((r: any) => r.user?.username));
        }
        const missingCandidates = expectedCount > 0 ? expectedUsers.filter(u => !allAttemptedUsernames.has(u.username)) : [];

        return NextResponse.json({
            summary: {
                total: totalCandidates,
                passed: passedCount,
                failed: failedCount,
                avgScore: parseFloat(avgScore.toFixed(2)),
                maxScore,
                minScore,
                passRate: parseFloat(((passedCount / totalCandidates) * 100).toFixed(1)),
            },
            distribution,
            results: officialResults.map((r: any) => ({
                id: r.id,
                full_name: r.user.full_name,
                username: r.user.username,
                department: r.user.department,
                session_name: r.session?.name || 'N/A',
                exam_title: r.exam.title,
                score: r.score,
                is_passed: r.is_passed,
                submitted_at: r.submitted_at,
            })),
            expectedCount,
            attemptedCount: allAttemptedUsernames.size,
            missingCount: missingCandidates.length,
            missingCandidates: missingCandidates.map(u => ({ id: u.id, username: u.username, full_name: u.full_name, department: u.department })),
        });

    } catch (error) {
        console.error('Statistics API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
