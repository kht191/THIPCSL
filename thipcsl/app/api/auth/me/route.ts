import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getUserPermissions } from '@/lib/permissions';

export async function GET() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload || typeof payload === 'string') {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: (payload as any).id },
            select: {
                id: true,
                username: true,
                full_name: true,
                department: true,
                role: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const permissions = await getUserPermissions(user.id);

        return NextResponse.json({
            ...user,
            permissions,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
