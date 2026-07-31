import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compactOptions, parseCorrectAnswerValue } from '@/lib/question-options';
import { requirePermission } from '@/lib/permissions';

export async function GET(request: Request) {
    try {
        const userIdOrErr = await requirePermission('questions.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const topicId = searchParams.get('topicId');
        const search = searchParams.get('search');

        const where: any = {};
        if (category) {
            where.category = { contains: category };
        }
        if (topicId) {
            where.topicId = topicId;
        }
        if (search) {
            // Case-insensitive search in both question content AND options/answers
            where.OR = [
                { content: { contains: search, mode: 'insensitive' } },
                { options: { contains: search, mode: 'insensitive' } },
            ];
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const [questions, total] = await Promise.all([
            prisma.question.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: { topic: true },
                skip,
                take: limit,
            }),
            prisma.question.count({ where })
        ]);

        return NextResponse.json({
            data: questions,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const userIdOrErr = await requirePermission('questions.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const body = await request.json();
        const { ids, topicId } = body;

        if (ids && Array.isArray(ids)) {
            await prisma.question.deleteMany({
                where: { id: { in: ids } }
            });
            return NextResponse.json({ success: true, count: ids.length });
        }

        if (topicId) {
            await prisma.question.deleteMany({
                where: { topicId: topicId }
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    } catch (error) {
        console.error('Error bulk deleting questions:', error);
        return NextResponse.json({ error: 'Loi server khi xoa cau hoi' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userIdOrErr = await requirePermission('questions.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const body = await request.json();
        const { content, options, correct_answer, category, topicId } = body;

        const cleanedOptions = compactOptions(options);
        const cleanedCorrectAnswer = parseCorrectAnswerValue(correct_answer).filter(answer => cleanedOptions[answer] !== undefined);

        if (!content || Object.keys(cleanedOptions).length < 2 || cleanedCorrectAnswer.length === 0) {
            return NextResponse.json({ error: 'Thieu thong tin' }, { status: 400 });
        }

        // Validate Topic: Must be a leaf topic (no children)
        if (topicId) {
            const hasChildren = await prisma.topic.count({
                where: { parentId: topicId }
            });
            if (hasChildren > 0) {
                return NextResponse.json({ error: 'Khong the luu cau hoi vao chu de co chu de con (Vui long chon chu de cap thap hon)' }, { status: 400 });
            }
        }

        const newQuestion = await prisma.question.create({
            data: {
                content,
                options: JSON.stringify(cleanedOptions),
                correct_answer: JSON.stringify(cleanedCorrectAnswer),
                category: category || '',
                topicId: topicId || null,
            },
        });

        return NextResponse.json(newQuestion, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}
