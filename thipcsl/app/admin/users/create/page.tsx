'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateUser() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [department, setDepartment] = useState('');
    const [field, setField] = useState('');
    const [role, setRole] = useState('CANDIDATE');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password,
                full_name: fullName,
                department,
                field,
                role,
            }),
        });

        if (res.ok) {
            router.push('/admin');
        } else {
            const data = await res.json();
            alert(data.error || 'Lỗi khi tạo nhân viên');
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-8 rounded shadow">
            <h1 className="text-2xl font-bold mb-6 text-black">Thêm nhân viên mới</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tài khoản</label>
                    <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Họ tên</label>
                    <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Phòng ban</label>
                    <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Lĩnh vực</label>
                    <input
                        type="text"
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black"
                    >
                        <option value="CANDIDATE">Thí sinh (CANDIDATE)</option>
                        <option value="ADMIN">Quản trị viên (ADMIN)</option>
                        <option value="PROCTOR">Giám thị (PROCTOR)</option>
                    </select>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Tạo mới
                    </button>
                </div>
            </form>
        </div>
    );
}
