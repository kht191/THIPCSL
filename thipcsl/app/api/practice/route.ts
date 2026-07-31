import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = verifyToken(token);
        if (!decoded || !decoded.id) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.id;

        // Fetch user's own practice exams
        const myExams = await prisma.exam.findMany({
            where: {
                type: 'PRACTICE',
                creatorId: userId,
                practiceSourceId: null,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { results: true } },
            },
        });

        // Fetch public practice exams (published from official exams)
        const officialPracticeExams = await prisma.exam.findMany({
            where: {
                type: 'PRACTICE',
                practiceSourceId: { not: null },
                status: 'OPEN',
            },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { results: true } },
                practiceSource: { select: { id: true, title: true } },
            },
        });

        // Check which public exams user already has a personal copy of
        const forkedIds = new Set<string>();
        for (const exam of officialPracticeExams) {
            const personalCopy = await prisma.exam.findFirst({
                where: {
                    type: 'PRACTICE',
                    creatorId: userId,
                    practiceSourceId: null,
                    settings: { contains: exam.id },
                },
                select: { id: true, settings: true },
            });
            if (personalCopy) {
                try {
                    const s = JSON.parse(personalCopy.settings || '{}');
                    if (s.forkedFromPracticeId === exam.id) {
                        forkedIds.add(exam.id);
                    }
                } catch { }
            }
        }

        // Mark official exams - exclude ones user already forked
        const publicExams = officialPracticeExams
            .filter(e => !forkedIds.has(e.id))
            .map(e => {
                let pinned = false;
                try { const s = JSON.parse(e.settings || '{}'); pinned = s.pinned === true; } catch { }
                return { ...e, isOfficial: true, pinned, canDelete: false };
            });

        // Sort public: pinned first
        const sortedPublic = publicExams.sort((a: any, b: any) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        const ownExams = myExams.map(e => {
            let isForkedCopy = false;
            let pinned = false;
            try {
                const s = JSON.parse(e.settings || '{}');
                if (s.forkedFromPracticeId || s.forkedFromExamId) {
                    isForkedCopy = true;
                }
                pinned = s.pinned === true;
            } catch { }

            return {
                ...e,
                isOfficial: false,
                isForkedCopy,
                pinned,
                canDelete: !isForkedCopy,
            };
        });

        // Sort: pinned first, then by creation date
        const sortedOwn = ownExams.sort((a: any, b: any) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Merge all exams, sort: pinned first, then public, then date
        const allExams = [...sortedPublic, ...sortedOwn].sort((a: any, b: any) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            if (a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return NextResponse.json(allExams);
    } catch (error) {
        console.error('Error fetching practice exams:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
