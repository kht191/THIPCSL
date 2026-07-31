'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
    const router = useRouter();

    const handleLogout = () => {
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        router.push('/login');
    };

    return (
        <button
            onClick={handleLogout}
            className="block w-full text-left py-2 px-4 hover:bg-red-700 rounded mt-4 text-red-200"
        >
            Đăng xuất
        </button>
    );
}
