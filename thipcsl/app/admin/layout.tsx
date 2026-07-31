import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import Link from 'next/link';
import LogoutButton from './LogoutButton';
import MobileSidebar from '@/components/MobileSidebar';

import { prisma } from '@/lib/prisma';
import { getUserPermissions } from '@/lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    let user = null;
    let permissions: string[] = [];

    if (token) {
        try {
            const secret = new TextEncoder().encode(JWT_SECRET);
            const { payload } = await jwtVerify(token, secret);
            user = await prisma.user.findUnique({
                where: { id: payload.id as string },
                select: { full_name: true, department: true, role: true }
            });
            if (user) {
                permissions = await getUserPermissions(payload.id as string);
            }
        } catch (e) { }
    }

    const role = user?.role || '';
    const isAdmin = role === 'ADMIN';
    const isProctor = role === 'PROCTOR';
    const can = (perm: string) => permissions.includes(perm);

    return (
        <div className="flex min-h-screen">
            <MobileSidebar>
                <div className="mb-6">
                    <h2 className="text-xl font-bold">
                        {isAdmin ? 'Admin Panel' : isProctor ? 'Giám thị' : 'Panel'}
                    </h2>
                    {user && (
                        <div className="text-sm text-gray-400 mt-2">
                            <p className="font-semibold text-white">{user.full_name}</p>
                            <p>{user.department}</p>
                            <p className="text-xs mt-1">
                                {role === 'ADMIN' && '👑 Quản trị viên'}
                                {role === 'PROCTOR' && '👁️ Giám thị'}
                                {role === 'CANDIDATE' && '📝 Thí sinh'}
                            </p>
                        </div>
                    )}
                </div>
                <nav className="space-y-2">
                    {can('users.view') && (
                        <Link href="/admin" className="block py-2 px-4 hover:bg-gray-700 rounded">Quản lý Người dùng</Link>
                    )}
                    {can('topics.manage') && (
                        <Link href="/admin/topics" className="block py-2 px-4 hover:bg-gray-700 rounded">Quản lý Chủ đề</Link>
                    )}
                    {can('questions.manage') && (
                        <Link href="/admin/questions" className="block py-2 px-4 hover:bg-gray-700 rounded">Ngân hàng câu hỏi</Link>
                    )}
                    {can('exams.manage') && (
                        <Link href="/admin/exams" className="block py-2 px-4 hover:bg-gray-700 rounded">Quản lý Đề thi</Link>
                    )}
                    {can('sessions.manage') && (
                        <Link href="/admin/sessions" className="block py-2 px-4 hover:bg-gray-700 rounded">Quản lý Ca thi</Link>
                    )}

                    {can('monitor.view') && (
                        <Link href="/admin/monitor" className="block py-2 px-4 hover:bg-gray-700 rounded text-yellow-300">
                            {isProctor && '⭐ '}Giám sát thi
                        </Link>
                    )}
                    {can('results.view') && (
                        <Link href="/admin/results" className="block py-2 px-4 hover:bg-gray-700 rounded">Kết quả thi</Link>
                    )}
                    {can('statistics.view') && (
                        <Link href="/admin/statistics" className="block py-2 px-4 hover:bg-gray-700 rounded text-green-400">Thống kê</Link>
                    )}

                    <LogoutButton />
                </nav>
            </MobileSidebar>
            <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gray-50 print:w-full print:p-0 print:bg-white pt-16 md:pt-8">
                {children}
            </main>
        </div>
    );
}
