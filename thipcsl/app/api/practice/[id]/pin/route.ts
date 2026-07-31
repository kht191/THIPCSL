import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded: any = verifyToken(token);
        if (!decoded?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const exam = await prisma.exam.findUnique({ where: { id } });
        if (!exam || exam.type !== 'PRACTICE') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // Allow pinning for own exams OR public official practice exams
        const isOwnExam = exam.creatorId === decoded.id;
        const isPublicOfficial = exam.practiceSourceId !== null;
        if (!isOwnExam && !isPublicOfficial) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let settings = JSON.parse(exam.settings || '{}');
        // Fix old format: convert array to { matrix: [...] } so pinned property is preserved
        if (Array.isArray(settings)) {
            settings = { matrix: settings };
        }
        settings.pinned = !settings.pinned;

        await prisma.exam.update({
            where: { id },
            data: { settings: JSON.stringify(settings) },
        });

        return NextResponse.json({ success: true, pinned: settings.pinned });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
    }
}
