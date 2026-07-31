import { prisma } from '@/lib/prisma';
import { parseCorrectAnswerValue } from '@/lib/question-options';
import { calculateTwoPartScore } from '@/lib/exam-types';

export async function autoSubmitExam(resultId: string) {
    try {
        const result = await prisma.result.findUnique({
            where: { id: resultId },
            include: { exam: true }
        });

        if (!result || result.status !== 'IN_PROGRESS') {
            return null;
        }

        const exam = result.exam;
        let savedData: any = {};
        try {
            savedData = JSON.parse(result.details || '{}');
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

        const answers = savedData.answers || {};

        let correctCount = 0;
        let twoPartScore = null;

        // TWO_PART: Tính điểm riêng cho từng phần (cả OFFICIAL và PRACTICE có twoPartConfig)
        const isTwoPart = exam.type === 'TWO_PART' ||
            (exam.type === 'PRACTICE' && (() => {
                try { const s = JSON.parse(exam.settings || '{}'); return !!s.twoPartConfig; } catch { return false; }
            })());

        if (isTwoPart) {
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
                const result2 = calculateTwoPartScore(
                    part1Matrix,
                    part2Matrix,
                    answers,
                    questions,
                    parseCorrectAnswerValue,
                    twoPartConfig.part1PassPercent || 70,
                    twoPartConfig.part2PassPercent || 70
                );
                twoPartScore = result2.twoPartScore;
                correctCount = twoPartScore.part1Correct + twoPartScore.part2Correct;
                savedData.twoPartScore = twoPartScore;
            }
        }

        if (!twoPartScore) {
            // Cách tính cũ
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

        const updatedResult = await prisma.result.update({
            where: { id: result.id },
            data: {
                score: score,
                is_passed: isPassed,
                status: 'COMPLETED',
                details: JSON.stringify(savedData),
                submitted_at: new Date()
            }
        });

        return updatedResult;
    } catch (error) {
        console.error('Error in autoSubmitExam:', error);
        throw error;
    }
}
