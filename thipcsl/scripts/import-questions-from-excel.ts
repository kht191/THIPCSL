import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

function normalizeText(value: unknown): string {
    return String(value ?? '').trim();
}

async function main() {
    console.log('📖 Đọc file Excel...');
    const filePath = path.join(__dirname, '..', 'De thi', 'cau_hoi_ontap.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

    console.log(`📊 Tổng: ${rows.length} dòng`);

    // 1. Thu thập tất cả chủ đề unique
    const topicMap = new Map<string, string[]>(); // parentName -> childNames[]
    for (const row of rows) {
        const parentName = normalizeText(row['Parent Topic'] || row['parent_topic']);
        const childName = normalizeText(row['Topic'] || row['topic']);
        if (!parentName) continue;

        if (!topicMap.has(parentName)) {
            topicMap.set(parentName, []);
        }
        const children = topicMap.get(parentName)!;
        if (childName && !children.includes(childName)) {
            children.push(childName);
        }
    }

    console.log(`📁 Tìm thấy ${topicMap.size} chủ đề cha, ${[...topicMap.values()].flat().length} chủ đề con`);

    // 2. Tạo chủ đề cha nếu chưa có
    for (const [parentName, childNames] of topicMap) {
        let parent = await prisma.topic.findFirst({
            where: { name: parentName, parentId: null },
        });

        if (!parent) {
            parent = await prisma.topic.create({
                data: { name: parentName, isActive: true },
            });
            console.log(`✅ Tạo chủ đề cha: "${parentName}"`);
        } else {
            console.log(`✓ Chủ đề cha đã có: "${parentName}"`);
        }

        // 3. Tạo chủ đề con
        for (const childName of childNames) {
            const existing = await prisma.topic.findFirst({
                where: { name: childName, parentId: parent.id },
            });

            if (!existing) {
                await prisma.topic.create({
                    data: { name: childName, parentId: parent.id, isActive: true },
                });
                console.log(`  ✅ Tạo chủ đề con: "${parentName}" > "${childName}"`);
            } else {
                console.log(`  ✓ Chủ đề con đã có: "${parentName}" > "${childName}"`);
            }
        }
    }

    // 4. Import câu hỏi
    console.log('\n📝 Import câu hỏi...');
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Excel row (1-indexed + header)

        const content = normalizeText(row['Content'] || row['content']);
        if (!content) {
            skipped++;
            continue;
        }

        // Parse options (A, B, C, D, E...)
        const options: Record<string, string> = {};
        const allKeys = Object.keys(row);
        const optionKeys = allKeys.filter(k => /^[A-Z]$/.test(k.trim())).sort();
        for (const key of optionKeys) {
            const val = normalizeText(row[key]);
            if (val) options[key.trim().toUpperCase()] = val;
        }

        if (Object.keys(options).length < 2) {
            errors.push(`Dòng ${rowNum}: Không đủ đáp án (cần ít nhất 2)`);
            skipped++;
            continue;
        }

        // Parse correct answer
        const correctRaw = normalizeText(row['Correct Answer'] || row['correct_answer']);
        if (!correctRaw) {
            errors.push(`Dòng ${rowNum}: Thiếu đáp án đúng`);
            skipped++;
            continue;
        }

        // Parse topic
        const parentName = normalizeText(row['Parent Topic'] || row['parent_topic']);
        const childName = normalizeText(row['Topic'] || row['topic']);

        // Find topic ID
        let topicId: string | null = null;
        if (parentName && childName) {
            const parent = await prisma.topic.findFirst({
                where: { name: parentName, parentId: null },
            });
            if (parent) {
                const child = await prisma.topic.findFirst({
                    where: { name: childName, parentId: parent.id },
                });
                topicId = child?.id || null;
            }
        } else if (childName) {
            const topic = await prisma.topic.findFirst({
                where: { name: childName },
            });
            topicId = topic?.id || null;
        }

        try {
            await prisma.question.create({
                data: {
                    content,
                    options: JSON.stringify(options),
                    correct_answer: correctRaw,
                    category: childName || '',
                    topicId,
                },
            });
            created++;
            if (created % 100 === 0) console.log(`   Đã import ${created}/${rows.length}...`);
        } catch (err: any) {
            errors.push(`Dòng ${rowNum}: ${err.message}`);
            skipped++;
        }
    }

    console.log(`\n🏁 Hoàn tất!`);
    console.log(`   ✅ Đã import: ${created} câu hỏi`);
    console.log(`   ⏭️ Bỏ qua: ${skipped}`);
    if (errors.length > 0) {
        console.log(`   ❌ Lỗi (${errors.length}):`);
        errors.slice(0, 10).forEach(e => console.log(`      ${e}`));
        if (errors.length > 10) console.log(`      ... và ${errors.length - 10} lỗi khác`);
    }

    await prisma.$disconnect();
}

main().catch((err) => {
    console.error('Fatal error:', err);
    prisma.$disconnect();
    process.exit(1);
});
