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
    } catch (e) {
        return false;
    }
}

export async function GET() {
    try {
        if (!(await checkAdminRole())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch distinct departments and fields
        const departments = await prisma.user.findMany({
            select: { department: true },
            distinct: ['department'],
            where: { department: { not: '' } }
        });

        const fields = await prisma.user.findMany({
            select: { field: true },
            distinct: ['field'],
            where: { field: { not: null } }
        });

        return NextResponse.json({
            departments: departments.map(d => d.department).filter(Boolean),
            fields: fields.map(f => f.field).filter(Boolean)
        });
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}
