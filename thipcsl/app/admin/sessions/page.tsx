'use client';

import { useState, useEffect } from 'react';
import Pagination from '@/components/Pagination';

export default function ExamSessions() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    // Form Data
    const [name, setName] = useState('');
    const [examIds, setExamIds] = useState<string[]>([]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [status, setStatus] = useState('ACTIVE');

    useEffect(() => {
        fetchData(page);
    }, [page, limit]);

    const fetchData = async (currentPage = 1) => {
        try {
            const [sessRes, examRes] = await Promise.all([
                fetch(`/api/admin/sessions?page=${currentPage}&limit=${limit}`),
                fetch('/api/admin/exams?limit=1000')
            ]);

            if (sessRes.ok) {
                const data = await sessRes.json();
                setSessions(data.data);
                setTotalPages(data.metadata.totalPages);
            }
            if (examRes.ok) {
                const data = await examRes.json();
                setExams(data.data);
            }
        } catch (error) {
            console.error('Error fetching data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = '/api/admin/sessions';
            const method = editingId ? 'PUT' : 'POST';
            const body: any = {
                name,
                examIds,
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString()
            };

            if (editingId) {
                body.id = editingId;
                body.status = status;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                const updatedSession = await res.json();
                // Refresh data to get the full relation
                fetchData(page);
                setShowModal(false);
                resetForm();
            } else {
                alert('Lỗi khi lưu ca thi');
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi kết nối');
        }
    };

    const handleEdit = (session: any) => {
        setEditingId(session.id);
        setName(session.name);
        setExamIds(session.exams?.map((e: any) => e.id) || []);
        // Convert UTC to local time for datetime-local input
        const toLocalISO = (dateStr: string) => {
            const date = new Date(dateStr);
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().slice(0, 16);
        };
        setStartTime(toLocalISO(session.startTime));
        setEndTime(toLocalISO(session.endTime));
        setStatus(session.status);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa ca thi này?')) return;
        try {
            const res = await fetch(`/api/admin/sessions?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSessions(sessions.filter(s => s.id !== id));
            } else {
                alert('Lỗi khi xóa');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setName('');
        setExamIds([]);
        setStartTime('');
        setEndTime('');
        setStatus('ACTIVE');
    };

    const toggleExam = (id: string) => {
        setExamIds(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    if (loading) return <div className="p-8">Đang tải...</div>;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-bold text-gray-800">Quản lý Ca thi</h1>
                <div className="flex items-center gap-2">
                    <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="border p-2 rounded text-black"
                    >
                        <option value={10}>10 dòng</option>
                        <option value={25}>25 dòng</option>
                        <option value={50}>50 dòng</option>
                        <option value={100}>100 dòng</option>
                        <option value={10000}>Tất cả</option>
                    </select>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap"
                    >
                        + Tạo Ca thi
                    </button>
                </div>
            </div>

            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên Ca thi</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đề thi</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sessions.map((session) => {
                            const now = new Date();
                            const start = new Date(session.startTime);
                            const end = new Date(session.endTime);
                            let status = 'Sắp diễn ra';
                            let statusColor = 'bg-yellow-100 text-yellow-800';

                            if (now >= start && now <= end) {
                                status = 'Đang diễn ra';
                                statusColor = 'bg-green-100 text-green-800';
                            } else if (now > end) {
                                status = 'Đã kết thúc';
                                statusColor = 'bg-gray-100 text-gray-800';
                            }

                            return (
                                <tr key={session.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{session.name}</td>
                                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={session.exams?.map((e: any) => e.title).join(', ')}>
                                        {session.exams?.map((e: any) => e.title).join(', ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>{start.toLocaleString('vi-VN')}</div>
                                        <div className="text-xs">đến</div>
                                        <div>{end.toLocaleString('vi-VN')}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                        <button onClick={() => handleEdit(session)} className="text-blue-600 hover:text-blue-900">Sửa</button>
                                        <button onClick={() => handleDelete(session.id)} className="text-red-600 hover:text-red-900">Xóa</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {sessions.length === 0 && <div className="p-4 text-center text-gray-500">Chưa có ca thi nào.</div>}
            </div>
            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
            />

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editingId ? 'Cập nhật Ca thi' : 'Tạo Ca thi mới'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tên Ca thi</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 w-full border rounded px-3 py-2"
                                    placeholder="VD: Ca sáng 15/01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Đề thi (Chọn nhiều)</label>
                                <div className="border rounded max-h-48 overflow-y-auto p-2 space-y-2">
                                    {exams.map(e => (
                                        <div key={e.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`exam-${e.id}`}
                                                checked={examIds.includes(e.id)}
                                                onChange={() => toggleExam(e.id)}
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <label htmlFor={`exam-${e.id}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                                                {e.title}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {examIds.length === 0 && <p className="text-red-500 text-xs mt-1">Vui lòng chọn ít nhất 1 đề thi</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Thời gian bắt đầu</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="mt-1 w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Thời gian kết thúc</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="mt-1 w-full border rounded px-3 py-2"
                                />
                            </div>
                            {editingId && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="mt-1 w-full border rounded px-3 py-2"
                                    >
                                        <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                                        <option value="INACTIVE">Ngừng hoạt động (INACTIVE)</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    {editingId ? 'Cập nhật' : 'Tạo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
