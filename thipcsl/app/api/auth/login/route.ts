import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        // Convert username to lowercase for case-insensitive login
        const user = await prisma.user.findUnique({
            where: { username: username.toLowerCase() },
        });

        if (!user || !(await comparePassword(password, user.password_hash))) {
            return NextResponse.json({ error: 'Sai tai khoan hoac mat khau' }, { status: 401 });
        }

        if (!user.is_active) {
            return NextResponse.json({ error: 'Tai khoan da bi khoa. Vui long lien he quan tri vien.' }, { status: 403 });
        }

        const token = signToken({ id: user.id, role: user.role, username: user.username });

        const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });

        // Quyết định Secure theo giao thức thực (xuyên qua Nginx).
        // Qua HTTP (test local) → không secure để cookie được gửi lại;
        // qua HTTPS (Nginx) → secure true. Nginx phải set X-Forwarded-Proto.
        const isHttps = request.headers.get('x-forwarded-proto') === 'https';
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: isHttps,
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('LOGIN ERROR:', error);
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}
