import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

function normalizeText(value: unknown): string {
    return String(value ?? '').trim();
}

interface TopicEntry {
    topicName: string;
    count: number;
    part: number; // 1 or 2 for TWO_PART, 0 for OFFICIAL (ignored)
}

interface ExamRow {
    row: number;
    title: string;
    duration: number;
    type: string;
    passScore: number;
    passPercentP1: number;
    passPercentP2: number;
    maxAttempts: number;
    maxViolations: number;
    topics: TopicEntry[];
}

interface ImportIssue {
    row: number;
    type: 'error' | 'warning';
    message: string;
}

function getCell(row: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const val = row[k];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
        }
    }
    return '';
}

function parseExamRow(row: Record<string, unknown>, rowIndex: number): ExamRow {
    const typeRaw = getCell(row, ['Loại đề', 'Loai de', 'Type', 'type']).toUpperCase();
    const type = typeRaw === 'TWO_PART' || typeRaw === '2 PHẦN' || typeRaw === '2 PHAN' || typeRaw === '2_PHẦN' || typeRaw === '2_PHAN' ? 'TWO_PART' : 'OFFICIAL';

    // Scan for topic columns: "Chủ đề 1", "Số câu 1", "Chủ đề 2", "Số câu 2", ...
    const topics: TopicEntry[] = [];
    const allKeys = Object.keys(row);

    for (let i = 1; i <= 20; i++) {
        const topicKey = allKeys.find(k => {
            const t = k.trim();
            // Match "Chủ đề N" or "Chu de N" or "Topic N" or "Chủ đề N" variations
            const patterns = [
                `Chủ đề ${i}`, `Chu de ${i}`, `Chủ đề${i}`, `Chude${i}`,
                `Topic ${i}`, `topic ${i}`, `Topic${i}`, `topic${i}`,
            ];
            return patterns.some(p => t === p || t.startsWith(p));
        });

        const countKey = allKeys.find(k => {
            const t = k.trim();
            const patterns = [
                `Số câu ${i}`, `So cau ${i}`, `Số câu${i}`, `Socau${i}`,
                `Số câu hỏi ${i}`, `So cau hoi ${i}`, `Số câu hỏi${i}`,
                `Question Count ${i}`, `Count ${i}`, `count ${i}`,
            ];
            return patterns.some(p => t === p || t.startsWith(p));
        });

        if (topicKey) {
            const topicName = normalizeText(row[topicKey]);
            const count = countKey ? (parseInt(String(row[countKey])) || 0) : 0;

            // Find "Phần N" column for this topic pair
            const partKey = allKeys.find(k => {
                const t = k.trim();
                const patterns = [
                    `Phần ${i}`, `Phan ${i}`, `Phần${i}`, `Phan${i}`,
                    `Part ${i}`, `part ${i}`, `Part${i}`, `part${i}`,
                ];
                return patterns.some(p => t === p);
            });
            const part = partKey ? (parseInt(String(row[partKey])) || 1) : 1;

            if (topicName && count > 0) {
                topics.push({ topicName, count, part });
            }
        }
    }

    return {
        row: rowIndex + 1,
        title: getCell(row, ['Tên đề thi', 'Ten de thi', 'Title', 'title']),
        duration: parseInt(getCell(row, ['Thời gian (phút)', 'Thoi gian (phut)', 'Thời gian', 'Thoi gian', 'Duration', 'duration'])) || 0,
        type,
        passScore: parseFloat(getCell(row, ['Điểm đạt', 'Diem dat', 'Pass Score', 'pass_score'])) || 5.0,
        passPercentP1: parseInt(getCell(row, ['Điểm đạt P1 (%)', 'Diem dat P1 (%)', 'Pass% P1', 'pass_p1'])) || 70,
        passPercentP2: parseInt(getCell(row, ['Điểm đạt P2 (%)', 'Diem dat P2 (%)', 'Pass% P2', 'pass_p2'])) || 70,
        maxAttempts: parseInt(getCell(row, ['Số lần thi', 'So lan thi', 'Max Attempts', 'max_attempts'])) || 1,
        maxViolations: parseInt(getCell(row, ['Vi phạm tối đa', 'Vi pham toi da', 'Max Violations', 'max_violations'])) || 3,
        topics,
    };
}

async function validateTopic(rowIndex: number, topicName: string, count: number): Promise<ImportIssue[]> {
    const issues: ImportIssue[] = [];

    // Check if format is "Parent > Child" to distinguish duplicate child names
    let parentName = '';
    let childName = topicName;
    if (topicName.includes('>')) {
        const parts = topicName.split('>').map(s => s.trim());
        parentName = parts[0];
        childName = parts[1] || '';
    }

    let topic: any = null;

    if (parentName) {
        // Find parent first
        const parent = await prisma.topic.findFirst({
            where: { name: parentName, parentId: null },
            select: { id: true, name: true },
        });

        if (!parent) {
            issues.push({
                row: rowIndex,
                type: 'error',
                message: `Chủ đề cha "${parentName}" không tồn tại (phải là chủ đề gốc)`,
            });
            return issues;
        }

        // Find child under this parent
        topic = await prisma.topic.findFirst({
            where: { name: childName, parentId: parent.id },
            select: { id: true, name: true, parentId: true },
        });

        if (!topic) {
            // Check if child exists but under different parent
            const childAnywhere = await prisma.topic.findFirst({
                where: { name: childName },
                include: { parent: true },
            });
            if (childAnywhere?.parent) {
                issues.push({
                    row: rowIndex,
                    type: 'error',
                    message: `"${childName}" thuộc "${childAnywhere.parent.name}", không phải "${parentName}". Gợi ý: dùng "${childAnywhere.parent.name} > ${childName}"`,
                });
            } else {
                issues.push({
                    row: rowIndex,
                    type: 'error',
                    message: `Chủ đề "${childName}" không tồn tại trong "${parentName}"`,
                });
            }
            return issues;
        }
    } else {
        // No parent specified - find topic by name
        const topics = await prisma.topic.findMany({
            where: { name: topicName },
            include: { parent: true },
        });

        if (topics.length === 0) {
            issues.push({
                row: rowIndex,
                type: 'error',
                message: `Chủ đề "${topicName}" không tồn tại trong hệ thống`,
            });
            return issues;
        }

        if (topics.length > 1) {
            // Multiple topics with same name - show options
            const suggestions = topics
                .map(t => t.parent ? `"${t.parent.name} > ${t.name}"` : `"${t.name}" (gốc)`)
                .join(', ');
            issues.push({
                row: rowIndex,
                type: 'error',
                message: `"${topicName}" có ${topics.length} kết quả trùng tên. Vui lòng ghi rõ: ${suggestions}`,
            });
            return issues;
        }

        topic = topics[0];
    }

    // Check question count
    const questionCount = await prisma.question.count({
        where: { topicId: topic.id },
    });

    if (questionCount < count) {
        issues.push({
            row: rowIndex,
            type: 'error',
            message: `Không đủ câu hỏi cho chủ đề "${topicName}". Cần ${count}, hiện có ${questionCount}`,
        });
    }

    return issues;
}

async function resolveTopic(topicName: string): Promise<string | null> {
    let parentName = '';
    let childName = topicName;
    if (topicName.includes('>')) {
        const parts = topicName.split('>').map(s => s.trim());
        parentName = parts[0];
        childName = parts[1] || '';
    }

    if (parentName) {
        const parent = await prisma.topic.findFirst({
            where: { name: parentName, parentId: null },
            select: { id: true },
        });
        if (!parent) return null;

        const child = await prisma.topic.findFirst({
            where: { name: childName, parentId: parent.id },
            select: { id: true },
        });
        return child?.id || null;
    }

    // Find unique topic by name
    const topic = await prisma.topic.findFirst({
        where: { name: topicName },
        select: { id: true },
    });
    return topic?.id || null;
}

async function selectQuestions(m: Record<string, number>): Promise<string[]> {
    const ids: string[] = [];
    for (const [topicId, count] of Object.entries(m)) {
        const quantity = Number(count);
        if (quantity > 0) {
            const questions = await prisma.question.findMany({
                where: { topicId },
                select: { id: true },
            });
            if (questions.length < quantity) {
                throw new Error(`Không đủ câu hỏi cho chủ đề ${topicId}. Cần ${quantity}, có ${questions.length}`);
            }
            const shuffled = questions.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, quantity).map(q => q.id);
            ids.push(...selected);
        }
    }
    return ids;
}

async function resolveMatrices(topics: TopicEntry[]): Promise<{
    matrix: Record<string, number>;
    part1Matrix: Record<string, number>;
    part2Matrix: Record<string, number>;
}> {
    const matrix: Record<string, number> = {};
    const part1Matrix: Record<string, number> = {};
    const part2Matrix: Record<string, number> = {};

    for (const t of topics) {
        const topicId = await resolveTopic(t.topicName);
        if (!topicId) continue;

        matrix[topicId] = (matrix[topicId] || 0) + t.count;

        if (t.part === 2) {
            part2Matrix[topicId] = (part2Matrix[topicId] || 0) + t.count;
        } else {
            part1Matrix[topicId] = (part1Matrix[topicId] || 0) + t.count;
        }
    }

    return { matrix, part1Matrix, part2Matrix };
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const validateOnly = formData.get('validateOnly') === 'true';

        if (!file) {
            return NextResponse.json({ error: 'Vui lòng chọn file Excel' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

        if (data.length === 0) {
            return NextResponse.json({ error: 'File Excel không có dữ liệu' }, { status: 400 });
        }

        // Parse all rows
        const rows = data.map((r, i) => parseExamRow(r, i));
        const totalRows = rows.length;

        // Get existing exam titles
        const existingExams = await prisma.exam.findMany({ select: { title: true } });
        const existingTitles = new Set(existingExams.map(e => e.title.toLowerCase()));

        // Validate all rows
        const allIssues: ImportIssue[] = [];
        const validRows: ExamRow[] = [];

        for (const row of rows) {
            let hasError = false;

            if (!row.title) {
                allIssues.push({ row: row.row, type: 'error', message: 'Tên đề thi không được để trống' });
                hasError = true;
            } else if (existingTitles.has(row.title.toLowerCase())) {
                allIssues.push({ row: row.row, type: 'error', message: `Đề thi "${row.title}" đã tồn tại` });
                hasError = true;
            }

            if (!row.duration || row.duration <= 0) {
                allIssues.push({ row: row.row, type: 'error', message: 'Thời gian thi không hợp lệ' });
                hasError = true;
            }

            if (row.topics.length === 0) {
                allIssues.push({ row: row.row, type: 'error', message: 'Chưa có chủ đề nào (cần ít nhất 1 cặp Chủ đề + Số câu)' });
                hasError = true;
            }

            for (const t of row.topics) {
                const topicIssues = await validateTopic(row.row, t.topicName, t.count);
                allIssues.push(...topicIssues);
                if (topicIssues.some(i => i.type === 'error')) hasError = true;
            }

            if (!hasError) {
                validRows.push(row);
            }
        }

        const errorCount = allIssues.filter(i => i.type === 'error').length;
        const warningCount = allIssues.filter(i => i.type === 'warning').length;

        if (validateOnly) {
            return NextResponse.json({
                success: true,
                canImport: errorCount === 0,
                totalRows,
                validRows: validRows.length,
                errorCount,
                warningCount,
                issues: allIssues,
            });
        }

        if (errorCount > 0) {
            return NextResponse.json({
                success: false,
                error: `Có ${errorCount} lỗi. Vui lòng rà soát và sửa lại.`,
                canImport: false,
                totalRows,
                errorCount,
                warningCount,
                issues: allIssues,
            }, { status: 400 });
        }

        // Create exams
        let createdCount = 0;
        const errors: string[] = [];

        for (const row of validRows) {
            try {
                const { matrix, part1Matrix, part2Matrix } = await resolveMatrices(row.topics);
                if (Object.keys(matrix).length === 0) {
                    errors.push(`Dòng ${row.row} "${row.title}": Không tìm thấy chủ đề hợp lệ`);
                    continue;
                }

                let selectedQuestionIds: string[];
                let settings: any;

                if (row.type === 'TWO_PART') {
                    if (Object.keys(part1Matrix).length === 0) {
                        errors.push(`Dòng ${row.row} "${row.title}": Phần 1 chưa có chủ đề nào`);
                        continue;
                    }
                    const part1Ids = await selectQuestions(part1Matrix);
                    const part2Ids = await selectQuestions(part2Matrix);
                    selectedQuestionIds = [...part1Ids, ...part2Ids];

                    if (selectedQuestionIds.length > 50) {
                        errors.push(`"${row.title}": Tổng số câu hỏi vượt quá 50 (${selectedQuestionIds.length})`);
                        continue;
                    }
                    settings = {
                        part1Matrix,
                        part2Matrix,
                        twoPartConfig: {
                            part1Label: 'Yêu cầu chung',
                            part2Label: 'Yêu cầu riêng',
                            part1PassPercent: row.passPercentP1,
                            part2PassPercent: row.passPercentP2,
                            part1QuestionIds: part1Ids,
                            part2QuestionIds: part2Ids,
                        },
                    };
                } else {
                    selectedQuestionIds = await selectQuestions(matrix);
                    settings = { matrix };
                }

                if (selectedQuestionIds.length === 0) {
                    errors.push(`"${row.title}": Không có câu hỏi nào được chọn`);
                    continue;
                }

                await prisma.exam.create({
                    data: {
                        title: row.title,
                        duration: row.duration,
                        max_attempts: row.maxAttempts,
                        max_violations: row.maxViolations,
                        question_ids: JSON.stringify(selectedQuestionIds),
                        allowed_users: JSON.stringify([]),
                        status: 'OPEN',
                        type: row.type,
                        pass_score: row.passScore,
                        settings: JSON.stringify(settings),
                    },
                });

                createdCount++;
            } catch (err: any) {
                errors.push(`"${row.title}": ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            count: createdCount,
            totalRows,
            errors: errors.length > 0 ? errors : undefined,
            issues: allIssues,
        });
    } catch (error: any) {
        console.error('Import exams error:', error?.message || error);
        return NextResponse.json(
            { error: `Lỗi server khi import đề thi: ${error?.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
}
