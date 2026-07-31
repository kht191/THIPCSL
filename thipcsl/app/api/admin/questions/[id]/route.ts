import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compactOptions, parseCorrectAnswerValue } from '@/lib/question-options';
import { requirePermission } from '@/lib/permissions';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('questions.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;
        const question = await prisma.question.findUnique({
            where: { id },
        });

        if (!question) {
            return NextResponse.json({ error: 'Khong tim thay cau hoi' }, { status: 404 });
        }

        return NextResponse.json(question);
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('questions.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;
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

        const updatedQuestion = await prisma.question.update({
            where: { id },
            data: {
                content,
                options: JSON.stringify(cleanedOptions),
                correct_answer: JSON.stringify(cleanedCorrectAnswer),
                category,
                topicId: topicId || null,
            },
        });

        return NextResponse.json(updatedQuestion);
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userIdOrErr = await requirePermission('questions.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { id } = await params;
        await prisma.question.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting question:', error);
        return NextResponse.json({ error: 'Loi server khi xoa cau hoi' }, { status: 500 });
    }
}
