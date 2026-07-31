'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles?: string[];
    requiredPermission?: string;
    redirectTo?: string;
}

export default function RoleGuard({ children, allowedRoles, requiredPermission, redirectTo = '/admin/monitor' }: RoleGuardProps) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAccess();
    }, []);

    const checkAccess = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();

                // Check by role (legacy)
                if (allowedRoles && allowedRoles.length > 0) {
                    if (allowedRoles.includes(data.role)) {
                        setIsAuthorized(true);
                    } else {
                        router.replace(redirectTo);
                    }
                    setIsLoading(false);
                    return;
                }

                // Check by permission (new)
                if (requiredPermission) {
                    const perms: string[] = data.permissions || [];
                    if (perms.includes(requiredPermission)) {
                        setIsAuthorized(true);
                    } else {
                        router.replace(redirectTo);
                    }
                    setIsLoading(false);
                    return;
                }

                // No check specified — allow
                setIsAuthorized(true);
            } else {
                router.replace('/login');
            }
        } catch (error) {
            console.error('Access check error:', error);
            router.replace('/login');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Đang kiểm tra quyền truy cập...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return <>{children}</>;
}
