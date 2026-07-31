'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateExam() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Info
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(30);
    const [maxAttempts, setMaxAttempts] = useState(1);
    const [maxViolations, setMaxViolations] = useState(3);
    const [passScore, setPassScore] = useState(5.0);
    const [examType, setExamType] = useState<'OFFICIAL' | 'TWO_PART'>('OFFICIAL');

    // Topics & counts
    const [topics, setTopics] = useState<any[]>([]);
    const [topicCounts, setTopicCounts] = useState<{ [key: string]: number }>({});

    // Matrix for OFFICIAL
    const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
    const [matrix, setMatrix] = useState<{ [key: string]: number }>({});

    // Part 1 for TWO_PART
    const [selectedPart1Topics, setSelectedPart1Topics] = useState<string[]>([]);
    const [part1Matrix, setPart1Matrix] = useState<{ [key: string]: number }>({});
    const [part1PassPercent, setPart1PassPercent] = useState(70);

    // Part 2 for TWO_PART
    const [selectedPart2Topics, setSelectedPart2Topics] = useState<string[]>([]);
    const [part2Matrix, setPart2Matrix] = useState<{ [key: string]: number }>({});
    const [part2PassPercent, setPart2PassPercent] = useState(70);

    // Users
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [deptFilter, setDeptFilter] = useState('');
    const [fieldFilter, setFieldFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTopics();
        fetchUsers();
    }, []);

    const fetchTopics = async () => {
        const res = await fetch('/api/admin/topics');
        if (res.ok) {
            const data = await res.json();
            setTopics(data);
            const statsRes = await fetch('/api/admin/stats/topics');
            if (statsRes.ok) setTopicCounts(await statsRes.json());
        }
    };

    const fetchUsers = async () => {
        const res = await fetch('/api/admin/users?limit=1000');
        if (res.ok) {
            const data = await res.json();
            setUsers((data.data || []).filter((u: any) => u.role === 'CANDIDATE'));
        }
    };

    const totalSteps = examType === 'TWO_PART' ? 4 : 3;
    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleMatrixChange = (m: Record<string, number>, setM: any, topicId: string, count: number) => {
        setM({ ...m, [topicId]: count });
    };

    const handleTopicSelect = (selectedIds: string[], setSelected: any, m: Record<string, number>, setM: any, topicId: string) => {
        if (selectedIds.includes(topicId)) {
            setSelected(selectedIds.filter((id: string) => id !== topicId));
            const newM = { ...m };
            delete newM[topicId];
            getChildren(topicId).forEach((child: any) => delete newM[child.id]);
            setM(newM);
        } else {
            setSelected([...selectedIds, topicId]);
        }
    };

    const handleUserSelect = (userId: string) => {
        if (selectedUsers.includes(userId)) setSelectedUsers(selectedUsers.filter(id => id !== userId));
        else setSelectedUsers([...selectedUsers, userId]);
    };

    const handleSelectAllDept = () => {
        const deptUsers = users.filter(u =>
            (!deptFilter || u.department === deptFilter) && (!fieldFilter || u.field === fieldFilter)
        ).map(u => u.id);
        setSelectedUsers(Array.from(new Set([...selectedUsers, ...deptUsers])));
    };

    const handleRemoveAllDept = () => {
        const deptUsers = users.filter(u =>
            (!deptFilter || u.department === deptFilter) && (!fieldFilter || u.field === fieldFilter)
        ).map(u => u.id);
        setSelectedUsers(selectedUsers.filter(id => !deptUsers.includes(id)));
    };

    const getPart1Total = () => Object.values(part1Matrix).reduce((s: number, c) => s + Number(c), 0);
    const getPart2Total = () => Object.values(part2Matrix).reduce((s: number, c) => s + Number(c), 0);
    const getGrandTotal = () => getPart1Total() + getPart2Total();

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const body: any = { title, duration, max_attempts: maxAttempts, max_violations: maxViolations, allowed_users: selectedUsers };
            if (examType === 'TWO_PART') {
                body.type = 'TWO_PART';
                body.part1Matrix = part1Matrix;
                body.part2Matrix = part2Matrix;
                body.part1PassPercent = part1PassPercent;
                body.part2PassPercent = part2PassPercent;
            } else {
                body.pass_score = passScore;
                body.matrix = matrix;
            }
            const res = await fetch('/api/admin/exams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) router.push('/admin/exams');
            else { const data = await res.json(); alert(data.error || 'Lỗi khi tạo đề thi'); }
        } catch (e) { alert('Lỗi kết nối'); }
        finally { setLoading(false); }
    };

    const rootTopics = topics.filter((t: any) => !t.parentId);
    const getChildren = (id: string) => topics.filter((t: any) => t.parentId === id);

    const renderTopicMatrix = (
        selectedIds: string[], m: Record<string, number>,
        setSelected: any, setM: any
    ) => (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <h3 className="font-bold text-blue-800 mb-2">Chọn Chủ đề</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {rootTopics.map((root: any) => (
                        <label key={root.id} className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={selectedIds.includes(root.id)}
                                onChange={(e) => e.target.checked ? setSelected([...selectedIds, root.id]) : handleTopicSelect(selectedIds, setSelected, m, setM, root.id)}
                                className="h-4 w-4 text-blue-600 rounded" />
                            <span className="text-gray-800">{root.name}</span>
                        </label>
                    ))}
                </div>
            </div>
            {selectedIds.length > 0 && (
                <div className="border rounded p-4 max-h-96 overflow-y-auto">
                    {rootTopics.filter((t: any) => selectedIds.includes(t.id)).map((root: any) => (
                        <div key={root.id} className="mb-4">
                            <h3 className="font-bold text-lg text-gray-800">{root.name}</h3>
                            {getChildren(root.id).length === 0 ? (
                                <div className="flex items-center justify-between ml-4 mt-2">
                                    <span className="text-gray-700">Câu hỏi (Có sẵn: {topicCounts[root.id] || 0})</span>
                                    <input type="number" min="0" max={topicCounts[root.id] || 0} value={m[root.id] || 0}
                                        onChange={(e) => handleMatrixChange(m, setM, root.id, Number(e.target.value))}
                                        className="w-24 border border-gray-300 rounded px-2 py-1 text-black" />
                                </div>
                            ) : (
                                <div className="ml-4 space-y-2">
                                    {getChildren(root.id).map((child: any) => (
                                        <div key={child.id} className="flex items-center justify-between">
                                            <span className="text-gray-700">{child.name} (Có sẵn: {topicCounts[child.id] || 0})</span>
                                            <input type="number" min="0" max={topicCounts[child.id] || 0} value={m[child.id] || 0}
                                                onChange={(e) => handleMatrixChange(m, setM, child.id, Number(e.target.value))}
                                                className="w-24 border border-gray-300 rounded px-2 py-1 text-black" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderUserTable = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Chọn thí sinh tham gia ({selectedUsers.length} người)</h2>
            <div className="flex flex-wrap gap-3 items-center">
                <input type="text" placeholder="Tìm kiếm theo tên hoặc mã NV..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 min-w-[250px] border border-gray-300 rounded px-3 py-2 text-black" />
                <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-black">
                    <option value="">-- Tất cả phòng ban --</option>
                    {Array.from(new Set(users.map(u => u.department))).map((dept: any) => <option key={dept} value={dept}>{dept}</option>)}
                </select>
                <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-black">
                    <option value="">-- Tất cả lĩnh vực --</option>
                    {Array.from(new Set(users.map(u => u.field).filter(Boolean))).map((f: any) => <option key={f} value={f}>{f}</option>)}
                </select>
                <div className="flex gap-2">
                    <button onClick={handleSelectAllDept} className="text-blue-600 hover:underline text-sm">Chọn tất cả</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={handleRemoveAllDept} className="text-red-600 hover:underline text-sm">Bỏ chọn tất cả</button>
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
                        {users.filter((u: any) =>
                            (!deptFilter || u.department === deptFilter) && (!fieldFilter || u.field === fieldFilter) &&
                            (!searchTerm || u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()))
                        ).map((user: any) => (
                            <tr key={user.id} onClick={() => handleUserSelect(user.id)} className="cursor-pointer hover:bg-gray-50">
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
    );

    const stepLabels = examType === 'TWO_PART'
        ? ['Thông tin chung', 'Phần 1: Yêu cầu chung', 'Phần 2: Yêu cầu riêng', 'Chọn thí sinh']
        : ['Thông tin chung', 'Ma trận đề', 'Chọn thí sinh'];

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow">
            <h1 className="text-2xl font-bold mb-6 text-black">Tạo Đề thi mới (Bước {step}/{totalSteps})</h1>

            {/* Step Indicator */}
            <div className="flex mb-8 border-b pb-4">
                {stepLabels.map((label, i) => (
                    <div key={i} className={`flex-1 text-center text-sm font-medium px-2 ${step === i + 1 ? 'text-blue-600 font-bold' : step > i + 1 ? 'text-green-600' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 text-white text-xs ${step === i + 1 ? 'bg-blue-600' : step > i + 1 ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {step > i + 1 ? '✓' : i + 1}
                        </div>
                        {label}
                    </div>
                ))}
            </div>

            {/* Step 1: Info */}
            {step === 1 && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại đề thi</label>
                        <select value={examType} onChange={(e) => setExamType(e.target.value as 'OFFICIAL' | 'TWO_PART')}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-black font-medium">
                            <option value="OFFICIAL">Đề thường (1 phần)</option>
                            <option value="TWO_PART">Đề 2 phần (Yêu cầu chung + Yêu cầu riêng)</option>
                        </select>
                        {examType === 'TWO_PART' && (
                            <p className="text-xs text-blue-600 mt-1">Đề thi gồm 2 phần: Yêu cầu chung (~40%) và Yêu cầu riêng (~60%). Mỗi phần có tỷ lệ đỗ riêng.</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên đợt thi</label>
                        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-black" placeholder="VD: Kiểm tra An toàn lao động Quý 1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian làm bài (phút)</label>
                        <input type="number" required value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số lần vi phạm tối đa (Tự động nộp bài)</label>
                        <input type="number" min="1" required value={maxViolations} onChange={(e) => setMaxViolations(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số lần thi tối đa</label>
                        <input type="number" min="1" required value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                    </div>
                    {examType !== 'TWO_PART' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Điểm đạt (thang 10)</label>
                            <input type="number" min="0" max="10" step="0.1" required value={passScore} onChange={(e) => setPassScore(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                        </div>
                    )}
                    <div className="flex justify-end">
                        <button onClick={handleNext} disabled={!title || !duration}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300">Tiếp tục</button>
                    </div>
                </div>
            )}

            {/* Step 2: Matrix (OFFICIAL) or Part 1 (TWO_PART) */}
            {step === 2 && examType === 'OFFICIAL' && (
                <div className="space-y-6">
                    {renderTopicMatrix(selectedTopicIds, matrix, setSelectedTopicIds, setMatrix)}
                    <div className="flex justify-between">
                        <button onClick={handleBack} className="px-4 py-2 border rounded text-gray-700">Quay lại</button>
                        <button onClick={handleNext} disabled={selectedTopicIds.length === 0}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300">Tiếp tục</button>
                    </div>
                </div>
            )}

            {/* Step 2: Part 1 (TWO_PART) */}
            {step === 2 && examType === 'TWO_PART' && (
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                        <h3 className="font-bold text-blue-800 text-lg">Phần 1: Yêu cầu chung (~40% tổng số câu)</h3>
                    </div>
                    {renderTopicMatrix(selectedPart1Topics, part1Matrix, setSelectedPart1Topics, setPart1Matrix)}
                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tỷ lệ đỗ cho Phần 1 (%)</label>
                        <input type="number" min="0" max="100" value={part1PassPercent} onChange={(e) => setPart1PassPercent(Number(e.target.value))}
                            className="w-32 border border-gray-300 rounded px-3 py-2 text-black" />
                        <p className="text-xs text-gray-500 mt-1">Thí sinh cần đúng ≥ {part1PassPercent}% số câu trong phần này</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded"><p className="text-sm">Số câu Phần 1: <strong>{getPart1Total()}</strong></p></div>
                    <div className="flex justify-between">
                        <button onClick={handleBack} className="px-4 py-2 border rounded text-gray-700">Quay lại</button>
                        <button onClick={handleNext} disabled={getPart1Total() === 0}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300">Tiếp tục</button>
                    </div>
                </div>
            )}

            {/* Step 3: Part 2 (TWO_PART) */}
            {step === 3 && examType === 'TWO_PART' && (
                <div className="space-y-6">
                    <div className="bg-green-50 p-4 rounded border border-green-200">
                        <h3 className="font-bold text-green-800 text-lg">Phần 2: Yêu cầu riêng (~60% tổng số câu)</h3>
                    </div>
                    {renderTopicMatrix(selectedPart2Topics, part2Matrix, setSelectedPart2Topics, setPart2Matrix)}
                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tỷ lệ đỗ cho Phần 2 (%)</label>
                        <input type="number" min="0" max="100" value={part2PassPercent} onChange={(e) => setPart2PassPercent(Number(e.target.value))}
                            className="w-32 border border-gray-300 rounded px-3 py-2 text-black" />
                        <p className="text-xs text-gray-500 mt-1">Thí sinh cần đúng ≥ {part2PassPercent}% số câu trong phần này</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded border">
                        <h3 className="font-bold text-gray-800 mb-2">Tổng kết</h3>
                        <p>Phần 1: <strong>{getPart1Total()} câu</strong> (đỗ ≥ {part1PassPercent}%)</p>
                        <p>Phần 2: <strong>{getPart2Total()} câu</strong> (đỗ ≥ {part2PassPercent}%)</p>
                        <p className="mt-2">Tổng: <strong className="text-lg">{getGrandTotal()}</strong> / 50 câu</p>
                        {getGrandTotal() > 50 && <p className="text-red-600 font-bold">⚠️ Vượt quá 50 câu!</p>}
                    </div>
                    <div className="flex justify-between">
                        <button onClick={handleBack} className="px-4 py-2 border rounded text-gray-700">Quay lại</button>
                        <button onClick={handleNext} disabled={getPart2Total() === 0 || getGrandTotal() > 50}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300">Tiếp tục</button>
                    </div>
                </div>
            )}

            {/* Step 3 (OFFICIAL) or Step 4 (TWO_PART): Users */}
            {((step === 3 && examType === 'OFFICIAL') || (step === 4 && examType === 'TWO_PART')) && (
                <div className="space-y-6">
                    {examType === 'TWO_PART' && (
                        <div className="bg-purple-50 p-4 rounded border border-purple-200 text-sm">
                            <p><strong>Tên:</strong> {title} | <strong>Thời gian:</strong> {duration}p</p>
                            <p><strong>Phần 1:</strong> {getPart1Total()} câu (đỗ ≥ {part1PassPercent}%) | <strong>Phần 2:</strong> {getPart2Total()} câu (đỗ ≥ {part2PassPercent}%)</p>
                            <p><strong>Tổng:</strong> {getGrandTotal()} câu</p>
                        </div>
                    )}
                    {renderUserTable()}
                    <div className="flex justify-between">
                        <button onClick={handleBack} className="px-4 py-2 border rounded text-gray-700">Quay lại</button>
                        <button onClick={handleSubmit} disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400">
                            {loading ? 'Đang tạo...' : 'Hoàn tất & Tạo đề'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
