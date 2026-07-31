import { NextResponse } from 'next/server';
import { requirePermission, getUserPermissions, setUserPermissions, clearUserPermissions, hasExplicitPermissions, ROLE_DEFAULT_PERMISSIONS } from '@/lib/permissions';

// GET /api/admin/users/[id]/permissions
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const userIdOrErr = await requirePermission('users.view');
    if (typeof userIdOrErr !== 'string') return userIdOrErr;

    const { id } = await params;

    try {
        const permissionKeys = await getUserPermissions(id);
        const explicit = await hasExplicitPermissions(id);

        return NextResponse.json({
            permissionKeys,
            hasExplicitPermissions: explicit,
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
    const userIdOrErr = await requirePermission('users.edit');
    if (typeof userIdOrErr !== 'string') return userIdOrErr;

    const { id } = await params;

    try {
        const body = await request.json();
        const { permissionKeys, restoreRole } = body;

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
            hasExplicitPermissions: permissionKeys.length > 0,
            message: 'Đã lưu quyền thành công',
        });
    } catch (error) {
        console.error('[PUT permissions] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
