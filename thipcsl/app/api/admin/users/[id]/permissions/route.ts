import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getUserPermissions, setUserPermissions, clearUserPermissions, ROLE_DEFAULT_PERMISSIONS } from '@/lib/permissions';

// GET /api/admin/users/[id]/permissions
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const userIdOrErr = await requirePermission('users.permissions');
    if (typeof userIdOrErr !== 'string') return userIdOrErr;

    const { id } = await params;

    try {
        const permissionKeys = await getUserPermissions(id);
        const userWithMode = await prisma.user.findUnique({ where: { id }, select: { permissionMode: true, role: true } });
        const explicit = userWithMode?.role !== 'ADMIN' && userWithMode?.permissionMode === 'CUSTOM';

        return NextResponse.json({
            permissionKeys,
            hasExplicitPermissions: explicit,
            isAdmin: userWithMode?.role === 'ADMIN',
        });
    } catch (error) {
        console.error('[GET permissions] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT /api/admin/users/[id]/permissions
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const userIdOrErr = await requirePermission('users.permissions');
    if (typeof userIdOrErr !== 'string') return userIdOrErr;

    const { id } = await params;

    try {
        const body = await request.json();
        const { permissionKeys, restoreRole } = body;

        const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
        if (!target) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
        if (target.role === 'ADMIN') {
            return NextResponse.json({ success: true, permissionKeys: ROLE_DEFAULT_PERMISSIONS.ADMIN,
                hasExplicitPermissions: false, message: 'Tài khoản quản trị luôn có đầy đủ quyền' });
        }

        if (restoreRole) {
            // Clear all explicit permissions → fall back to role defaults
            await clearUserPermissions(id);
            const defaults = await getUserPermissions(id);
            return NextResponse.json({
                success: true,
                permissionKeys: defaults,
                hasExplicitPermissions: false,
                message: 'Đã khôi phục quyền theo vai trò mặc định',
            });
        }

        if (!Array.isArray(permissionKeys)) {
            return NextResponse.json({ error: 'permissionKeys must be an array' }, { status: 400 });
        }

        await setUserPermissions(id, permissionKeys);

        return NextResponse.json({
            success: true,
            permissionKeys,
            hasExplicitPermissions: true,
            message: 'Đã lưu quyền thành công',
        });
    } catch (error) {
        console.error('[PUT permissions] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
