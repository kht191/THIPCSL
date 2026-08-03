'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function EditTwoPartExam({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // General Info
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(30);
    const [maxAttempts, setMaxAttempts] = useState(1);
    const [maxViolations, setMaxViolations] = useState(3);
    const [status, setStatus] = useState('OPEN');

    // Part 1
    const [part1PassPercent, setPart1PassPercent] = useState(70);
    const [part1QuestionIds, setPart1QuestionIds] = useState<string[]>([]);
    const [part1Matrix, setPart1Matrix] = useState<Record<string, number>>({});
    const [part1Total, setPart1Total] = useState(0);

    // Part 2
    const [part2PassPercent, setPart2PassPercent] = useState(70);
    const [part2QuestionIds, setPart2QuestionIds] = useState<string[]>([]);
    const [part2Matrix, setPart2Matrix] = useState<Record<string, number>>({});
    const [part2Total, setPart2Total] = useState(0);

    // Topics
    const [topics, setTopics] = useState<any[]>([]);
    const [topicCounts, setTopicCounts] = useState<{ [key: string]: number }>({});

    // Regenerate
    const [regenerateQuestions, setRegenerateQuestions] = useState(false);

    // Matrix editing
    const [part1MatrixRows, setPart1MatrixRows] = useState<{ parentId: string; counts: Record<string, number> }[]>([{ parentId: '', counts: {} }]);
    const [part2MatrixRows, setPart2MatrixRows] = useState<{ parentId: string; counts: Record<string, number> }[]>([{ parentId: '', counts: {} }]);

    // Users
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [deptFilter, setDeptFilter] = useState('');
    const [fieldFilter, setFieldFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            // Fetch exam
            const examRes = await fetch(`/api/admin/exams/two-part/${id}`);
            if (!examRes.ok) {
                alert('Không tìm thấy đề thi 2 phần');
                router.push('/admin/exams');
                return;
            }
            const examData = await examRes.json();
            setTitle(examData.title);
            setDuration(examData.duration);
            setMaxAttempts(examData.max_attempts || 1);
            setMaxViolations(examData.max_violations || 3);
            setStatus(examData.status);

            try {
                setSelectedUsers(JSON.parse(examData.allowed_users || '[]'));
            } catch (e) {
                setSelectedUsers([]);
            }

            // Parse twoPartConfig
            if (examData.twoPartConfig) {
                const cfg = examData.twoPartConfig;
                setPart1PassPercent(cfg.part1PassPercent || 70);
                setPart2PassPercent(cfg.part2PassPercent || 70);
                setPart1QuestionIds(cfg.part1QuestionIds || []);
                setPart2QuestionIds(cfg.part2QuestionIds || []);
                setPart1Total((cfg.part1QuestionIds || []).length);
                setPart2Total((cfg.part2QuestionIds || []).length);
            }
            if (examData.part1Matrix) setPart1Matrix(examData.part1Matrix);
            if (examData.part2Matrix) setPart2Matrix(examData.part2Matrix);

            // Fetch users
            const usersRes = await fetch('/api/admin/users?limit=10000');
            if (usersRes.ok) {
                const json = await usersRes.json();
                const data = json.data || [];
                setUsers(data.filter((u: any) => u.role === 'CANDIDATE'));
            }

            // Fetch topics
            const topicsRes = await fetch('/api/admin/topics');
            let allTopics: any[] = [];
            if (topicsRes.ok) {
                allTopics = await topicsRes.json();
                setTopics(allTopics);
            }
            const statsRes = await fetch('/api/admin/stats/topics');
            if (statsRes.ok) {
                setTopicCounts(await statsRes.json());
            }

            // Build matrix rows from stored matrix
            if (examData.part1Matrix) {
                setPart1MatrixRows(buildMatrixRows(examData.part1Matrix, allTopics));
            }
            if (examData.part2Matrix) {
                setPart2MatrixRows(buildMatrixRows(examData.part2Matrix, allTopics));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const buildMatrixRows = (flatMatrix: Record<string, number>, allTopics: any[]) => {
        const rows: { parentId: string; counts: Record<string, number> }[] = [];
        const processedTopics = new Set<string>();

        for (const [topicId, count] of Object.entries(flatMatrix)) {
            if (processedTopics.has(topicId)) continue;

            const topic = allTopics.find(t => t.id === topicId);
            if (!topic) continue;

            let parentId = topic.parentId || topic.id;

            if (!topic.parentId) {
                parentId = topic.id;
            }

            let row = rows.find(r => r.parentId === parentId);
            if (!row) {
                row = { parentId, counts: {} };
                rows.push(row);
            }
            row.counts[topicId] = Number(count);
            processedTopics.add(topicId);
        }
        return rows.length > 0 ? rows : [{ parentId: '', counts: {} }];
    };

    // Matrix row handlers
    const handleAddRow = (setRows: any, rows: any[]) => setRows([...rows, { parentId: '', counts: {} }]);
    const handleRemoveRow = (setRows: any, rows: any[], index: number) => {
        if (rows.length <= 1) return;
        const newRows = [...rows];
        newRows.splice(index, 1);
        setRows(newRows);
    };
    const handleParentChange = (setRows: any, rows: any[], index: number, parentId: string) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], parentId, counts: {} };
        setRows(newRows);
    };
    const handleCountChange = (setRows: any, rows: any[], index: number, topicId: string, count: number) => {
        const newRows = [...rows];
        newRows[index].counts = { ...newRows[index].counts, [topicId]: count };
        setRows(newRows);
    };

    const handleUserSelect = (userId: string) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const handleSelectAllDept = () => {
        const deptUsers = users.filter(u =>
            (!deptFilter || u.department === deptFilter) &&
            (!fieldFilter || u.field === fieldFilter)
        ).map(u => u.id);
        setSelectedUsers(Array.from(new Set([...selectedUsers, ...deptUsers])));
    };

    const handleRemoveAllDept = () => {
        const deptUsers = users.filter(u =>
            (!deptFilter || u.department === deptFilter) &&
            (!fieldFilter || u.field === fieldFilter)
        ).map(u => u.id);
        setSelectedUsers(selectedUsers.filter(id => !deptUsers.includes(id)));
    };

    const computeFlatMatrix = (rows: { parentId: string; counts: Record<string, number> }[]) => {
        const flat: Record<string, number> = {};
        rows.forEach(row => {
            Object.entries(row.counts).forEach(([topicId, count]) => {
                if (count > 0) flat[topicId] = count;
            });
        });
        return flat;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const body: any = {
            title,
            duration,
            max_attempts: maxAttempts,
            max_violations: maxViolations,
            status,
            allowed_users: selectedUsers,
            part1PassPercent,
            part2PassPercent,
        };

        if (regenerateQuestions) {
            body.regenerate = true;
            body.part1Matrix = computeFlatMatrix(part1MatrixRows);
            body.part2Matrix = computeFlatMatrix(part2MatrixRows);
        }

        try {
            const res = await fetch(`/api/admin/exams/two-part/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                router.push('/admin/exams');
            } else {
                const data = await res.json();
                alert(data.error || 'Lỗi khi cập nhật đề thi');
            }
        } catch (error) {
            alert('Lỗi kết nối');
        } finally {
            setSaving(false);
        }
    };

    const rootTopics = topics.filter(t => !t.parentId);
    const getChildren = (id: string) => topics.filter(t => t.parentId === id);

    const renderMatrixRows = (
        rows: { parentId: string; counts: Record<string, number> }[],
        setRows: any,
        label: string
    ) => (
        <div className="space-y-4">
            <h3 className="font-semibold text-gray-700">{label}</h3>
            {rows.map((row, index) => {
                const children = getChildren(row.parentId);
                return (
                    <div key={index} className="border p-4 rounded bg-gray-50 relative">
                        <button
                            type="button"
                            onClick={() => handleRemoveRow(setRows, rows, index)}
                            className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-sm"
                            disabled={rows.length === 1}
                        >
                            Xóa
                        </button>
                        <div className="mb-3">
                            <label className="block text-xs text-gray-500 mb-1">Chủ đề chính</label>
                            <select
                                value={row.parentId}
                                onChange={(e) => handleParentChange(setRows, rows, index, e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                            >
                                <option value="">-- Chọn chủ đề --</option>
                                {rootTopics.map(root => (
                                    <option key={root.id} value={root.id}>{root.name}</option>
                                ))}
                            </select>
                        </div>
                        {row.parentId && (
                            <div>
                                {children.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {children.map(child => (
                                            <div key={child.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                                <label className="text-sm text-gray-700 flex-1 mr-2">
                                                    {child.name} <span className="text-xs text-gray-500">(Max: {topicCounts[child.id] || 0})</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={topicCounts[child.id] || 0}
                                                    placeholder="0"
                                                    value={row.counts[child.id] || ''}
                                                    onChange={(e) => handleCountChange(setRows, rows, index, child.id, parseInt(e.target.value) || 0)}
                                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-black"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-white p-2 rounded border">
                                        <label className="text-sm text-gray-700 flex-1 mr-2">
                                            Câu hỏi từ chủ đề chính <span className="text-xs text-gray-500">(Max: {topicCounts[row.parentId] || 0})</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={topicCounts[row.parentId] || 0}
                                            placeholder="0"
                                            value={row.counts[row.parentId] || ''}
                                            onChange={(e) => handleCountChange(setRows, rows, index, row.parentId, parseInt(e.target.value) || 0)}
                                            className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-black"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            <button type="button" onClick={() => handleAddRow(setRows, rows)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                + Thêm chủ đề
            </button>
        </div>
    );

    if (loading) return <div className="p-8 text-center">Đang tải...</div>;

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow">
            <h1 className="text-2xl font-bold mb-6 text-black">Chỉnh sửa Đề thi 2 Phần</h1>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* General Info */}
                <div className="space-y-4 border-b pb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Thông tin chung</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đợt thi</label>
                            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                            <input type="number" required value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số lần thi tối đa</label>
                            <input type="number" min="1" required value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số lần vi phạm tối đa</label>
                            <input type="number" min="0" required value={maxViolations} onChange={(e) => setMaxViolations(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-black">
                                <option value="OPEN">Đang mở (OPEN)</option>
                                <option value="CLOSED">Đã đóng (CLOSED)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Part Pass Percentages */}
                <div className="space-y-4 border-b pb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Tỷ lệ đỗ từng phần</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phần 1 - Yêu cầu chung (% đỗ)
                            </label>
                            <input type="number" min="0" max="100" value={part1PassPercent}
                                onChange={(e) => setPart1PassPercent(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                            <p className="text-xs text-gray-500 mt-1">Hiện có {part1Total} câu trong Phần 1</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phần 2 - Yêu cầu riêng (% đỗ)
                            </label>
                            <input type="number" min="0" max="100" value={part2PassPercent}
                                onChange={(e) => setPart2PassPercent(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                            <p className="text-xs text-gray-500 mt-1">Hiện có {part2Total} câu trong Phần 2</p>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-700">
                            Tổng số câu đề: <strong>{part1Total + part2Total}</strong> (Phần 1: {part1Total} + Phần 2: {part2Total})
                        </p>
                    </div>
                </div>

                {/* Matrix Regeneration */}
                <div className="space-y-4 border-b pb-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-800">Cấu trúc đề thi 2 phần</h2>
                        <label className="flex items-center space-x-2">
                            <input type="checkbox" checked={regenerateQuestions}
                                onChange={(e) => setRegenerateQuestions(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                            <span className="text-red-600 font-medium">Tạo lại câu hỏi (Thay đổi Ma trận)</span>
                        </label>
                    </div>

                    {regenerateQuestions ? (
                        <div className="space-y-8">
                            <div className="bg-blue-50 p-4 rounded border border-blue-200">
                                {renderMatrixRows(part1MatrixRows, setPart1MatrixRows, 'Phần 1: Yêu cầu chung')}
                            </div>
                            <div className="bg-green-50 p-4 rounded border border-green-200">
                                {renderMatrixRows(part2MatrixRows, setPart2MatrixRows, 'Phần 2: Yêu cầu riêng')}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded">
                                <p className="text-gray-700 font-medium">Phần 1 - Yêu cầu chung: <strong>{part1Total} câu</strong> (đỗ ≥ {part1PassPercent}%)</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded">
                                <p className="text-gray-700 font-medium">Phần 2 - Yêu cầu riêng: <strong>{part2Total} câu</strong> (đỗ ≥ {part2PassPercent}%)</p>
                            </div>
                            <p className="text-gray-500 italic">Tích vào ô trên để thay đổi cấu trúc câu hỏi.</p>
                        </div>
                    )}
                </div>

                {/* Users */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800">Phân quyền thi ({selectedUsers.length} người được chọn)</h2>
                    <div className="flex flex-wrap gap-3 items-center">
                        <input type="text" placeholder="Tìm kiếm theo tên hoặc mã NV..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 min-w-[250px] border border-gray-300 rounded px-3 py-2 text-black" />
                        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-black">
                            <option value="">-- Tất cả phòng ban --</option>
                            {Array.from(new Set(users.map(u => u.department))).map((dept: any) => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                        <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-black">
                            <option value="">-- Tất cả lĩnh vực --</option>
                            {Array.from(new Set(users.map(u => u.field).filter(Boolean))).map((f: any) => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <button type="button" onClick={handleSelectAllDept} className="text-blue-600 hover:underline text-sm">Chọn tất cả</button>
                            <span className="text-gray-300">|</span>
                            <button type="button" onClick={handleRemoveAllDept} className="text-red-600 hover:underline text-sm">Bỏ chọn tất cả</button>
                        </div>
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
                                {users.filter(u =>
                                    (!deptFilter || u.department === deptFilter) &&
                                    (!fieldFilter || u.field === fieldFilter) &&
                                    (!searchTerm || u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()))
                                ).map(user => (
                                    <tr key={user.id} onClick={() => handleUserSelect(user.id)}
                                        className={`cursor-pointer hover:bg-gray-50 ${selectedUsers.includes(user.id) ? 'bg-blue-50' : ''}`}>
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
                    <button type="button" onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">Hủy</button>
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
                        {saving ? 'Đang lưu...' : 'Cập nhật'}
                    </button>
                </div>
            </form>
        </div>
    );
}
