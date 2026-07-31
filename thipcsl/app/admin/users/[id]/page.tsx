'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';

interface Exam {
    id: string;
    title: string;
    type: string;
    status: string;
    duration: number;
    max_attempts: number;
    totalResults: number;
}

interface ResultRow {
    id: string;
    examId: string;
    examTitle: string;
    examType: string;
    sessionName: string | null;
    score: number;
    isPassed: boolean;
    status: string;
    isPrinted: boolean;
    startedAt: string;
    submittedAt: string;
}

export default function EditUser({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [department, setDepartment] = useState('');
    const [field, setField] = useState('');
    const [role, setRole] = useState('CANDIDATE');
    const [createdAt, setCreatedAt] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [allExams, setAllExams] = useState<Exam[]>([]);
    const [assignedExamIds, setAssignedExamIds] = useState<string[]>([]);
    const [results, setResults] = useState<ResultRow[]>([]);
    const [examFilter, setExamFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'exams' | 'results' | 'permissions'>('info');

    // Permissions state
    const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
    const [hasExplicitPermissions, setHasExplicitPermissions] = useState(false);
    const [permSearch, setPermSearch] = useState('');
    const [savingPermissions, setSavingPermissions] = useState(false);
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);

    // Permission definitions (mirrored from lib for client)
    const PERM_GROUPS = [
        {
            name: 'Người dùng',
            perms: [
                { key: 'users.view', name: 'Xem danh sách người dùng' },
                { key: 'users.create', name: 'Tạo người dùng mới' },
                { key: 'users.edit', name: 'Chỉnh sửa người dùng' },
                { key: 'users.delete', name: 'Xóa người dùng' },
                { key: 'users.import_export', name: 'Import/Export người dùng' },
                { key: 'users.permissions', name: 'Quản lý phân quyền' },
            ]
        },
        {
            name: 'Câu hỏi & Chủ đề',
            perms: [
                { key: 'questions.manage', name: 'Quản lý câu hỏi' },
                { key: 'topics.manage', name: 'Quản lý chủ đề' },
            ]
        },
        {
            name: 'Đề thi & Ca thi',
            perms: [
                { key: 'exams.manage', name: 'Quản lý đề thi' },
                { key: 'sessions.manage', name: 'Quản lý ca thi' },
            ]
        },
        {
            name: 'Giám sát & Kết quả',
            perms: [
                { key: 'monitor.view', name: 'Xem giám sát thi' },
                { key: 'results.view', name: 'Xem kết quả thi' },
                { key: 'results.print_export', name: 'In/Xuất kết quả' },
                { key: 'exam.unlock', name: 'Mở khóa bài thi' },
            ]
        },
        {
            name: 'Thống kê',
            perms: [
                { key: 'statistics.view', name: 'Xem thống kê' },
            ]
        },
    ];

    const fetchPermissions = async () => {
        try {
            const res = await fetch(`/api/admin/users/${id}/permissions`);
            if (res.ok) {
                const data = await res.json();
                setPermissionKeys(data.permissionKeys || []);
                setHasExplicitPermissions(data.hasExplicitPermissions);
            }
        } catch (error) {
            console.error('Error fetching permissions', error);
        } finally {
            setPermissionsLoaded(true);
        }
    };

    const togglePermission = (key: string) => {
        setPermissionKeys(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const selectAllPermissions = () => {
        const allKeys = PERM_GROUPS.flatMap(g => g.perms.map(p => p.key));
        setPermissionKeys(allKeys);
    };

    const restoreRoleDefaults = async () => {
        setSavingPermissions(true);
        try {
            const res = await fetch(`/api/admin/users/${id}/permissions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restoreRole: true }),
            });
            if (res.ok) {
                const data = await res.json();
                setPermissionKeys(data.permissionKeys);
                setHasExplicitPermissions(false);
                alert(data.message || 'Đã khôi phục quyền theo vai trò mặc định');
            } else {
                alert('Lỗi khi khôi phục quyền');
            }
        } catch {
            alert('Lỗi kết nối');
        } finally {
            setSavingPermissions(false);
        }
    };

    const savePermissions = async () => {
        setSavingPermissions(true);
        try {
            const res = await fetch(`/api/admin/users/${id}/permissions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissionKeys }),
            });
            if (res.ok) {
                const data = await res.json();
                setHasExplicitPermissions(data.hasExplicitPermissions);
                alert(data.message || 'Đã lưu quyền thành công');
            } else {
                alert('Lỗi khi lưu quyền');
            }
        } catch {
            alert('Lỗi kết nối');
        } finally {
            setSavingPermissions(false);
        }
    };

    const deleteResult = async (resultId: string) => {
        if (!confirm('Xóa kết quả thi này? Người dùng sẽ được thi lại nếu còn lượt.')) return;
        try {
            const res = await fetch(`/api/admin/results/${resultId}`, { method: 'DELETE' });
            if (res.ok) {
                setResults(prev => prev.filter(r => r.id !== resultId));
            } else {
                alert('Lỗi khi xóa kết quả');
            }
        } catch {
            alert('Lỗi kết nối');
        }
    };

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch(`/api/admin/users/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setUsername(data.username);
                    setFullName(data.full_name);
                    setDepartment(data.department || '');
                    setField(data.field || '');
                    setRole(data.role);
                    setCreatedAt(data.createdAt);
                    setAllExams(data.allExams || []);
                    setAssignedExamIds(data.assignedExamIds || []);
                    setResults(data.results || []);
                } else {
                    alert('Không tìm thấy nhân viên');
                    router.push('/admin');
                }
            } catch (error) {
                console.error('Error fetching user', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const body: any = {
            full_name: fullName,
            department,
            field,
            role,
        };

        if (password) {
            body.password = password;
        }

        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            alert('Đã cập nhật thông tin');
            setPassword('');
        } else {
            alert('Lỗi khi cập nhật nhân viên');
        }
        setSaving(false);
    };

    const toggleExam = async (examId: string, isAssigned: boolean) => {
        const action = isAssigned ? 'remove' : 'add';

        // Optimistic update
        if (action === 'remove') {
            setAssignedExamIds(prev => prev.filter(eid => eid !== examId));
        } else {
            setAssignedExamIds(prev => [...prev, examId]);
        }

        try {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examId, action }),
            });
            if (!res.ok) {
                // Revert on error
                if (action === 'remove') {
                    setAssignedExamIds(prev => [...prev, examId]);
                } else {
                    setAssignedExamIds(prev => prev.filter(eid => eid !== examId));
                }
                alert('Lỗi khi cập nhật đề thi');
            }
        } catch (error) {
            // Revert
            if (action === 'remove') {
                setAssignedExamIds(prev => [...prev, examId]);
            } else {
                setAssignedExamIds(prev => prev.filter(eid => eid !== examId));
            }
            alert('Lỗi kết nối');
        }
    };

    if (loading) return <div className="p-8 text-center">Đang tải...</div>;

    const filteredExams = allExams.filter(exam =>
        exam.title.toLowerCase().includes(examFilter.toLowerCase())
    );

    const assignedCount = assignedExamIds.length;
    const passedCount = results.filter(r => r.isPassed).length;
    const completedCount = results.filter(r => r.status === 'COMPLETED').length;

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{fullName}</h1>
                    <p className="text-gray-500 text-sm">
                        @{username} • {department}{field ? ` • ${field}` : ''}
                        <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            {role === 'ADMIN' ? 'Quản trị viên' : role === 'PROCTOR' ? 'Giám thị' : 'Thí sinh'}
                        </span>
                    </p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm"
                >
                    ← Quay lại
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-white rounded shadow p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{assignedCount}</div>
                    <div className="text-xs text-gray-500 mt-1">Đề được giao</div>
                </div>
                <div className="bg-white rounded shadow p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{passedCount}</div>
                    <div className="text-xs text-gray-500 mt-1">Bài đạt</div>
                </div>
                <div className="bg-white rounded shadow p-4 text-center">
                    <div className="text-2xl font-bold text-gray-600">{completedCount}</div>
                    <div className="text-xs text-gray-500 mt-1">Bài đã nộp</div>
                </div>
                <div className="bg-white rounded shadow p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{results.filter(r => r.status === 'IN_PROGRESS').length}</div>
                    <div className="text-xs text-gray-500 mt-1">Đang làm dở</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 mb-0 border-b bg-white rounded-t shadow">
                {[
                    { key: 'info', label: 'Thông tin' },
                    { key: 'exams', label: `Đề thi (${assignedCount})` },
                    { key: 'results', label: `Kết quả (${results.length})` },
                    { key: 'permissions', label: 'Phân quyền' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => {
                            setActiveTab(tab.key as any);
                            if (tab.key === 'permissions' && !permissionsLoaded) {
                                fetchPermissions();
                            }
                        }}
                        className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.key
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-b shadow p-6">
                {/* Tab: Thông tin */}
                {activeTab === 'info' && (
                    <div className="max-w-lg">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tài khoản</label>
                                <input type="text" disabled value={username}
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-100 text-gray-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mật khẩu mới (để trống nếu không đổi)</label>
                                <input type="password" value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Họ tên</label>
                                <input type="text" required value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phòng ban</label>
                                <input type="text" value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Lĩnh vực</label>
                                <input type="text" value={field}
                                    onChange={(e) => setField(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                                <select value={role} onChange={(e) => setRole(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-black">
                                    <option value="CANDIDATE">Thí sinh (CANDIDATE)</option>
                                    <option value="PROCTOR">Giám thị (PROCTOR)</option>
                                    <option value="ADMIN">Quản trị viên (ADMIN)</option>
                                </select>
                            </div>
                            {createdAt && (
                                <p className="text-xs text-gray-400">Ngày tạo: {new Date(createdAt).toLocaleString('vi-VN')}</p>
                            )}
                            <div className="flex justify-end space-x-4 pt-4">
                                <button type="button" onClick={() => router.back()}
                                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
                                    Hủy
                                </button>
                                <button type="submit" disabled={saving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
                                    {saving ? 'Đang lưu...' : 'Cập nhật'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tab: Đề thi */}
                {activeTab === 'exams' && (
                    <div>
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Lọc đề thi..."
                                value={examFilter}
                                onChange={(e) => setExamFilter(e.target.value)}
                                className="border p-2 rounded w-full sm:w-96 text-black text-sm"
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="w-10 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gán</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đề thi</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">T.gian</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lượt thi</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredExams.map(exam => {
                                        const isAssigned = assignedExamIds.includes(exam.id);
                                        return (
                                            <tr key={exam.id}
                                                className={`hover:bg-gray-50 cursor-pointer ${isAssigned ? 'bg-blue-50' : ''}`}
                                                onClick={() => toggleExam(exam.id, isAssigned)}>
                                                <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isAssigned}
                                                        onChange={() => toggleExam(exam.id, isAssigned)}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-900 break-words">{exam.title}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                    <span className={`px-1.5 py-0.5 rounded ${exam.type === 'TWO_PART' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {exam.type === 'TWO_PART' ? '2 phần' : 'Official'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{exam.duration}p</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{exam.max_attempts}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-xs">
                                                    <span className={`px-1.5 py-0.5 rounded ${exam.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {exam.status === 'OPEN' ? 'Mở' : exam.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredExams.length === 0 && (
                                <div className="p-4 text-center text-gray-500 text-sm">Không tìm thấy đề thi nào.</div>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-3">Click vào dòng hoặc checkbox để thêm/gỡ đề thi cho thí sinh này.</p>
                    </div>
                )}

                {/* Tab: Phân quyền */}
                {activeTab === 'permissions' && (
                    <div>
                        {!permissionsLoaded ? (
                            <div className="text-center py-8 text-gray-500">Đang tải...</div>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm quyền..."
                                        value={permSearch}
                                        onChange={(e) => setPermSearch(e.target.value)}
                                        className="border p-2 rounded w-64 text-sm text-black"
                                    />
                                    <button
                                        onClick={selectAllPermissions}
                                        className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200 text-gray-700"
                                    >
                                        Chọn tất cả
                                    </button>
                                    <button
                                        onClick={() => setPermissionKeys([])}
                                        className="px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200 text-gray-700"
                                    >
                                        Bỏ chọn tất cả
                                    </button>
                                    {hasExplicitPermissions && (
                                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                            ⚠️ Đang dùng quyền tùy chỉnh (ghi đè vai trò mặc định)
                                        </span>
                                    )}
                                </div>

                                {PERM_GROUPS.map(group => {
                                    const filteredPerms = group.perms.filter(p =>
                                        !permSearch ||
                                        p.name.toLowerCase().includes(permSearch.toLowerCase()) ||
                                        p.key.toLowerCase().includes(permSearch.toLowerCase())
                                    );
                                    if (filteredPerms.length === 0) return null;
                                    return (
                                        <div key={group.name} className="mb-4 border rounded p-4">
                                            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                {group.name}
                                                <span className="text-xs text-gray-400 font-normal">
                                                    ({filteredPerms.filter(p => permissionKeys.includes(p.key)).length}/{filteredPerms.length})
                                                </span>
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {filteredPerms.map(p => (
                                                    <label
                                                        key={p.key}
                                                        className="flex items-start gap-2 text-sm cursor-pointer p-1.5 hover:bg-gray-50 rounded"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={permissionKeys.includes(p.key)}
                                                            onChange={() => togglePermission(p.key)}
                                                            className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                        <div>
                                                            <span className="text-gray-800">{p.name}</span>
                                                            <span className="text-xs text-gray-400 ml-2 font-mono">{p.key}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="flex gap-3 mt-4 pt-4 border-t">
                                    <button
                                        onClick={restoreRoleDefaults}
                                        disabled={savingPermissions}
                                        className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
                                    >
                                        {savingPermissions ? 'Đang xử lý...' : '🔄 Khôi phục theo vai trò'}
                                    </button>
                                    <button
                                        onClick={savePermissions}
                                        disabled={savingPermissions}
                                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                        {savingPermissions ? 'Đang lưu...' : '💾 Lưu quyền'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
