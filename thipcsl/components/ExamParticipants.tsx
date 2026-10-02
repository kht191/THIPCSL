'use client';

import { useEffect, useState } from 'react';

interface Candidate {
    id: string;
    username: string;
    full_name: string;
    department: string;
}
interface ActiveAttempt {
    id: string;
    user: Omit<Candidate, 'id'>;
    progress: { answered: number; total: number };
    isLocked: boolean;
}

export default function ExamParticipants({ examId, users, selectedIds }: {
    examId: string; users: Candidate[]; selectedIds: string[];
}) {
    const [attempts, setAttempts] = useState<ActiveAttempt[]>([]);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        const refresh = async () => {
            try {
                const res = await fetch(`/api/admin/monitor?examId=${encodeURIComponent(examId)}`);
                if (!res.ok) throw new Error('Không thể tải thí sinh đang làm bài.');
                const data = await res.json();
                if (!cancelled) { setAttempts(data); setError(''); }
            } catch {
                if (!cancelled) setError('Không thể tải thí sinh đang làm bài. Đang thử lại...');
            } finally {
                if (!cancelled) { setLoading(false); timer = setTimeout(refresh, 10000); }
            }
        };
        const init = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (!res.ok) throw new Error('Không thể kiểm tra quyền giám sát.');
                const user = await res.json();
                if (cancelled) return;
                setPermissions(user.permissions || []);
                if (user.permissions?.includes('monitor.view')) await refresh();
                else { setError('Bạn chưa có quyền xem giám sát và tiến độ làm bài.'); setLoading(false); }
            } catch {
                if (!cancelled) { setError('Không thể kiểm tra quyền giám sát. Vui lòng tải lại trang.'); setLoading(false); }
            }
        };
        setLoading(true);
        void init();
        return () => { cancelled = true; clearTimeout(timer); };
    }, [examId]);

    const selected = new Set(selectedIds);
    const assigned = users.filter(user => selected.has(user.id));
    const query = search.trim().toLocaleLowerCase('vi');
    const visible = assigned.filter(user => `${user.username} ${user.full_name} ${user.department}`.toLocaleLowerCase('vi').includes(query));

    return (
        <section className="space-y-6 border rounded p-4 bg-gray-50 text-gray-800">
            <div>
                <h2 className="text-xl font-semibold">Thí sinh được chọn tham gia đề ({selectedIds.length})</h2>
                <p className="text-sm text-gray-600 mt-1">Danh sách theo lựa chọn bên dưới. Bấm Cập nhật để lưu thay đổi phân quyền thi.</p>
                <input aria-label="Tìm trong thí sinh được chọn" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã nhân viên, họ tên, đơn vị..." className="my-3 w-full border rounded p-2 text-black" />
                {assigned.length < selectedIds.length && <p className="text-amber-700 text-sm">Chưa tải được thông tin của {selectedIds.length - assigned.length} tài khoản đã chọn.</p>}
                <div className="max-h-64 overflow-auto bg-white rounded border">
                    <table className="w-full text-left text-sm">
                        <thead><tr><th className="p-2">Mã NV</th><th className="p-2">Họ tên</th><th className="p-2">Đơn vị</th></tr></thead>
                        <tbody>{visible.map(user => <tr key={user.id} className="border-t"><td className="p-2">{user.username}</td><td className="p-2">{user.full_name}</td><td className="p-2">{user.department}</td></tr>)}</tbody>
                    </table>
                    {visible.length === 0 && <p className="p-3 text-gray-500">{selectedIds.length ? 'Không có thí sinh phù hợp để hiển thị.' : 'Chưa chọn thí sinh cho đề này.'}</p>}
                </div>
            </div>
            <div>
                <h2 className="text-xl font-semibold">Thí sinh đang làm bài{!loading && !error ? ` (${attempts.length})` : ''}</h2>
                <p className="text-sm text-gray-600 mt-1">Bài thi đang diễn ra trong đề này; cập nhật mỗi 10 giây.</p>
                {loading ? <p className="mt-3">Đang tải...</p> : error ? <p role="alert" className="mt-3 text-amber-700">{error}</p> : (
                    <div className="mt-3 max-h-64 overflow-auto bg-white rounded border">
                        <table className="w-full text-left text-sm">
                            <thead><tr><th className="p-2">Thí sinh</th><th className="p-2">Đơn vị</th><th className="p-2">Tiến độ</th><th className="p-2">Trạng thái</th><th className="p-2">Bài làm</th></tr></thead>
                            <tbody>{attempts.map(item => <tr key={item.id} className="border-t">
                                <td className="p-2">{item.user.full_name} ({item.user.username})</td><td className="p-2">{item.user.department}</td>
                                <td className="p-2">{item.progress.answered}/{item.progress.total} câu</td><td className="p-2">{item.isLocked ? 'Đang bị khóa' : 'Đang thi'}</td>
                                <td className="p-2">{permissions.includes('monitor.answers') && <a href={`/admin/monitor/${item.id}`} className="text-blue-600 underline">Chi tiết</a>}</td>
                            </tr>)}</tbody>
                        </table>
                        {attempts.length === 0 && <p className="p-3 text-gray-500">Hiện không có thí sinh đang làm bài trong đề này.</p>}
                    </div>
                )}
            </div>
        </section>
    );
}
