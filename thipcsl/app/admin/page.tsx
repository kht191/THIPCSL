'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [department, setDepartment] = useState('');
    const [field, setField] = useState('');

    // Options for dropdowns
    const [departments, setDepartments] = useState<string[]>([]);
    const [fields, setFields] = useState<string[]>([]);

    // Transfer state
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [targetDepartment, setTargetDepartment] = useState('');

    // Field Update state
    const [showFieldModal, setShowFieldModal] = useState(false);
    const [targetField, setTargetField] = useState('');
    const [isClearField, setIsClearField] = useState(false);

    // Permissions
    const [permissions, setPermissions] = useState<string[]>([]);
    const can = (perm: string) => permissions.includes(perm);

    useEffect(() => {
        fetchUsers();
        fetchFilters();
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setPermissions(data.permissions || []);
            }
        } catch (error) {
            console.error('Error fetching permissions', error);
        }
    };

    // Debounce search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPage(1); // Reset to page 1 on filter change
            fetchUsers(1);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, department, field, limit]);

    useEffect(() => {
        fetchUsers(page);
    }, [page]);

    const fetchFilters = async () => {
        try {
            const res = await fetch('/api/admin/users/filters');
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments);
                setFields(data.fields);
            }
        } catch (error) {
            console.error('Error fetching filters', error);
        }
    };

    const fetchUsers = async (currentPage = 1) => {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (department) params.append('department', department);
        if (field) params.append('field', field);
        params.append('page', currentPage.toString());
        params.append('limit', limit.toString());

        const res = await fetch(`/api/admin/users?${params.toString()}`);
        if (res.ok) {
            const data = await res.json();
            setUsers(data.data);
            setTotalPages(data.metadata.totalPages);
        }
        setLoading(false);
    };

    // Add effect to check role and redirect
    useEffect(() => {
        const checkRole = async () => {
            // We can check by calling a lightweight API or just relying on the fact that 
            // if they are Proctor, they shouldn't be here.
            // But we don't have a "me" endpoint yet.
            // Let's rely on the fact that if they are here, they might see it.
            // To strictly enforce, we should decode token or call an API.
            // For now, let's assume the Sidebar hiding and Login redirect covers most cases.
            // If we want to be strict:
            /*
            const res = await fetch('/api/auth/me'); // If we had this
            */
        };
    }, []);

    const handleImport = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/users/import', {
            method: 'POST',
            body: formData,
        });

        if (res.ok) {
            const data = await res.json();
            let message = `Import hoàn tất:\n- Tạo mới: ${data.created}\n- Cập nhật: ${data.updated}`;
            if (data.errors && data.errors.length > 0) {
                message += `\n- Lỗi (${data.errors.length}):\n${data.errors.slice(0, 5).join('\n')}${data.errors.length > 5 ? '\n...' : ''}`;
            }
            alert(message);
            fetchUsers();
            setFile(null); // Reset file input
            // Reset file input element manually if needed, but state is enough if controlled properly or just let user re-select
        } else {
            alert('Lỗi import');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa nhân viên này?')) return;

        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            fetchUsers();
        } else {
            const data = await res.json();
            alert(data.error || 'Lỗi khi xóa');
        }
    };

    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUsers(users.map(u => u.id));
        } else {
            setSelectedUsers([]);
        }
    };

    const handleSelectUser = (id: string) => {
        if (selectedUsers.includes(id)) {
            setSelectedUsers(selectedUsers.filter(uid => uid !== id));
        } else {
            setSelectedUsers([...selectedUsers, id]);
        }
    };

    const toggleUserActive = async (userId: string, currentActive: boolean) => {
        const newActive = !currentActive;
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: newActive } : u));
        try {
            await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: newActive }),
            });
        } catch {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: currentActive } : u));
        }
    };

    const bulkToggleActive = async (activate: boolean) => {
        if (selectedUsers.length === 0) return;
        const action = activate ? 'bật' : 'tắt';
        if (!confirm(`${activate ? 'Mở khóa' : 'Khóa'} ${selectedUsers.length} tài khoản đã chọn?`)) return;

        // Optimistic update
        setUsers(prev => prev.map(u => selectedUsers.includes(u.id) ? { ...u, is_active: activate } : u));
        try {
            await fetch('/api/admin/users/batch', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedUsers, is_active: activate }),
            });
            setSelectedUsers([]);
        } catch {
            fetchUsers(page); // Revert by reloading
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUsers.length === 0) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedUsers.length} nhân viên đã chọn?`)) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedUsers }),
            });

            if (res.ok) {
                alert('Đã xóa thành công');
                setSelectedUsers([]);
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || 'Lỗi khi xóa');
            }
        } catch (error) {
            console.error('Error deleting users', error);
            alert('Lỗi kết nối');
        }
    };

    const handleBulkTransfer = async () => {
        if (selectedUsers.length === 0) return;
        if (!targetDepartment) {
            alert('Vui lòng nhập tên phòng ban mới');
            return;
        }

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedUsers, department: targetDepartment }),
            });

            if (res.ok) {
                alert('Chuyển phòng ban thành công');
                setShowTransferModal(false);
                setTargetDepartment('');
                setSelectedUsers([]);
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || 'Lỗi khi chuyển phòng ban');
            }
        } catch (error) {
            console.error('Error transferring users', error);
            alert('Lỗi kết nối');
        }
    };

    const handleBulkFieldUpdate = async () => {
        if (selectedUsers.length === 0) return;
        if (!isClearField && !targetField) {
            alert('Vui lòng nhập tên lĩnh vực mới hoặc chọn xóa');
            return;
        }

        const fieldToUpdate = isClearField ? '' : targetField;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedUsers, field: fieldToUpdate }),
            });

            if (res.ok) {
                alert('Cập nhật lĩnh vực thành công');
                setShowFieldModal(false);
                setTargetField('');
                setIsClearField(false);
                setSelectedUsers([]);
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || 'Lỗi khi cập nhật lĩnh vực');
            }
        } catch (error) {
            console.error('Error updating users field', error);
            alert('Lỗi kết nối');
        }
    };

    const handleExport = async () => {
        if (selectedUsers.length === 0) return;

        try {
            const res = await fetch('/api/admin/users/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedUsers }),
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `export_users_${new Date().getTime()}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Lỗi khi xuất file');
            }
        } catch (error) {
            console.error('Error exporting users', error);
            alert('Lỗi kết nối');
        }
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-bold text-black">Quản lý Nhân viên</h1>
                <div className="flex flex-wrap gap-2">
                    {selectedUsers.length > 0 && (
                        <>
                            {can('users.edit') && (
                                <>
                                    <button onClick={() => bulkToggleActive(true)}
                                        className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 whitespace-nowrap">
                                        Mở khóa ({selectedUsers.length})
                                    </button>
                                    <button onClick={() => bulkToggleActive(false)}
                                        className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 whitespace-nowrap">
                                        Khóa ({selectedUsers.length})
                                    </button>
                                </>
                            )}
                            {can('users.import_export') && (
                                <button onClick={handleExport}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap">
                                    Xuất Excel ({selectedUsers.length})
                                </button>
                            )}
                            {can('users.edit') && (
                                <>
                                    <button onClick={() => setShowTransferModal(true)}
                                        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 whitespace-nowrap">
                                        Chuyển phòng ban ({selectedUsers.length})
                                    </button>
                                    <button onClick={() => setShowFieldModal(true)}
                                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 whitespace-nowrap">
                                        Cập nhật Lĩnh vực ({selectedUsers.length})
                                    </button>
                                </>
                            )}
                            {can('users.delete') && (
                                <button onClick={handleBulkDelete}
                                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 whitespace-nowrap">
                                    Xóa ({selectedUsers.length})
                                </button>
                            )}
                        </>
                    )}
                    {can('users.create') && (
                        <Link href="/admin/users/create"
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap">
                            + Thêm nhân viên
                        </Link>
                    )}
                </div>
            </div>

            {/* Search and Filter */}
            <div className="mb-6 bg-white p-4 rounded shadow flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
                    <input
                        type="text"
                        placeholder="Tên đăng nhập hoặc Họ tên..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 text-black"
                    />
                </div>
                <div className="w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
                    <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 text-black"
                    >
                        <option value="">Tất cả</option>
                        {departments.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
                <div className="w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lĩnh vực</label>
                    <select
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        className="w-full border border-gray-300 rounded p-2 text-black"
                    >
                        <option value="">Tất cả</option>
                        {fields.map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>
                <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hiển thị</label>
                    <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded p-2 text-black"
                    >
                        <option value={10}>10 dòng</option>
                        <option value={25}>25 dòng</option>
                        <option value={50}>50 dòng</option>
                        <option value={100}>100 dòng</option>
                        <option value={10000}>Tất cả</option>
                    </select>
                </div>
                <button
                    onClick={() => { setSearchTerm(''); setDepartment(''); setField(''); }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 h-10"
                >
                    Xóa lọc
                </button>
            </div>

            {can('users.import_export') && (
            <div className="mb-6 bg-white p-4 rounded shadow">
                <h2 className="text-lg font-semibold mb-2 text-black">Import / Cập nhật từ Excel</h2>
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="mr-4 text-black"
                />
                <button
                    onClick={handleImport}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    Tải lên
                </button>
                <a
                    href="/api/admin/samples/users"
                    className="ml-4 text-blue-600 hover:underline text-sm"
                >
                    Tải file mẫu
                </a>
                <p className="text-sm text-gray-500 mt-2">
                    Mẫu: Username | Pass | Name | Dept | Field <br />
                    * Nếu Username đã tồn tại, thông tin sẽ được cập nhật. Pass chỉ cập nhật nếu có nhập.
                </p>
            </div>
            )}

            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {(can('users.edit') || can('users.delete')) && (
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={users.length > 0 && selectedUsers.length === users.length}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                            </th>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tài khoản</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ tên</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng ban</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lĩnh vực</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                            {can('users.edit') && (
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">TT</th>
                            )}
                            {(can('users.edit') || can('users.delete')) && (
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className={selectedUsers.includes(user.id) ? 'bg-blue-50' : ''}>
                                {(can('users.edit') || can('users.delete')) && (
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={() => handleSelectUser(user.id)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </td>
                                )}
                                <td className="px-6 py-4 whitespace-nowrap text-black">{user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-black">{user.full_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-black">{user.department}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-black">{user.field}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-black">{user.role}</td>
                                {can('users.edit') && (
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => toggleUserActive(user.id, user.is_active !== false)}
                                        className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                                            user.is_active !== false
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                        }`}
                                        title={user.is_active !== false ? 'Đang hoạt động - Ấn để khóa' : 'Đã khóa - Ấn để mở'}
                                    >
                                        {user.is_active !== false ? 'ON' : 'OFF'}
                                    </button>
                                </td>
                                )}
                                {(can('users.edit') || can('users.delete')) && (
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {can('users.edit') && (
                                    <Link
                                        href={`/admin/users/${user.id}`}
                                        className="text-blue-600 hover:text-blue-900 mr-4"
                                    >
                                        Sửa
                                    </Link>
                                    )}
                                    {can('users.delete') && (
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Xóa
                                    </button>
                                    )}
                                </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
            />


            {/* Transfer Modal */}
            {
                showTransferModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
                            <h2 className="text-xl font-bold mb-4 text-black">Chuyển phòng ban</h2>
                            <p className="mb-4 text-gray-700">
                                Đang chọn {selectedUsers.length} nhân viên.
                                Vui lòng nhập tên phòng ban mới hoặc chọn từ danh sách.
                            </p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn phòng ban có sẵn</label>
                                <select
                                    value={targetDepartment}
                                    onChange={(e) => setTargetDepartment(e.target.value)}
                                    className="w-full border border-gray-300 rounded p-2 text-black mb-2"
                                >
                                    <option value="">-- Chọn phòng ban --</option>
                                    {departments.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>

                                <label className="block text-sm font-medium text-gray-700 mb-1">Hoặc nhập mới</label>
                                <input
                                    type="text"
                                    value={targetDepartment}
                                    onChange={(e) => setTargetDepartment(e.target.value)}
                                    placeholder="Tên phòng ban mới..."
                                    className="w-full border border-gray-300 rounded p-2 text-black"
                                />
                            </div>

                            <div className="flex justify-end space-x-2">
                                <button
                                    onClick={() => setShowTransferModal(false)}
                                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleBulkTransfer}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Field Update Modal */}
            {showFieldModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg w-96">
                        <h2 className="text-xl font-bold mb-4 text-black">Cập nhật Lĩnh vực</h2>
                        <p className="mb-4 text-gray-700">
                            Đang chọn {selectedUsers.length} nhân viên.
                        </p>

                        <div className="mb-4">
                            <div className="flex items-center mb-4">
                                <input
                                    type="checkbox"
                                    id="clearField"
                                    checked={isClearField}
                                    onChange={(e) => setIsClearField(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                                />
                                <label htmlFor="clearField" className="text-sm font-medium text-gray-700">Xóa lĩnh vực (để trống)</label>
                            </div>

                            {!isClearField && (
                                <>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Chọn lĩnh vực có sẵn</label>
                                    <select
                                        value={targetField}
                                        onChange={(e) => setTargetField(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-2 text-black mb-2"
                                    >
                                        <option value="">-- Chọn lĩnh vực --</option>
                                        {fields.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>

                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hoặc nhập mới</label>
                                    <input
                                        type="text"
                                        value={targetField}
                                        onChange={(e) => setTargetField(e.target.value)}
                                        placeholder="Tên lĩnh vực mới..."
                                        className="w-full border border-gray-300 rounded p-2 text-black"
                                    />
                                </>
                            )}
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setShowFieldModal(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleBulkFieldUpdate}
                                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                            >
                                Cập nhật
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
