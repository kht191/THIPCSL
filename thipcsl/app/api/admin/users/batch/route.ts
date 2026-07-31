import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

async function checkAdminRole() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return false;
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        return payload.role === 'ADMIN';
    } catch { return false; }
}

export async function PATCH(request: Request) {
    try {
        if (!(await checkAdminRole())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { ids, is_active } = body;

        if (!Array.isArray(ids) || ids.length === 0 || typeof is_active !== 'boolean') {
            return NextResponse.json({ error: 'Thiếu ids hoặc is_active' }, { status: 400 });
        }

        await prisma.user.updateMany({
            where: { id: { in: ids } },
            data: { is_active },
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error('Batch PATCH error:', error);
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}
