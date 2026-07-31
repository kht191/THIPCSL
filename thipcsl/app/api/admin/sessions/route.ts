import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function GET(request: Request) {
    try {
        const userIdOrErr = await requirePermission('sessions.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { searchParams } = new URL(request.url);
        // const examId = searchParams.get('examId'); // TODO: Filter by examId if needed, requires different query for many-to-many

        const where: any = {};
        // if (examId) where.exams = { some: { id: examId } };

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const [sessions, total] = await Promise.all([
            prisma.examSession.findMany({
                where,
                include: {
                    exams: {
                        select: { id: true, title: true }
                    },
                    _count: {
                        select: { results: true }
                    }
                },
                orderBy: { startTime: 'desc' },
                skip,
                take: limit,
            }),
            prisma.examSession.count({ where })
        ]);

        return NextResponse.json({
            data: sessions,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userIdOrErr = await requirePermission('sessions.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const body = await request.json();
        const { name, examIds, startTime, endTime } = body;

        if (!name || !examIds || !Array.isArray(examIds) || examIds.length === 0 || !startTime || !endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const session = await prisma.examSession.create({
            data: {
                name,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                status: 'ACTIVE',
                exams: {
                    connect: examIds.map((id: string) => ({ id }))
                }
            }
        });

        return NextResponse.json(session);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const userIdOrErr = await requirePermission('sessions.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const body = await request.json();
        const { id, name, examIds, startTime, endTime, status } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const session = await prisma.examSession.update({
            where: { id },
            data: {
                name,
                startTime: startTime ? new Date(startTime) : undefined,
                endTime: endTime ? new Date(endTime) : undefined,
                status,
                exams: examIds ? {
                    set: examIds.map((id: string) => ({ id }))
                } : undefined
            }
        });

        return NextResponse.json(session);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const userIdOrErr = await requirePermission('sessions.manage');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await prisma.examSession.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }
}
