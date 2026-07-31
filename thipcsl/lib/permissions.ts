import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ============================================================
// Permission Definitions
// ============================================================

export const PERMISSION_DEFINITIONS = [
  // Nhóm: Người dùng
  { key: 'users.view',         name: 'Xem danh sách người dùng',    group: 'Người dùng',       description: 'Xem danh sách và thông tin người dùng' },
  { key: 'users.create',       name: 'Tạo người dùng mới',          group: 'Người dùng',       description: 'Tạo tài khoản người dùng mới' },
  { key: 'users.edit',         name: 'Chỉnh sửa người dùng',        group: 'Người dùng',       description: 'Sửa thông tin, vai trò, trạng thái người dùng' },
  { key: 'users.delete',       name: 'Xóa người dùng',              group: 'Người dùng',       description: 'Xóa tài khoản người dùng' },
  { key: 'users.import_export', name: 'Import/Export người dùng',   group: 'Người dùng',       description: 'Import danh sách người dùng từ Excel và xuất ra Excel' },
  // Nhóm: Câu hỏi & Chủ đề
  { key: 'questions.manage',   name: 'Quản lý câu hỏi',             group: 'Câu hỏi & Chủ đề', description: 'Tạo, sửa, xóa, import câu hỏi' },
  { key: 'topics.manage',      name: 'Quản lý chủ đề',              group: 'Câu hỏi & Chủ đề', description: 'Tạo, sửa, xóa, import, sắp xếp chủ đề' },
  // Nhóm: Đề thi & Ca thi
  { key: 'exams.manage',       name: 'Quản lý đề thi',              group: 'Đề thi & Ca thi',  description: 'Tạo, sửa, xóa đề thi, cấu hình ma trận, phân quyền thi' },
  { key: 'sessions.manage',    name: 'Quản lý ca thi',              group: 'Đề thi & Ca thi',  description: 'Tạo, sửa, xóa ca thi, gán đề thi vào ca' },
  // Nhóm: Giám sát & Kết quả
  { key: 'monitor.view',       name: 'Xem giám sát thi',            group: 'Giám sát & Kết quả', description: 'Xem danh sách thí sinh đang làm bài real-time' },
  { key: 'results.view',       name: 'Xem kết quả thi',             group: 'Giám sát & Kết quả', description: 'Xem danh sách và chi tiết kết quả thi' },
  { key: 'results.print_export', name: 'In/Xuất kết quả',           group: 'Giám sát & Kết quả', description: 'In phiếu điểm và xuất danh sách kết quả ra Excel' },
  { key: 'exam.unlock',        name: 'Mở khóa bài thi',             group: 'Giám sát & Kết quả', description: 'Mở khóa bài thi cho thí sinh bị khóa do vi phạm' },
  // Nhóm: Thống kê
  { key: 'statistics.view',    name: 'Xem thống kê',                group: 'Thống kê',         description: 'Xem biểu đồ thống kê, phân bố điểm, báo cáo tổng quan' },
  // Quyền đặc biệt
  { key: 'users.permissions',  name: 'Quản lý phân quyền',          group: 'Người dùng',       description: 'Xem và chỉnh sửa phân quyền của người dùng' },
] as const;

export type PermissionKey = (typeof PERMISSION_DEFINITIONS)[number]['key'];

// ============================================================
// Role-based Default Permissions
// ============================================================

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: PERMISSION_DEFINITIONS.map(p => p.key),
  PROCTOR: [
    'monitor.view',
    'results.view',
    'results.print_export',
    'exam.unlock',
    'statistics.view',
  ],
  CANDIDATE: [] as string[],
};

// ============================================================
// Core Permission Functions
// ============================================================

/**
 * Check if a user has a specific permission.
 * If the user has explicit UserPermission records, use those (override mode).
 * Otherwise, fall back to role-based defaults.
 */
export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const userWithPerms = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      permissionMode: true,
      userPermissions: {
        include: { permission: { select: { key: true } } },
      },
    },
  });

  if (!userWithPerms) return false;

  // CUSTOM mode: use explicit permissions (may be empty — means no permissions)
  if (userWithPerms.permissionMode === 'CUSTOM') {
    return userWithPerms.userPermissions.some(
      up => up.permission.key === permissionKey
    );
  }

  // ROLE mode: fall back to role-based defaults
  const defaults = ROLE_DEFAULT_PERMISSIONS[userWithPerms.role] || [];
  return defaults.includes(permissionKey);
}

/**
 * Get all permission keys for a user.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const userWithPerms = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      permissionMode: true,
      userPermissions: {
        include: { permission: { select: { key: true } } },
      },
    },
  });

  if (!userWithPerms) return [];

  // CUSTOM mode: use explicit permissions (may be empty)
  if (userWithPerms.permissionMode === 'CUSTOM') {
    return userWithPerms.userPermissions.map(up => up.permission.key);
  }

  // ROLE mode: fall back to role-based defaults
  return ROLE_DEFAULT_PERMISSIONS[userWithPerms.role] || [];
}

/**
 * Check if a user has explicit permissions (override mode) or is using role defaults.
 */
export async function hasExplicitPermissions(userId: string): Promise<boolean> {
  const count = await prisma.userPermission.count({
    where: { user_id: userId },
  });
  return count > 0;
}

/**
 * Set (replace) all permissions for a user.
 */
export async function setUserPermissions(userId: string, permissionKeys: string[]): Promise<void> {
  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
  });

  await prisma.$transaction([
    prisma.userPermission.deleteMany({ where: { user_id: userId } }),
    ...permissions.map(p =>
      prisma.userPermission.create({
        data: { user_id: userId, permission_id: p.id },
      })
    ),
    prisma.user.update({
      where: { id: userId },
      data: { permissionMode: 'CUSTOM' },
    }),
  ]);
}

/**
 * Remove all explicit permissions (restore role defaults).
 */
export async function clearUserPermissions(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.userPermission.deleteMany({ where: { user_id: userId } }),
    prisma.user.update({
      where: { id: userId },
      data: { permissionMode: 'ROLE' },
    }),
  ]);
}

// ============================================================
// API Route Helpers
// ============================================================

/**
 * Extract and verify the authenticated userId from the JWT cookie.
 * Returns the userId string on success, or a NextResponse error on failure.
 */
export async function getAuthUserId(): Promise<string | NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const decoded: any = verifyToken(token);
  if (!decoded || !decoded.id) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  return decoded.id as string;
}

/**
 * Require a specific permission. Combines authentication + permission check.
 * Returns the userId on success, or a NextResponse error (401/403) on failure.
 *
 * Usage in API routes:
 *   const userIdOrErr = await requirePermission('users.view');
 *   if (typeof userIdOrErr !== 'string') return userIdOrErr;
 */
export async function requirePermission(permissionKey: string): Promise<string | NextResponse> {
  const userIdOrErr = await getAuthUserId();
  if (typeof userIdOrErr !== 'string') return userIdOrErr;

  const permitted = await hasPermission(userIdOrErr, permissionKey);
  if (!permitted) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return userIdOrErr;
}
