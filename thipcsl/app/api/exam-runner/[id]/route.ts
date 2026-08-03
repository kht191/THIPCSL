import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { autoSubmitExam } from '@/lib/exam-helper';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { parseCorrectAnswerValue } from '@/lib/question-options';
import { calculateTwoPartScore } from '@/lib/exam-types';

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

        // Fetch user info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, full_name: true, department: true, field: true }
        });

        // Fetch Exam
        const exam = await prisma.exam.findUnique({
            where: { id },
        });

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        if (exam.status !== 'OPEN') {
            return NextResponse.json({ error: 'Exam is closed' }, { status: 403 });
        }

        // Check permission
        if (exam.type === 'PRACTICE') {
            // Public practice exams (practiceSourceId != null) are accessible to all
            if (exam.practiceSourceId) {
                // Public practice - allow all authenticated users
            } else if (exam.creatorId !== userId) {
                return NextResponse.json({ error: 'Bạn không có quyền truy cập đề ôn tập này' }, { status: 403 });
            }
        } else {
            try {
                const allowed = JSON.parse(exam.allowed_users);
                if (!allowed.includes(userId)) {
                    return NextResponse.json({ error: 'You are not allowed to take this exam' }, { status: 403 });
                }
            } catch (e) {
                return NextResponse.json({ error: 'Permission error' }, { status: 403 });
            }
        }

        // Check attempts
        const existingResults = await prisma.result.findMany({
            where: { user_id: userId, exam_id: id },
            orderBy: { submitted_at: 'desc' }
        });

        // [NEW] Check if user is doing ANOTHER exam (Official only)
        if (exam.type !== 'PRACTICE') {
            const otherActiveExams = await prisma.result.findFirst({
                where: {
                    user_id: userId,
                    status: 'IN_PROGRESS',
                    exam_id: { not: id }, // Not this exam
                    exam: {
                        type: { not: 'PRACTICE' } // Official exams only
                    }
                },
                include: { exam: true }
            });

            if (otherActiveExams) {
                return NextResponse.json({
                    error: `Bạn đang thực hiện bài thi "${otherActiveExams.exam.title}". Vui lòng nộp bài đó trước khi bắt đầu bài thi mới.`
                }, { status: 403 });
            }
        }

        // Check for IN_PROGRESS result
        let inProgressResult = existingResults.find(r => r.status === 'IN_PROGRESS');

        if (inProgressResult) {
            // Check if time is up
            const startTime = new Date(inProgressResult.started_at);
            const durationMs = exam.duration * 60 * 1000;
            const now = new Date();

            if (now.getTime() > startTime.getTime() + durationMs + 2 * 60 * 1000) {
                await autoSubmitExam(inProgressResult.id);

                return NextResponse.json({
                    error: 'Thời gian làm bài đã hết. Hệ thống đã tự động nộp bài.',
                    submitted: true,
                    resultId: inProgressResult.id
                }, { status: 403 });
            }
        } else {
            // [FIX] Check if client has old sessionToken from a previous attempt
            // Skip session conflict checks for PRACTICE exams (ôn tập không giới hạn)
            if (exam.type !== 'PRACTICE') {
                const { searchParams } = new URL(request.url);
                const providedToken = searchParams.get('sessionToken');

                // Only check session conflicts if there are existing results
                if (providedToken && existingResults.length > 0) {
                    // CASE 1: Check if this EXACT token was just completed (prevent double-submit)
                    // Only reject if completed within last 1 minute (not 5 minutes)
                    const justCompletedResult = existingResults.find(r =>
                        r.session_token === providedToken &&
                        r.status === 'COMPLETED' &&
                        (new Date().getTime() - new Date(r.submitted_at).getTime() < 1 * 60 * 1000) // 1 minute
                    );

                    if (justCompletedResult) {
                        // This session was JUST completed - prevent double-submit or immediate F5
                        return NextResponse.json({
                            error: 'Bài thi đã được nộp. Phiên làm việc của bạn đã kết thúc.',
                            submitted: true,
                            resultId: justCompletedResult.id
                        }, { status: 403 });
                    }

                    // CASE 2: Check for session takeover (different token completed recently)
                    // Only check within 2 minutes to allow retakes after that
                    const recentTakeoverResult = existingResults.find(r =>
                        r.session_token !== providedToken &&
                        r.status === 'COMPLETED' &&
                        (new Date().getTime() - new Date(r.submitted_at).getTime() < 2 * 60 * 1000) // 2 minutes
                    );

                    if (recentTakeoverResult) {
                        // Another session took over and completed the exam recently
                        return NextResponse.json({
                            error: 'Phiên làm việc của bạn đã bị gián đoạn bởi một phiên đăng nhập khác và bài thi đã được nộp.',
                            submitted: true,
                            resultId: recentTakeoverResult.id
                        }, { status: 403 });
                    }
                }
            }
            // If no recent conflicts (or PRACTICE exam), proceed to create new exam (for retakes)

            // Check max attempts for COMPLETED exams
            const completedCount = existingResults.filter(r => r.status !== 'IN_PROGRESS').length;
            if (exam.type !== 'PRACTICE' && completedCount >= (exam.max_attempts || 1)) {
                // Get the latest result ID to redirect to
                const latestResult = existingResults[0];
                return NextResponse.json({
                    error: `Bạn đã hết số lần làm bài (${completedCount}/${exam.max_attempts || 1})`,
                    submitted: true,
                    resultId: latestResult?.id
                }, { status: 403 });
            }

            // Create new IN_PROGRESS result with shuffled order ONCE
            const now = new Date();
            const activeSession = exam.type !== 'PRACTICE' ? await prisma.examSession.findFirst({
                where: {
                    exams: { some: { id } },
                    startTime: { lte: now },
                    endTime: { gte: now },
                    status: 'ACTIVE'
                }
            }) : null;

            // Get and shuffle questions ONCE
            let questionIds: string[] = [];
            try {
                questionIds = JSON.parse(exam.question_ids);
            } catch (e) {
                questionIds = [];
            }

            // For PRACTICE exams, regenerate questions from matrix for fresh questions each retake
            if (exam.type === 'PRACTICE' && questionIds.length > 0) {
                try {
                    const settings = JSON.parse(exam.settings || '{}');

                    // Check if this is a TWO_PART practice exam (has part1Matrix + part2Matrix)
                    const isTwoPartPractice = !!(settings.part1Matrix || settings.part2Matrix);

                    if (isTwoPartPractice) {
                        // ─── TWO_PART: Regenerate each part separately, update twoPartConfig ───
                        const part1Matrix: Record<string, number> = settings.part1Matrix || {};
                        const part2Matrix: Record<string, number> = settings.part2Matrix || {};

                        async function pickFromMatrix(m: Record<string, number>): Promise<string[]> {
                            const ids: string[] = [];
                            for (const [topicId, count] of Object.entries(m)) {
                                const n = Number(count);
                                if (n <= 0) continue;
                                const pool = await prisma.question.findMany({
                                    where: { topicId },
                                    select: { id: true },
                                });
                                if (pool.length < n) {
                                    console.warn(`[REGENERATE] Part: not enough questions for topic ${topicId}: need ${n}, have ${pool.length}`);
                                }
                                const selected = shuffleArray(pool).slice(0, Math.min(n, pool.length)).map(q => q.id);
                                ids.push(...selected);
                            }
                            return ids;
                        }

                        const freshPart1Ids = await pickFromMatrix(part1Matrix);
                        const freshPart2Ids = await pickFromMatrix(part2Matrix);
                        const allFreshIds = [...freshPart1Ids, ...freshPart2Ids];

                        if (allFreshIds.length > 0) {
                            questionIds = allFreshIds;
                            // Update twoPartConfig to match new question IDs
                            const updatedTwoPartConfig = {
                                ...(settings.twoPartConfig || {}),
                                part1QuestionIds: freshPart1Ids,
                                part2QuestionIds: freshPart2Ids,
                            };
                            const updatedSettings = {
                                ...settings,
                                twoPartConfig: updatedTwoPartConfig,
                            };
                            await prisma.exam.update({
                                where: { id },
                                data: {
                                    question_ids: JSON.stringify(allFreshIds),
                                    settings: JSON.stringify(updatedSettings),
                                },
                            });
                        }
                    } else {
                        // ─── SINGLE PART: Normalize matrix, regenerate all questions ───
                        let normalizedMatrix: { topicIds: string[]; count: number }[] = [];

                        if (Array.isArray(settings)) {
                            // Format 1: settings itself is an array (legacy)
                            normalizedMatrix = settings;
                        } else if (Array.isArray(settings.matrix)) {
                            // Format 2: settings.matrix is an array (from forked exams)
                            normalizedMatrix = settings.matrix;
                        } else if (settings.matrix && typeof settings.matrix === 'object') {
                            // Format 3: settings.matrix is a Record<string, number> (from OFFICIAL published directly)
                            for (const [topicId, count] of Object.entries(settings.matrix)) {
                                if (Number(count) > 0) {
                                    normalizedMatrix.push({ topicIds: [topicId], count: Number(count) });
                                }
                            }
                        }

                        if (normalizedMatrix.length > 0) {
                            const freshIds: string[] = [];
                            for (const item of normalizedMatrix) {
                                const topicIds = item.topicIds || [];
                                const count = item.count || 0;
                                if (topicIds.length === 0 || count <= 0) continue;
                                const pool = await prisma.question.findMany({
                                    where: { topicId: { in: topicIds } },
                                    select: { id: true },
                                });
                                if (pool.length < count) {
                                    console.warn(`[REGENERATE] Not enough questions for topics ${topicIds.join(',')}: need ${count}, have ${pool.length}`);
                                }
                                const shuffled = shuffleArray(pool);
                                const selected = shuffled.slice(0, Math.min(count, pool.length)).map(q => q.id);
                                freshIds.push(...selected);
                            }
                            if (freshIds.length > 0) {
                                questionIds = freshIds;
                                await prisma.exam.update({
                                    where: { id },
                                    data: { question_ids: JSON.stringify(freshIds) },
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('[REGENERATE] Failed to regenerate questions:', e);
                    /* fallback to existing question_ids */
                }
            }

            const questions = await prisma.question.findMany({
                where: { id: { in: questionIds } }
            });

            const shuffledQuestions = shuffleArray(questions);

            // Shuffle options for each question and save order
            const optionsOrder: Record<string, string[]> = {};
            shuffledQuestions.forEach(q => {
                try {
                    const opts = JSON.parse(q.options);
                    const keys = Object.keys(opts);
                    const shuffledKeys = shuffleArray(keys);
                    optionsOrder[q.id] = shuffledKeys;
                } catch (e) {
                    optionsOrder[q.id] = [];
                }
            });

            // [FIX] Delete any leftover IN_PROGRESS for this user+exam to prevent duplicates
            // (race condition: 2 simultaneous GET requests both see no IN_PROGRESS and both create one)
            await prisma.result.deleteMany({
                where: {
                    user_id: userId,
                    exam_id: id,
                    status: 'IN_PROGRESS',
                },
            });

            // Save shuffled order in details
            const initialDetails = {
                answers: {},
                questionOrder: shuffledQuestions.map(q => q.id),
                optionsOrder: optionsOrder
            };

            console.log('[DEBUG] Creating new IN_PROGRESS with order:', {
                questionOrder: initialDetails.questionOrder,
                optionsOrderKeys: Object.keys(optionsOrder)
            });

            // [FIX] Generate session_token upfront to avoid race-condition crash
            // (previously created without token, then updated — if concurrent request
            //  deleted this result, the update would 500)
            const newSessionToken = uuidv4();
            const sessionIdForNewResult = activeSession ? activeSession.id : null;

            inProgressResult = await prisma.result.create({
                data: {
                    user_id: userId,
                    exam_id: id,
                    score: 0,
                    status: 'IN_PROGRESS',
                    session_id: sessionIdForNewResult,
                    session_token: newSessionToken,
                    details: JSON.stringify(initialDetails),
                    started_at: now,
                    submitted_at: now
                }
            });

            // [FIX] Safety cleanup: delete any other IN_PROGRESS created by a race condition
            // Keep only the one we just created (newest)
            await prisma.result.deleteMany({
                where: {
                    user_id: userId,
                    exam_id: id,
                    status: 'IN_PROGRESS',
                    id: { not: inProgressResult.id },
                },
            });
        }

        // Generate or reuse session token
        const { searchParams } = new URL(request.url);
        const providedToken = searchParams.get('sessionToken');

        let sessionToken = inProgressResult.session_token;

        if (!sessionToken || (providedToken && providedToken !== sessionToken)) {
            if (!providedToken || providedToken !== sessionToken) {
                sessionToken = uuidv4();
                try {
                    await prisma.result.update({
                        where: { id: inProgressResult.id },
                        data: { session_token: sessionToken }
                    });
                } catch (updateError) {
                    // Result might have been deleted by concurrent cleanup — reload it
                    console.warn('[WARN] session_token update failed, reloading result:', updateError);
                    const reloaded = await prisma.result.findFirst({
                        where: { user_id: userId, exam_id: id, status: 'IN_PROGRESS' }
                    });
                    if (reloaded) {
                        inProgressResult = reloaded;
                        sessionToken = reloaded.session_token;
                        if (!sessionToken) {
                            sessionToken = uuidv4();
                            await prisma.result.update({
                                where: { id: reloaded.id },
                                data: { session_token: sessionToken }
                            });
                        }
                    } else {
                        // No active result at all — recreate
                        sessionToken = uuidv4();
                        inProgressResult = await prisma.result.create({
                            data: {
                                user_id: userId, exam_id: id, score: 0,
                                status: 'IN_PROGRESS',
                                session_token: sessionToken,
                                details: JSON.stringify({ answers: {}, questionOrder: [], optionsOrder: {} }),
                                started_at: new Date(), submitted_at: new Date()
                            }
                        });
                    }
                }
            }
        }

        // Load saved question order from IN_PROGRESS result
        let savedData: any = { answers: {}, questionOrder: [], optionsOrder: {} };
        try {
            savedData = JSON.parse(inProgressResult.details || '{}');
            console.log('[DEBUG] Loaded saved data:', JSON.stringify(savedData, null, 2));
        } catch (e) {
            savedData = { answers: {}, questionOrder: [], optionsOrder: {} };
            console.log('[DEBUG] Failed to parse, using fallback');
        }

        // Fetch questions in saved order
        let questionIds: string[] = savedData.questionOrder || [];
        console.log('[DEBUG] Question IDs from saved order:', questionIds);
        if (questionIds.length === 0) {
            try {
                questionIds = JSON.parse(exam.question_ids);
                console.log('[DEBUG] No saved order, using exam.question_ids:', questionIds);
            } catch (e) {
                questionIds = [];
            }
        }

        const questions = await prisma.question.findMany({
            where: { id: { in: questionIds } }
        });

        // Sort questions by saved order
        const questionMap = new Map(questions.map(q => [q.id, q]));
        const orderedQuestions = questionIds.map(id => questionMap.get(id)).filter(q => q !== undefined) as any[];

        // Sanitize questions
        const sanitizedQuestions = orderedQuestions.map(q => {
            const isMultiple = parseCorrectAnswerValue(q.correct_answer).length > 1;

            // Use saved options order
            const shuffledOptions: any[] = [];
            const savedOrder = savedData.optionsOrder?.[q.id];

            try {
                const opts = JSON.parse(q.options);
                if (savedOrder && Array.isArray(savedOrder)) {
                    savedOrder.forEach((key: string) => {
                        if (opts[key] !== undefined) {
                            shuffledOptions.push({ key, content: opts[key] });
                        }
                    });
                } else {
                    Object.keys(opts).forEach(key => {
                        shuffledOptions.push({ key, content: opts[key] });
                    });
                }
            } catch (e) {
                // Empty options
            }

            return {
                id: q.id,
                content: q.content,
                options: q.options,
                shuffledOptions: shuffledOptions,
                isMultiple: isMultiple
            };
        });

        console.log('[DEBUG] Returning questions. First 3 IDs:', sanitizedQuestions.slice(0, 3).map(q => q.id));

        // TWO_PART: Trả về cấu hình 2 phần và đánh dấu part cho từng câu hỏi
        let twoPartConfig = null;
        let questionPartMap: Record<string, number> = {};
        const isTwoPartExam = exam.type === 'TWO_PART' ||
            (exam.type === 'PRACTICE' && (() => {
                try {
                    const s = JSON.parse(exam.settings || '{}');
                    // Check for twoPartConfig (unforked) or isTwoPart flag (forked)
                    return !!s.twoPartConfig || s.isTwoPart === true;
                } catch { return false; }
            })());
        if (isTwoPartExam) {
            try {
                const settings = JSON.parse(exam.settings || '{}');
                if (settings.twoPartConfig) {
                    twoPartConfig = {
                        part1Label: settings.twoPartConfig.part1Label,
                        part2Label: settings.twoPartConfig.part2Label,
                        part1PassPercent: settings.twoPartConfig.part1PassPercent,
                        part2PassPercent: settings.twoPartConfig.part2PassPercent,
                    };
                    (settings.twoPartConfig.part1QuestionIds || []).forEach((qid: string) => {
                        questionPartMap[qid] = 1;
                    });
                    (settings.twoPartConfig.part2QuestionIds || []).forEach((qid: string) => {
                        questionPartMap[qid] = 2;
                    });
                }
            } catch (e) { /* ignore */ }
        }

        const questionsWithPart = sanitizedQuestions.map(q => ({
            ...q,
            part: questionPartMap[q.id] || 0,
        }));

        return NextResponse.json({
            exam: {
                id: exam.id,
                title: exam.title,
                duration: exam.duration,
                max_violations: exam.max_violations,
                type: exam.type,
            },
            twoPartConfig: twoPartConfig,
            user: {
                username: user?.username,
                full_name: user?.full_name,
                department: user?.department,
                field: user?.field
            },
            questions: questionsWithPart,
            sessionToken: sessionToken,
            isLocked: inProgressResult?.is_locked || false,
            resultId: inProgressResult?.id,
            answers: savedData.answers || {},
            startedAt: inProgressResult?.started_at,
            serverTime: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[GET exam] Error fetching exam:', error?.message || error);
        console.error('[GET exam] Stack:', error?.stack);
        return NextResponse.json({
            error: 'Internal Server Error',
            detail: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined
        }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { answers, sessionToken } = body;

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

        const exam = await prisma.exam.findUnique({
            where: { id },
        });

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        const existingResults = await prisma.result.findMany({
            where: { user_id: userId, exam_id: id },
            orderBy: { submitted_at: 'desc' }
        });

        const inProgressResult = existingResults.find(r => r.status === 'IN_PROGRESS');

        if (!inProgressResult) {
            // Check if there is a recently completed result (e.g. within last 30 seconds)
            // This handles double-submission cases where the first request completed the exam
            // and the second request (retry/double-click) finds no IN_PROGRESS result.
            const recentlyCompleted = existingResults.find(r =>
                r.status === 'COMPLETED' &&
                (new Date().getTime() - new Date(r.submitted_at).getTime() < 30000)
            );

            if (recentlyCompleted) {
                console.log('[INFO] Detected double submission, returning existing result:', recentlyCompleted.id);
                return NextResponse.json({ success: true, score: recentlyCompleted.score, resultId: recentlyCompleted.id });
            }

            const completedCount = existingResults.filter(r => r.status !== 'IN_PROGRESS').length;
            if (exam.type !== 'PRACTICE' && completedCount >= (exam.max_attempts || 1)) {
                return NextResponse.json({ error: 'Đã hết lượt làm bài' }, { status: 400 });
            }
        }

        // [NEW] Validate Session Token (Device Switching Logic)
        if (inProgressResult && inProgressResult.session_token) {
            if (sessionToken && inProgressResult.session_token !== sessionToken) {
                return NextResponse.json({
                    error: 'Tài khoản đang được đăng nhập ở nơi khác. Phiên làm việc này đã bị hủy.',
                    code: 'SESSION_EXPIRED'
                }, { status: 409 });
            }
        }

        let savedData: any = {};
        try {
            savedData = JSON.parse(inProgressResult?.details || '{}');
        } catch (e) {
            savedData = {};
        }

        let questionIds: string[] = Array.isArray(savedData.questionOrder) ? savedData.questionOrder : [];
        try {
            if (questionIds.length === 0) {
                questionIds = JSON.parse(exam.question_ids);
            }
        } catch (e) {
            questionIds = [];
        }

        const questions = await prisma.question.findMany({
            where: { id: { in: questionIds } }
        });

        // Calculate Score
        let correctCount = 0;
        let twoPartScore = null;

        if (exam.type === 'TWO_PART' ||
            (exam.type === 'PRACTICE' && (() => {
                try { const s = JSON.parse(exam.settings || '{}'); return !!s.twoPartConfig; } catch { return false; }
            })())) {
            // Parse twoPartConfig + matrix từ settings
            let twoPartConfig: any = null;
            let part1Matrix: Record<string, number> = {};
            let part2Matrix: Record<string, number> = {};
            try {
                const settings = JSON.parse(exam.settings || '{}');
                twoPartConfig = settings.twoPartConfig;
                part1Matrix = settings.part1Matrix || {};
                part2Matrix = settings.part2Matrix || {};
            } catch (e) { /* ignore */ }

            if (twoPartConfig) {
                const result = calculateTwoPartScore(
                    part1Matrix,
                    part2Matrix,
                    answers,
                    questions,
                    parseCorrectAnswerValue,
                    twoPartConfig.part1PassPercent || 70,
                    twoPartConfig.part2PassPercent || 70,
                    twoPartConfig.part1Label || 'Yêu cầu chung',
                    twoPartConfig.part2Label || 'Yêu cầu riêng'
                );
                twoPartScore = result.twoPartScore;
                correctCount = twoPartScore.part1Correct + twoPartScore.part2Correct;
                savedData.twoPartScore = twoPartScore;
            }
        }

        if (!twoPartScore) {
            // Cách tính cũ cho OFFICIAL/PRACTICE hoặc fallback
            questions.forEach(q => {
                const userAns = (answers[q.id] || []).map((v: string) => String(v).trim().toUpperCase());
                const correctAns = parseCorrectAnswerValue(q.correct_answer);

                const setA = new Set(userAns);
                const setB = new Set(correctAns);
                if (setA.size === setB.size && [...setA].every(value => setB.has(value as string))) {
                    correctCount++;
                }
            });
        }

        const score = questions.length > 0 ? (correctCount / questions.length) * 10 : 0;
        const isPassed = twoPartScore
            ? twoPartScore.overallPassed
            : score >= (exam.pass_score || 5.0);

        let sessionId = inProgressResult?.session_id;
        if (!sessionId) {
            const now = new Date();
            const activeSession = exam.type !== 'PRACTICE' ? await prisma.examSession.findFirst({
                where: {
                    exams: { some: { id } },
                    startTime: { lte: now },
                    endTime: { gte: now },
                    status: 'ACTIVE'
                }
            }) : null;
            sessionId = activeSession ? activeSession.id : null;
        }

        // Merge answers with existing saved data (keep questionOrder and optionsOrder)
        savedData.answers = answers; // Update only answers part

        let result;
        if (inProgressResult) {
            result = await prisma.result.update({
                where: { id: inProgressResult.id },
                data: {
                    score: score,
                    is_passed: isPassed,
                    status: 'COMPLETED',
                    details: JSON.stringify(savedData), // Keep order data
                    submitted_at: new Date(),
                    session_id: sessionId
                }
            });
        } else {
            // No active exam found and not recently completed
            return NextResponse.json({ error: 'Không tìm thấy bài thi đang làm' }, { status: 400 });
        }

        return NextResponse.json({ success: true, score, resultId: result.id });

    } catch (error) {
        console.error('Error submitting exam:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
