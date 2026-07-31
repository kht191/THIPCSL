import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function GET(request: Request) {
    try {
        const userIdOrErr = await requirePermission('results.view');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { searchParams } = new URL(request.url);
        const examId = searchParams.get('examId');
        const userId = searchParams.get('userId');
        const sessionId = searchParams.get('sessionId');
        const search = searchParams.get('search')?.trim();

        const where: any = {
            status: 'COMPLETED'
        };
        if (examId) where.exam_id = examId;
        if (userId) where.user_id = userId;
        if (sessionId) where.session_id = sessionId;

        if (search) {
            where.OR = [
                { user: { username: { contains: search, mode: 'insensitive' } } },
                { user: { full_name: { contains: search, mode: 'insensitive' } } },
                { exam: { title: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const [results, total] = await Promise.all([
            prisma.result.findMany({
                where,
                include: {
                    user: {
                        select: {
                            username: true,
                            full_name: true,
                            department: true,
                        }
                    },
                    exam: {
                        select: {
                            title: true,
                            type: true,
                        }
                    },
                    session: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    submitted_at: 'desc'
                },
                skip,
                take: limit,
            }),
            prisma.result.count({ where })
        ]);

        return NextResponse.json({
            data: results,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const userIdOrErr = await requirePermission('results.view');
        if (typeof userIdOrErr !== 'string') return userIdOrErr;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        // Check for bulk delete via body
        let ids: string[] = [];
        try {
            const body = await request.json();
            if (body.ids && Array.isArray(body.ids)) {
                ids = body.ids;
            }
        } catch (e) {
            // No body or invalid JSON, ignore
        }

        if (ids.length > 0) {
            await prisma.result.deleteMany({
                where: { id: { in: ids } }
            });
            return NextResponse.json({ success: true, count: ids.length });
        }

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await prisma.result.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting result:', error);
        return NextResponse.json({ error: 'Failed to delete result' }, { status: 500 });
    }
}
