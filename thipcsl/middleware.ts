import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Maintenance mode - redirect all requests except /maintenance
    if (MAINTENANCE_MODE && !pathname.startsWith('/maintenance')) {
        return NextResponse.redirect(new URL('/maintenance', request.url));
    }

    // If not in maintenance mode but trying to access /maintenance, redirect to home
    if (!MAINTENANCE_MODE && pathname.startsWith('/maintenance')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    const token = request.cookies.get('token')?.value;

    // Public paths
    if (pathname === '/login' || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        // Check role for /admin — ADMIN or PROCTOR required
        // Permission-based menu filtering is done in the admin layout
        if (pathname.startsWith('/admin')) {
            if (payload.role !== 'ADMIN' && payload.role !== 'PROCTOR') {
                return NextResponse.redirect(new URL('/login', request.url));
            }
        }

        return NextResponse.next();
    } catch (error) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

export const config = {
    matcher: ['/admin/:path*', '/exam/:path*', '/', '/api/admin/:path*', '/api/exam/:path*', '/maintenance'],
};

