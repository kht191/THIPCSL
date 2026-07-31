'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function EditExam({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(30);
    const [maxAttempts, setMaxAttempts] = useState(1);
    const [passScore, setPassScore] = useState(5.0);
    const [maxViolations, setMaxViolations] = useState(3);
    const [status, setStatus] = useState('OPEN');
    const [examType, setExamType] = useState<string>('OFFICIAL');

    // Publish to practice
    const [practicePublished, setPracticePublished] = useState(false);
    const [practicePublishing, setPracticePublishing] = useState(false);

    // Users
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [deptFilter, setDeptFilter] = useState('');
    const [fieldFilter, setFieldFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Matrix (OFFICIAL)
    const [topics, setTopics] = useState<any[]>([]);
    const [matrix, setMatrix] = useState<{ [key: string]: number }>({});
    const [matrixRows, setMatrixRows] = useState<{ parentId: string; counts: Record<string, number> }[]>([{ parentId: '', counts: {} }]);
    const [topicCounts, setTopicCounts] = useState<{ [key: string]: number }>({});
    const [regenerateQuestions, setRegenerateQuestions] = useState(false);

    // TWO_PART specific
    const [part1PassPercent, setPart1PassPercent] = useState(70);
    const [part2PassPercent, setPart2PassPercent] = useState(70);
    const [part1Total, setPart1Total] = useState(0);
    const [part2Total, setPart2Total] = useState(0);
    const [part1MatrixRows, setPart1MatrixRows] = useState<{ parentId: string; counts: Record<string, number> }[]>([{ parentId: '', counts: {} }]);
    const [part2MatrixRows, setPart2MatrixRows] = useState<{ parentId: string; counts: Record<string, number> }[]>([{ parentId: '', counts: {} }]);

    useEffect(() => { fetchData(); }, [id]);

    const fetchData = async () => {
        try {
            const examRes = await fetch(`/api/admin/exams/${id}`);
            let examData: any = null;
            if (examRes.ok) {
                examData = await examRes.json();
                setTitle(examData.title);
                setDuration(examData.duration);
                setMaxAttempts(examData.max_attempts || 1);
                setPassScore(examData.pass_score || 5.0);
                setMaxViolations(examData.max_violations || 3);
                setStatus(examData.status);
                setExamType(examData.type || 'OFFICIAL');
                try { setSelectedUsers(JSON.parse(examData.allowed_users || '[]')); } catch { setSelectedUsers([]); }

                if (examData.settings) {
                    try {
                        const settings = JSON.parse(examData.settings);
                        if (examData.type === 'TWO_PART' && settings.twoPartConfig) {
                            const cfg = settings.twoPartConfig;
                            setPart1PassPercent(cfg.part1PassPercent || 70);
                            setPart2PassPercent(cfg.part2PassPercent || 70);
                            setPart1Total((cfg.part1QuestionIds || []).length);
                            setPart2Total((cfg.part2QuestionIds || []).length);
                            setRegenerateQuestions(true);
                        } else if (settings.matrix) {
                            setMatrix(settings.matrix);
                            setRegenerateQuestions(true);
                        }
                    } catch { }
                }
            } else { alert('Không tìm thấy đề thi'); router.push('/admin/exams'); return; }

            // Check publish status
            try {
                const pubRes = await fetch(`/api/admin/exams/${id}/publish-practice`);
                if (pubRes.ok) {
                    const pubData = await pubRes.json();
                    setPracticePublished(pubData.published);
                }
            } catch { }

            const usersRes = await fetch('/api/admin/users?limit=10000');
            if (usersRes.ok) { const json = await usersRes.json(); setUsers((json.data || []).filter((u: any) => u.role === 'CANDIDATE')); }

            const topicsRes = await fetch('/api/admin/topics');
            let allTopics: any[] = [];
            if (topicsRes.ok) { allTopics = await topicsRes.json(); setTopics(allTopics); }
            const statsRes = await fetch('/api/admin/stats/topics');
            if (statsRes.ok) setTopicCounts(await statsRes.json());

            // Build matrix rows
            if (examData.settings) {
                try {
                    const settings = JSON.parse(examData.settings);
                    if (examData.type === 'TWO_PART') {
                        if (settings.part1Matrix) setPart1MatrixRows(buildRows(settings.part1Matrix, allTopics));
                        if (settings.part2Matrix) setPart2MatrixRows(buildRows(settings.part2Matrix, allTopics));
                    } else if (settings.matrix) {
                        setMatrixRows(buildRows(settings.matrix, allTopics));
                    }
                } catch { }
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const buildRows = (flat: Record<string, number>, allTopics: any[]) => {
        const rows: { parentId: string; counts: Record<string, number> }[] = [];
        const done = new Set<string>();
        for (const [tid, count] of Object.entries(flat)) {
            if (done.has(tid)) continue;
            const t = allTopics.find(x => x.id === tid);
            if (!t) continue;
            const pid = t.parentId || t.id;
            let row = rows.find(r => r.parentId === pid);
            if (!row) { row = { parentId: pid, counts: {} }; rows.push(row); }
            row.counts[tid] = Number(count);
            done.add(tid);
        }
        return rows.length > 0 ? rows : [{ parentId: '', counts: {} }];
    };

    const rootTopics = topics.filter((t: any) => !t.parentId);
    const getChildren = (id: string) => topics.filter((t: any) => t.parentId === id);

    const handleUserSelect = (uid: string) => {
        setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
    };
    const handleSelectAllDept = () => {
        const ids = users.filter(u => (!deptFilter || u.department === deptFilter) && (!fieldFilter || u.field === fieldFilter)).map(u => u.id);
        setSelectedUsers(Array.from(new Set([...selectedUsers, ...ids])));
    };
    const handleRemoveAllDept = () => {
        const ids = users.filter(u => (!deptFilter || u.department === deptFilter) && (!fieldFilter || u.field === fieldFilter)).map(u => u.id);
        setSelectedUsers(selectedUsers.filter(id => !ids.includes(id)));
    };

    const handleAddRow = (rows: any[], setRows: any) => setRows([...rows, { parentId: '', counts: {} }]);
    const handleRemoveRow = (rows: any[], setRows: any, i: number) => {
        if (rows.length <= 1) return; const n = [...rows]; n.splice(i, 1); setRows(n);
    };
    const handleParentChange = (rows: any[], setRows: any, i: number, pid: string) => {
        const n = [...rows]; n[i] = { ...n[i], parentId: pid, counts: {} }; setRows(n);
    };
    const handleCountChange = (rows: any[], setRows: any, i: number, tid: string, count: number) => {
        const n = [...rows]; n[i].counts = { ...n[i].counts, [tid]: count }; setRows(n);
    };
    const computeFlat = (rows: { parentId: string; counts: Record<string, number> }[]) => {
        const flat: Record<string, number> = {};
        rows.forEach(r => { Object.entries(r.counts).forEach(([tid, c]) => { if (c > 0) flat[tid] = c; }); });
        return flat;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const body: any = { title, duration, max_attempts: maxAttempts, pass_score: passScore, max_violations: maxViolations, status, allowed_users: selectedUsers };
        if (examType === 'TWO_PART') {
            body.part1PassPercent = part1PassPercent;
            body.part2PassPercent = part2PassPercent;
            if (regenerateQuestions) {
                body.regenerate = true;
                body.part1Matrix = computeFlat(part1MatrixRows);
                body.part2Matrix = computeFlat(part2MatrixRows);
            }
        } else {
            if (regenerateQuestions) body.matrix = computeFlat(matrixRows);
        }
        const res = await fetch(`/api/admin/exams/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) router.push('/admin/exams');
        else { const d = await res.json(); alert(d.error || 'Lỗi cập nhật'); }
    };

    const renderMatrixRows = (rows: { parentId: string; counts: Record<string, number> }[], setRows: any) => (
        <div className="space-y-4">
            {rows.map((row, i) => {
                const children = getChildren(row.parentId);
                return (
                    <div key={i} className="border p-4 rounded bg-gray-50 relative">
                        <button type="button" onClick={() => handleRemoveRow(rows, setRows, i)} className="absolute top-2 right-2 text-red-600 text-sm" disabled={rows.length === 1}>Xóa</button>
                        <div className="mb-3">
                            <label className="block text-xs text-gray-500 mb-1">Chủ đề chính</label>
                            <select value={row.parentId} onChange={(e) => handleParentChange(rows, setRows, i, e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-black">
                                <option value="">-- Chọn chủ đề --</option>
                                {rootTopics.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        {row.parentId && (
                            <div>
                                {children.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {children.map((c: any) => (
                                            <div key={c.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                                <span className="text-sm text-gray-700">{c.name} <span className="text-xs text-gray-500">(Max: {topicCounts[c.id] || 0})</span></span>
                                                <input type="number" min="0" max={topicCounts[c.id] || 0} placeholder="0" value={row.counts[c.id] || ''}
                                                    onChange={(e) => handleCountChange(rows, setRows, i, c.id, parseInt(e.target.value) || 0)}
                                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-black" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-white p-2 rounded border">
                                        <span className="text-sm text-gray-700">Câu hỏi <span className="text-xs text-gray-500">(Max: {topicCounts[row.parentId] || 0})</span></span>
                                        <input type="number" min="0" max={topicCounts[row.parentId] || 0} placeholder="0" value={row.counts[row.parentId] || ''}
                                            onChange={(e) => handleCountChange(rows, setRows, i, row.parentId, parseInt(e.target.value) || 0)}
                                            className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-black" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            <button type="button" onClick={() => handleAddRow(rows, setRows)} className="text-sm text-blue-600 hover:text-blue-800">+ Thêm chủ đề</button>
        </div>
    );

    if (loading) return <div className="p-8 text-center">Đang tải...</div>;

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow">
            <h1 className="text-2xl font-bold mb-6 text-black">Chỉnh sửa Đề thi {examType === 'TWO_PART' ? '2 Phần' : ''}</h1>
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* General Info */}
                <div className="space-y-4 border-b pb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Thông tin chung</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đợt thi</label>
                            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                            <input type="number" required value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số lần thi tối đa</label>
                            <input type="number" min="1" required value={maxAttempts} onChange={e => setMaxAttempts(Number(e.target.value))} className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Điểm đạt (thang 10)</label>
                            <input type="number" min="0" max="10" step="0.1" required value={passScore} onChange={e => setPassScore(Number(e.target.value))} className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số lần vi phạm tối đa</label>
                            <input type="number" min="0" required value={maxViolations} onChange={e => setMaxViolations(Number(e.target.value))} className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-black">
                                <option value="OPEN">Đang mở (OPEN)</option>
                                <option value="CLOSED">Đã đóng (CLOSED)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hiển thị trong Ôn tập</label>
                            <button
                                onClick={async () => {
                                    setPracticePublishing(true);
                                    try {
                                        const res = await fetch(`/api/admin/exams/${id}/publish-practice`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ publish: !practicePublished }),
                                        });
                                        if (res.ok) {
                                            setPracticePublished(!practicePublished);
                                        } else {
                                            alert('Lỗi khi cập nhật trạng thái ôn tập');
                                        }
                                    } catch { alert('Lỗi kết nối'); }
                                    finally { setPracticePublishing(false); }
                                }}
                                disabled={practicePublishing}
                                className={`px-4 py-2 rounded font-bold text-white transition-colors ${
                                    practicePublished
                                        ? 'bg-orange-500 hover:bg-orange-600'
                                        : 'bg-gray-400 hover:bg-gray-500'
                                } disabled:opacity-50`}
                            >
                                {practicePublishing ? 'Đang xử lý...' : practicePublished ? '🔔 Đang hiển thị (Tắt)' : '🔕 Chưa hiển thị (Bật)'}
                            </button>
                            <p className="text-xs text-gray-500 mt-1">
                                {practicePublished ? 'Người dùng có thể xem và ôn tập đề này trong mục Ôn tập.' : 'Bật để cho phép người dùng ôn tập với cấu trúc đề này.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* TWO_PART: Pass percentages */}
                {examType === 'TWO_PART' && (
                    <div className="space-y-4 border-b pb-6">
                        <h2 className="text-xl font-semibold text-gray-800">Tỷ lệ đỗ từng phần</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phần 1 - Yêu cầu chung (% đỗ)</label>
                                <input type="number" min="0" max="100" value={part1PassPercent} onChange={e => setPart1PassPercent(Number(e.target.value))} className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                                <p className="text-xs text-gray-500 mt-1">Hiện có {part1Total} câu</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phần 2 - Yêu cầu riêng (% đỗ)</label>
                                <input type="number" min="0" max="100" value={part2PassPercent} onChange={e => setPart2PassPercent(Number(e.target.value))} className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                                <p className="text-xs text-gray-500 mt-1">Hiện có {part2Total} câu</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Matrix */}
                <div className="space-y-4 border-b pb-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-800">Cấu trúc đề thi</h2>
                        <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={regenerateQuestions} onChange={e => setRegenerateQuestions(e.target.checked)} className="h-4 w-4 text-blue-600 rounded" />
                            <span className="text-red-600 font-medium">Tạo lại câu hỏi</span>
                        </label>
                    </div>
                    {regenerateQuestions ? (
                        examType === 'TWO_PART' ? (
                            <div className="space-y-8">
                                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                                    <h3 className="font-semibold text-blue-800 mb-2">Phần 1: Yêu cầu chung</h3>
                                    {renderMatrixRows(part1MatrixRows, setPart1MatrixRows)}
                                </div>
                                <div className="bg-green-50 p-4 rounded border border-green-200">
                                    <h3 className="font-semibold text-green-800 mb-2">Phần 2: Yêu cầu riêng</h3>
                                    {renderMatrixRows(part2MatrixRows, setPart2MatrixRows)}
                                </div>
                            </div>
                        ) : (
                            renderMatrixRows(matrixRows, setMatrixRows)
                        )
                    ) : (
                        examType === 'TWO_PART' ? (
                            <div className="space-y-2">
                                <p className="text-gray-700">Phần 1: <strong>{part1Total} câu</strong> (đỗ ≥ {part1PassPercent}%)</p>
                                <p className="text-gray-700">Phần 2: <strong>{part2Total} câu</strong> (đỗ ≥ {part2PassPercent}%)</p>
                                <p className="text-gray-500 italic">Tích vào ô trên để thay đổi.</p>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">Danh sách câu hỏi được giữ nguyên. Tích vào ô trên để thay đổi.</p>
                        )
                    )}
                </div>

                {/* Users */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800">Phân quyền thi ({selectedUsers.length} người)</h2>
                    <div className="flex flex-wrap gap-3 items-center">
                        <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 min-w-[250px] border border-gray-300 rounded px-3 py-2 text-black" />
                        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-black">
                            <option value="">-- Tất cả phòng ban --</option>
                            {Array.from(new Set(users.map(u => u.department))).map((d: any) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={fieldFilter} onChange={e => setFieldFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-black">
                            <option value="">-- Tất cả lĩnh vực --</option>
                            {Array.from(new Set(users.map(u => u.field).filter(Boolean))).map((f: any) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <button type="button" onClick={handleSelectAllDept} className="text-blue-600 hover:underline text-sm">Chọn tất cả</button>
                        <span className="text-gray-300">|</span>
                        <button type="button" onClick={handleRemoveAllDept} className="text-red-600 hover:underline text-sm">Bỏ chọn tất cả</button>
                    </div>
                    <div className="border rounded max-h-96 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chọn</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã NV</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phòng ban</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lĩnh vực</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.filter((u: any) => (!deptFilter || u.department === deptFilter) && (!fieldFilter || u.field === fieldFilter) && (!searchTerm || u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()))).map((user: any) => (
                                    <tr key={user.id} onClick={() => handleUserSelect(user.id)} className={`cursor-pointer hover:bg-gray-50 ${selectedUsers.includes(user.id) ? 'bg-blue-50' : ''}`}>
                                        <td className="px-6 py-4"><input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => { }} className="h-4 w-4 text-blue-600 rounded" /></td>
                                        <td className="px-6 py-4 text-black">{user.username}</td>
                                        <td className="px-6 py-4 text-black">{user.full_name}</td>
                                        <td className="px-6 py-4 text-gray-500">{user.department}</td>
                                        <td className="px-6 py-4 text-gray-500">{user.field}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t">
                    <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">Hủy</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Cập nhật</button>
                </div>
            </form>
        </div>
    );
}
