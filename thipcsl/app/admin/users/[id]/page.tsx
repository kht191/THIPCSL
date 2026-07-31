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
    const [activeTab, setActiveTab] = useState<'info' | 'exams' | 'results'>('info');

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
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
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

                {/* Tab: Kết quả */}
                {activeTab === 'results' && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đề thi</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ca thi</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Điểm</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Kết quả</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nộp lúc</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">TT</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {results.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-sm text-gray-900 break-words max-w-xs">{r.examTitle}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                                            {r.sessionName || (r.examType === 'PRACTICE' ? 'Ôn tập' : '-')}
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                            <span className={`text-sm font-semibold ${r.isPassed ? 'text-green-600' : 'text-red-600'}`}>
                                                {r.score.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${r.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {r.isPassed ? 'Đạt' : 'Không đạt'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                                            {new Date(r.submittedAt).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                            {r.status === 'IN_PROGRESS' ? (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">Đang làm</span>
                                            ) : r.isPrinted ? (
                                                <span className="text-xs text-green-600">✓ Đã in</span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap">
                                            <Link
                                                href={`/admin/results/${r.id}`}
                                                className="text-blue-600 hover:text-blue-900 text-xs mr-3"
                                            >
                                                Chi tiết
                                            </Link>
                                            <button
                                                onClick={() => deleteResult(r.id)}
                                                className="text-red-600 hover:text-red-900 text-xs"
                                                title="Xóa để thi lại"
                                            >
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {results.length === 0 && (
                            <div className="p-4 text-center text-gray-500 text-sm">Chưa có kết quả thi nào.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
