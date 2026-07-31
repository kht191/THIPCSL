import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { parseCorrectAnswerValue, serializeCorrectAnswer, sortOptionKeys } from '@/lib/question-options';

type ImportIssue = { row: number; message: string; type: 'error' | 'warning' };
type ImportRow = Record<string, unknown>;
type QuestionCreateItem = {
    row: number;
    data: {
        content: string;
        options: string;
        correct_answer: string;
        category: string;
        topicId: string | null;
    };
};

function normalizeText(value: unknown) {
    return String(value ?? '').trim();
}

function findDuplicateOptions(options: Record<string, string>) {
    const normalized = Object.entries(options).map(([key, value]) => ({
        key,
        value: normalizeText(value).toLowerCase(),
    }));

    const seen = new Map<string, string>();
    for (const item of normalized) {
        if (!item.value) continue;
        if (seen.has(item.value)) {
            return `${seen.get(item.value)} va ${item.key}`;
        }
        seen.set(item.value, item.key);
    }
    return null;
}

function extractOptions(row: Record<string, unknown>) {
    const optionKeys = sortOptionKeys(
        Object.keys(row).filter(key => {
            const trimmed = key.trim();
            return trimmed === trimmed.toUpperCase() && /^[A-Z]+$/.test(trimmed);
        })
    );

    return optionKeys.reduce<Record<string, string>>((acc, key) => {
        const normalizedKey = key.trim().toUpperCase();
        const value = normalizeText(row[key]);
        if (value) acc[normalizedKey] = value;
        return acc;
    }, {});
}

async function resolveTopicId(topicName: string, parentTopicName: string) {
    let topicId = null;
    if (topicName) {
        const topics = await prisma.topic.findMany({
            where: { name: String(topicName) },
            include: { parent: true }
        });

        if (topics.length > 0) {
            if (parentTopicName) {
                const matched = topics.find(t => t.parent?.name === String(parentTopicName));
                if (matched) topicId = matched.id;
            } else {
                topicId = topics[0].id;
            }
        }
    }
    return topicId;
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const validateOnly = normalizeText(formData.get('validateOnly')).toLowerCase() === 'true';

        if (!file) {
            return NextResponse.json({ error: 'Chua chon file' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet) as ImportRow[];

        const questionsToCreate: QuestionCreateItem[] = [];
        const issues: ImportIssue[] = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNumber = i + 2;

            const content = row['Content'] || row['content'];
            const correctAnswer = row['Correct Answer'] || row['correct_answer'];
            const category = row['Category'] || row['category'];
            const topicName = row['Topic'] || row['topic'] || category;
            const parentTopicName = row['Parent Topic'] || row['parent_topic'];
            const options = extractOptions(row);

            if (!content || Object.keys(options).length < 2 || !correctAnswer) {
                issues.push({ row: rowNumber, type: 'error', message: 'Thieu du lieu bat buoc (Content, toi thieu 2 cot dap an, Correct Answer).' });
                continue;
            }

            const parsedCorrectAnswer = parseCorrectAnswerValue(correctAnswer);
            const invalidCorrectAnswer = parsedCorrectAnswer.find(answer => options[answer] === undefined);
            if (parsedCorrectAnswer.length === 0 || invalidCorrectAnswer) {
                issues.push({
                    row: rowNumber,
                    type: 'error',
                    message: `Dap an dung "${invalidCorrectAnswer || correctAnswer}" khong ton tai trong cac cot dap an.`
                });
                continue;
            }

            const duplicateOption = findDuplicateOptions(options);
            if (duplicateOption) {
                issues.push({
                    row: rowNumber,
                    type: 'error',
                    message: `Cac dap an bi trung nhau (${duplicateOption}). He thong se khong cho nhap.`
                });
                continue;
            }

            const topicId = await resolveTopicId(normalizeText(topicName), normalizeText(parentTopicName));
            if (topicName && !topicId) {
                issues.push({
                    row: rowNumber,
                    type: 'error',
                    message: `Chu de "${topicName}" ${parentTopicName ? `(thuoc "${parentTopicName}")` : ''} khong ton tai.`
                });
                continue;
            }

            questionsToCreate.push({
                row: rowNumber,
                data: {
                    content: normalizeText(content),
                    options: JSON.stringify(options),
                    correct_answer: serializeCorrectAnswer(parsedCorrectAnswer),
                    category: normalizeText(topicName || ''),
                    topicId: topicId
                }
            });
        }

        const errorCount = issues.filter(i => i.type === 'error').length;
        const warningCount = issues.filter(i => i.type === 'warning').length;

        if (validateOnly) {
            return NextResponse.json({
                success: errorCount === 0,
                canImport: errorCount === 0,
                totalRows: data.length,
                validRows: questionsToCreate.length,
                errorCount,
                warningCount,
                issues,
            });
        }

        if (errorCount > 0) {
            return NextResponse.json({
                error: 'Du lieu chua dat yeu cau kiem tra',
                canImport: false,
                totalRows: data.length,
                validRows: questionsToCreate.length,
                errorCount,
                warningCount,
                issues,
            }, { status: 400 });
        }

        let createdCount = 0;
        for (const q of questionsToCreate) {
            await prisma.question.create({ data: q.data });
            createdCount++;
        }

        return NextResponse.json({
            success: true,
            count: createdCount,
            totalRows: data.length,
            validRows: questionsToCreate.length,
            errorCount,
            warningCount,
            issues,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}
