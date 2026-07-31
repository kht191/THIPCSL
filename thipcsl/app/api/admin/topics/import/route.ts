import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Chưa chọn file' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet) as any[];

        const errors: string[] = [];
        let createdCount = 0;

        // First pass: Create all level 1 topics (no parent)
        const level1Topics = data.filter(row => {
            const parentTopic = row['Parent Topic'] || row['parent_topic'] || row['Parent'] || row['parent'];
            return !parentTopic || String(parentTopic).trim() === '';
        });

        const createdTopics = new Map<string, string>(); // Map: topic name -> topic id

        for (const row of level1Topics) {
            const name = row['Name'] || row['name'];
            const isActiveValue = row['Is Active'] || row['is_active'] || row['Active'] || row['active'];

            if (!name) {
                errors.push(`Dòng ${data.indexOf(row) + 2}: Thiếu tên chủ đề`);
                continue;
            }

            const topicName = String(name).trim();

            // Check if already exists in database
            const existing = await prisma.topic.findFirst({
                where: {
                    name: topicName,
                    parentId: null
                }
            });

            if (existing) {
                errors.push(`Dòng ${data.indexOf(row) + 2}: Chủ đề cấp 1 "${topicName}" đã tồn tại`);
                createdTopics.set(topicName, existing.id);
                continue;
            }

            // Parse isActive
            let isActive = true;
            if (isActiveValue !== undefined && isActiveValue !== null) {
                const val = String(isActiveValue).toLowerCase();
                isActive = val === 'true' || val === '1' || val === 'yes';
            }

            try {
                const newTopic = await prisma.topic.create({
                    data: {
                        name: topicName,
                        parentId: null,
                        isActive
                    }
                });
                createdTopics.set(topicName, newTopic.id);
                createdCount++;
            } catch (e) {
                errors.push(`Dòng ${data.indexOf(row) + 2}: Lỗi khi tạo chủ đề "${topicName}"`);
            }
        }

        // Second pass: Create level 2 topics (with parent)
        const level2Topics = data.filter(row => {
            const parentTopic = row['Parent Topic'] || row['parent_topic'] || row['Parent'] || row['parent'];
            return parentTopic && String(parentTopic).trim() !== '';
        });

        for (const row of level2Topics) {
            const name = row['Name'] || row['name'];
            const parentTopicName = row['Parent Topic'] || row['parent_topic'] || row['Parent'] || row['parent'];
            const isActiveValue = row['Is Active'] || row['is_active'] || row['Active'] || row['active'];

            if (!name) {
                errors.push(`Dòng ${data.indexOf(row) + 2}: Thiếu tên chủ đề`);
                continue;
            }

            const topicName = String(name).trim();
            const parentName = String(parentTopicName).trim();

            // Find parent topic ID
            let parentId = createdTopics.get(parentName);

            if (!parentId) {
                // Check database for existing parent
                const parentTopic = await prisma.topic.findFirst({
                    where: {
                        name: parentName,
                        parentId: null // Only search in level 1
                    }
                });

                if (parentTopic) {
                    parentId = parentTopic.id;
                    createdTopics.set(parentName, parentId);
                } else {
                    errors.push(`Dòng ${data.indexOf(row) + 2}: Không tìm thấy chủ đề cha "${parentName}"`);
                    continue;
                }
            }

            // Check if this child already exists under this parent
            const existing = await prisma.topic.findFirst({
                where: {
                    name: topicName,
                    parentId: parentId
                }
            });

            if (existing) {
                errors.push(`Dòng ${data.indexOf(row) + 2}: Chủ đề "${topicName}" đã tồn tại dưới "${parentName}"`);
                continue;
            }

            // Parse isActive
            let isActive = true;
            if (isActiveValue !== undefined && isActiveValue !== null) {
                const val = String(isActiveValue).toLowerCase();
                isActive = val === 'true' || val === '1' || val === 'yes';
            }

            try {
                await prisma.topic.create({
                    data: {
                        name: topicName,
                        parentId: parentId,
                        isActive
                    }
                });
                createdCount++;
            } catch (e) {
                errors.push(`Dòng ${data.indexOf(row) + 2}: Lỗi khi tạo chủ đề "${topicName}"`);
            }
        }

        return NextResponse.json({
            success: true,
            count: createdCount,
            errors,
            message: `Đã tạo thành công ${createdCount} chủ đề${errors.length > 0 ? `, ${errors.length} lỗi` : ''}`
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Lỗi server khi import' }, { status: 500 });
    }
}
