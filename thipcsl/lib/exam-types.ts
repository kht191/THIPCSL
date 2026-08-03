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
  part1Label: string;      // "Yêu cầu chung"
  part2Label: string;      // "Yêu cầu riêng"
  part1Correct: number;
  part1Total: number;
  part1Percent: number;    // Phần trăm thực (VD: 66.666...), không làm tròn
  part1PassPercent: number; // Tỷ lệ yêu cầu (VD: 70)
  part1Score: number;      // Thang 10 (giữ để tham khảo/thống kê)
  part1Passed: boolean;
  part2Correct: number;
  part2Total: number;
  part2Percent: number;    // Phần trăm thực
  part2PassPercent: number; // Tỷ lệ yêu cầu
  part2Score: number;      // Thang 10 (giữ để tham khảo/thống kê)
  part2Passed: boolean;
  overallPassed: boolean;
}

/** Hàm tính điểm 2 phần – dùng topicId khớp matrix (luôn đúng, không bị stale)
 *  So sánh phần trăm thực (không làm tròn) với ngưỡng đỗ.
 */
export function calculateTwoPartScore(
  part1Matrix: Record<string, number>,
  part2Matrix: Record<string, number>,
  answers: Record<string, string[]>,
  questions: Array<{ id: string; correct_answer: string; topicId: string | null }>,
  parseCorrectAnswerValue: (ans: string) => string[],
  part1PassPercent: number,
  part2PassPercent: number,
  part1Label?: string,
  part2Label?: string
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

  // Tính phần trăm thực (không làm tròn)
  const part1Percent = part1Total > 0 ? (part1Correct / part1Total) * 100 : 0;
  const part2Percent = part2Total > 0 ? (part2Correct / part2Total) * 100 : 0;

  // So sánh dùng giá trị phần trăm thực
  const part1Passed = part1Percent >= part1PassPercent;
  const part2Passed = part2Percent >= part2PassPercent;

  // Điểm thang 10 (giữ để tham khảo/thống kê, không dùng để xác định đạt)
  const part1Score = part1Total > 0 ? (part1Correct / part1Total) * 10 : 0;
  const part2Score = part2Total > 0 ? (part2Correct / part2Total) * 10 : 0;

  return {
    twoPartScore: {
      part1Label: part1Label || 'Yêu cầu chung',
      part2Label: part2Label || 'Yêu cầu riêng',
      part1Correct,
      part1Total,
      part1Percent,
      part1PassPercent,
      part1Score,
      part1Passed,
      part2Correct,
      part2Total,
      part2Percent,
      part2PassPercent,
      part2Score,
      part2Passed,
      overallPassed: part1Passed && part2Passed,
    },
    isPassed: part1Passed && part2Passed,
  };
}
