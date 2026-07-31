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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                full_name: true,
                department: true,
                field: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'Khong tim thay user' }, { status: 404 });
        }

        // Lấy tất cả đề thi OFFICIAL và TWO_PART (để admin phân công)
        const allExams = await prisma.exam.findMany({
            where: {
                type: { in: ['OFFICIAL', 'TWO_PART'] },
            },
            select: {
                id: true,
                title: true,
                type: true,
                status: true,
                duration: true,
                max_attempts: true,
                allowed_users: true,
                _count: { select: { results: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Lấy ID các đề thi user được phân công
        const assignedExamIds = allExams
            .filter(exam => {
                try {
                    const allowed = JSON.parse(exam.allowed_users || '[]');
                    return Array.isArray(allowed) && allowed.includes(id);
                } catch { return false; }
            })
            .map(exam => exam.id);

        // Lấy kết quả thi của user
        const results = await prisma.result.findMany({
            where: { user_id: id },
            include: {
                exam: { select: { id: true, title: true, type: true } },
                session: { select: { id: true, name: true } },
            },
            orderBy: { submitted_at: 'desc' },
        });

        return NextResponse.json({
            ...user,
            assignedExamIds,
            allExams: allExams.map(e => ({
                id: e.id,
                title: e.title,
                type: e.type,
                status: e.status,
                duration: e.duration,
                max_attempts: e.max_attempts,
                totalResults: e._count.results,
            })),
            results: results.map(r => ({
                id: r.id,
                examId: r.exam.id,
                examTitle: r.exam.title,
                examType: r.exam.type,
                sessionName: r.session?.name || null,
                score: r.score,
                isPassed: r.is_passed,
                status: r.status,
                isPrinted: r.is_printed,
                startedAt: r.started_at,
                submittedAt: r.submitted_at,
            })),
        });
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await checkAdminRole())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();

        // Toggle is_active
        if (typeof body.is_active === 'boolean') {
            const updated = await prisma.user.update({
                where: { id },
                data: { is_active: body.is_active },
            });
            return NextResponse.json({ success: true, is_active: updated.is_active });
        }

        // Toggle exam assignment
        const { examId, action } = body;

        if (!examId || !['add', 'remove'].includes(action)) {
            return NextResponse.json({ error: 'Thiếu examId hoặc action không hợp lệ' }, { status: 400 });
        }

        const exam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) {
            return NextResponse.json({ error: 'Không tìm thấy đề thi' }, { status: 404 });
        }

        const allowedUsers: string[] = JSON.parse(exam.allowed_users || '[]');

        if (action === 'add') {
            if (!allowedUsers.includes(id)) {
                allowedUsers.push(id);
            }
        } else {
            const idx = allowedUsers.indexOf(id);
            if (idx > -1) allowedUsers.splice(idx, 1);
        }

        await prisma.exam.update({
            where: { id: examId },
            data: { allowed_users: JSON.stringify(allowedUsers) },
        });

        return NextResponse.json({ success: true, allowedUsers });
    } catch (error) {
        console.error('[PATCH user exams] Error:', error);
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await checkAdminRole())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { full_name, department, field, role, password } = body;

        const data: any = {
            full_name,
            department,
            field,
            role,
        };

        if (password) {
            data.password_hash = await hashPassword(password);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data,
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        return NextResponse.json({ error: 'Loi server' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!(await checkAdminRole())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;

        // Delete associated results first
        await prisma.result.deleteMany({
            where: { user_id: id },
        });

        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: error.message || 'Loi server khi xoa user' }, { status: 500 });
    }
}
