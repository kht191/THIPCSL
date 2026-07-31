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

        const results = await prisma.result.findMany({
            where: { user_id: userId },
            include: {
                exam: {
                    select: {
                        title: true,
                        duration: true,
                    }
                }
            },
            orderBy: { submitted_at: 'desc' }
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error('Error fetching user results:', error);
        return NextResponse.json({ error: 'Lỗi server khi lấy kết quả' }, { status: 500 });
    }
}
