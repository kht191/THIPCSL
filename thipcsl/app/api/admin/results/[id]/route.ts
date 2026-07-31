import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userIdOrErr = await requirePermission('results.view');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;

        const { id } = await params;

        const result = await prisma.result.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        username: true,
                        full_name: true,
                        department: true,
                    }
                },
                exam: true
            }
        });

        if (!result) {
            return NextResponse.json({ error: 'Result not found' }, { status: 404 });
        }

        // Fetch questions to display details
        let questions: any[] = [];
        try {
            let questionIds: string[] = [];
            try {
                const details = JSON.parse(result.details || '{}');
                if (details.questionOrder && Array.isArray(details.questionOrder)) {
                    questionIds = details.questionOrder;
                } else {
                    questionIds = JSON.parse(result.exam.question_ids);
                }
            } catch (e) {
                questionIds = [];
            }

            questions = await prisma.question.findMany({
                where: {
                    id: { in: questionIds }
                }
            });

            // Sort questions to match the order in questionIds
            const questionMap = new Map(questions.map(q => [q.id, q]));
            questions = questionIds.map(id => questionMap.get(id)).filter(q => q !== undefined);

            // Removed PROCTOR restriction to allow correct_answer in Result view (Monitor view handles hiding it on frontend)

        } catch (e) {
            console.error("Error parsing question IDs", e);
        }

        return NextResponse.json({ result, questions, viewerRole: 'admin' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch result details' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userIdOrErr = await requirePermission('results.view');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;

        const { id } = await params;

        const body = await request.json();
        const { is_printed } = body;

        if (typeof is_printed !== 'boolean') {
            return NextResponse.json({ error: 'Invalid is_printed value' }, { status: 400 });
        }

        const updatedResult = await prisma.result.update({
            where: { id },
            data: { is_printed }
        });

        return NextResponse.json({ success: true, result: updatedResult });
    } catch (error) {
        console.error('Error updating print status:', error);
        return NextResponse.json({ error: 'Failed to update print status' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userIdOrErr = await requirePermission('results.view');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;

        const { id } = await params;

        await prisma.result.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting result:', error);
        return NextResponse.json({ error: 'Failed to delete result' }, { status: 500 });
    }
}

