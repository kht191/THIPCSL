// Shared type definitions for Two-Part Exam module
// Sử dụng chung giữa API routes và UI components

export const EXAM_TYPES = {
  OFFICIAL: 'OFFICIAL',
  PRACTICE: 'PRACTICE',
  TWO_PART: 'TWO_PART',
} as const;

export type ExamType = (typeof EXAM_TYPES)[keyof typeof EXAM_TYPES];

/** Cấu hình đề thi 2 phần, lưu trong Exam.settings.twoPartConfig */
export interface TwoPartConfig {
  part1Label: string;       // "Yêu cầu chung"
  part2Label: string;       // "Yêu cầu riêng"
  part1PassPercent: number; // e.g. 70
  part2PassPercent: number; // e.g. 70
  part1QuestionIds: string[];
  part2QuestionIds: string[];
}

/** Kết quả chấm điểm 2 phần, lưu trong Result.details.twoPartScore */
export interface TwoPartScore {
  part1Correct: number;
  part1Total: number;
  part1Score: number;    // out of 10
  part1Passed: boolean;
  part2Correct: number;
  part2Total: number;
  part2Score: number;    // out of 10
  part2Passed: boolean;
  overallPassed: boolean;
}

/** Hàm tính điểm 2 phần – dùng topicId khớp matrix (luôn đúng, không bị stale) */
export function calculateTwoPartScore(
  part1Matrix: Record<string, number>,
  part2Matrix: Record<string, number>,
  answers: Record<string, string[]>,
  questions: Array<{ id: string; correct_answer: string; topicId: string | null }>,
  parseCorrectAnswerValue: (ans: string) => string[],
  part1PassPercent: number,
  part2PassPercent: number
): { twoPartScore: TwoPartScore; isPassed: boolean } {
  const part1Topics = new Set(Object.keys(part1Matrix));
  const part2Topics = new Set(Object.keys(part2Matrix));

  let part1Correct = 0;
  let part1Total = 0;
  let part2Correct = 0;
  let part2Total = 0;

  questions.forEach(q => {
    const userAns = (answers[q.id] || []).map(v => String(v).trim().toUpperCase());
    const correctAns = parseCorrectAnswerValue(q.correct_answer);

    const setA = new Set(userAns);
    const setB = new Set(correctAns);
    const isCorrect = setA.size === setB.size && [...setA].every(value => setB.has(value as string));

    if (q.topicId && part1Topics.has(q.topicId)) {
      part1Total++;
      if (isCorrect) part1Correct++;
    }
    if (q.topicId && part2Topics.has(q.topicId)) {
      part2Total++;
      if (isCorrect) part2Correct++;
    }
  });

  const part1Score = part1Total > 0 ? (part1Correct / part1Total) * 10 : 0;
  const part2Score = part2Total > 0 ? (part2Correct / part2Total) * 10 : 0;

  const part1Passed = part1Score >= ((part1PassPercent / 100) * 10);
  const part2Passed = part2Score >= ((part2PassPercent / 100) * 10);

  return {
    twoPartScore: {
      part1Correct,
      part1Total,
      part1Score,
      part1Passed,
      part2Correct,
      part2Total,
      part2Score,
      part2Passed,
      overallPassed: part1Passed && part2Passed,
    },
    isPassed: part1Passed && part2Passed,
  };
}
