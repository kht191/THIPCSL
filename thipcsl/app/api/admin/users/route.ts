import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
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

export async function GET(request: Request) {
    try {
        if (!(await checkAdminRole())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search')?.trim();
        const department = searchParams.get('department');
        const field = searchParams.get('field');

        const where: any = {};

        if (search) {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { full_name: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (department) {
            where.department = department;
        }

        if (field) {
            where.field = field;
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: { id: true, username: true, full_name: true, department: true, field: true, role: true, is_active: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where })
        ]);

        return NextResponse.json({
            data: users,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        if (!(await checkAdminRole())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { username, password, full_name, department, field, role } = body;

        if (!username || !password || !full_name) {
            return NextResponse.json({ error: 'Thieu thong tin' }, { status: 400 });
        }

        // Convert username to lowercase for case-insensitive storage
        const normalizedUsername = username.toLowerCase();

        const existingUser = await prisma.user.findUnique({ where: { username: normalizedUsername } });
        if (existingUser) {
            return NextResponse.json({ error: 'Tai khoan da ton tai' }, { status: 400 });
        }

        const password_hash = await hashPassword(password);

        const newUser = await prisma.user.create({
            data: {
                username: normalizedUsername,
                password_hash,
                full_name,
                department: department || '',
                field: field || '',
                role: role || 'CANDIDATE',
            },
            select: { id: true, username: true, full_name: true, department: true, field: true, role: true },
        });

        return NextResponse.json(newUser, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        if (!(await checkAdminRole())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'Danh sách ID không hợp lệ' }, { status: 400 });
        }

        // Prevent deleting self (optional, but good practice)
        // We need current user ID for that, but let's skip for now to keep it simple
        // or just rely on frontend confirmation.

        await prisma.user.deleteMany({
            where: {
                id: { in: ids }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting users:', error);
        return NextResponse.json({ error: 'Lỗi khi xóa người dùng' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        if (!(await checkAdminRole())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { ids, department, field } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'Danh sách ID không hợp lệ' }, { status: 400 });
        }

        if (department === undefined && field === undefined) {
            return NextResponse.json({ error: 'Không có thông tin cập nhật' }, { status: 400 });
        }

        const dataToUpdate: any = {};
        if (department !== undefined) dataToUpdate.department = department;
        if (field !== undefined) dataToUpdate.field = field;

        await prisma.user.updateMany({
            where: {
                id: { in: ids }
            },
            data: dataToUpdate
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating users:', error);
        return NextResponse.json({ error: 'Lỗi khi cập nhật người dùng' }, { status: 500 });
    }
}
