'use client';

import { useState, useEffect } from 'react';

export default function ExamMonitor() {
    const [data, setData] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSessionId, setFilterSessionId] = useState('');

    useEffect(() => {
        fetchData();
        fetchSessions();
        const interval = setInterval(fetchData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/monitor');
            if (res.ok) {
                setData(await res.json());
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Error fetching monitor data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/admin/sessions');
            if (res.ok) {
                const sessionData = await res.json();
                setSessions(sessionData.data || []);
            }
        } catch (error) {
            console.error('Error fetching sessions', error);
        }
    };

    const handleUnlock = async (id: string) => {
        if (!confirm('Bạn có chắc muốn mở khóa cho thí sinh này?')) return;
        try {
            const res = await fetch(`/api/admin/results/${id}/unlock`, {
                method: 'POST',
            });
            if (res.ok) {
                alert('Đã mở khóa thành công');
                fetchData();
            } else {
                alert('Lỗi khi mở khóa');
            }
        } catch (error) {
            console.error('Error unlocking', error);
        }
    };

    const filteredData = data.filter(item => {
        const matchesSearch =
            item.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.exam.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSession = !filterSessionId || item.sessionId === filterSessionId || item.session === sessions.find(s => s.id === filterSessionId)?.name;

        return matchesSearch && matchesSession;
    });

    if (loading && data.length === 0) return <div className="p-8">Đang tải dữ liệu giám sát...</div>;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-bold text-gray-800">Giám sát thi trực tuyến</h1>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm text-gray-500">
                        Cập nhật lúc: {lastUpdated.toLocaleTimeString('vi-VN')}
                    </div>
                    <select
                        value={filterSessionId}
                        onChange={(e) => setFilterSessionId(e.target.value)}
                        className="border p-2 rounded w-full sm:w-64 text-black"
                    >
                        <option value="">-- Tất cả Ca thi --</option>
                        {sessions.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.exam?.title})</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Tìm kiếm thí sinh, bài thi..."
                        className="border p-2 rounded w-full sm:w-64 text-black"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thí sinh</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đề thi / Ca thi</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bắt đầu lúc</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiến độ</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredData.map((item) => {
                            const progressPercent = item.progress.total > 0
                                ? (item.progress.answered / item.progress.total) * 100
                                : 0;

                            return (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{item.user.full_name}</div>
                                        <div className="text-sm text-gray-500">{item.user.username} - {item.user.department}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{item.exam}</div>
                                        <div className="text-xs text-gray-500">{item.session || 'Không có ca'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(item.startedAt).toLocaleTimeString('vi-VN')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 max-w-[150px]">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full"
                                                style={{ width: `${progressPercent}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {item.progress.answered} / {item.progress.total} câu
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {item.isLocked ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                Đang bị khóa
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 animate-pulse">
                                                Đang thi
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        {item.isLocked && (
                                            <button
                                                onClick={() => handleUnlock(item.id)}
                                                className="text-red-600 hover:text-red-900 font-bold"
                                            >
                                                Mở khóa
                                            </button>
                                        )}
                                        <a href={`/admin/monitor/${item.id}`} className="text-blue-600 hover:text-blue-900">
                                            Chi tiết
                                        </a>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredData.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        {data.length === 0 ? "Hiện không có thí sinh nào đang làm bài." : "Không tìm thấy thí sinh phù hợp với bộ lọc."}
                    </div>
                )}
            </div>
        </div>
    );
}
