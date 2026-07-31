'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditPracticePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [name, setName] = useState('');
    const [duration, setDuration] = useState(30);
    const [topics, setTopics] = useState<any[]>([]);
    const [matrix, setMatrix] = useState<{ parentId: string, counts: Record<string, number> }[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Official exam tracking
    const [isForked, setIsForked] = useState(false);
    const [forkedFromId, setForkedFromId] = useState<string | null>(null);
    const [officialMatrix, setOfficialMatrix] = useState<{ parentId: string, counts: Record<string, number> }[]>([]);
    const [officialTitle, setOfficialTitle] = useState('');
    const [deviated, setDeviated] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const topicsRes = await fetch('/api/admin/topics?activeOnly=true');
                let loadedTopics: any[] = [];
                if (topicsRes.ok) {
                    loadedTopics = await topicsRes.json();
                    setTopics(loadedTopics);
                }

                const examRes = await fetch(`/api/practice/${id}`);
                if (examRes.ok) {
                    const exam = await examRes.json();
                    setName(exam.title);
                    setDuration(exam.duration);

                    let forkedPracticeId: string | null = null;
                    let forkedExamId: string | null = null;
                    try {
                        const s = JSON.parse(exam.settings || '{}');
                        if (s.forkedFromPracticeId) forkedPracticeId = s.forkedFromPracticeId;
                        if (s.forkedFromExamId) forkedExamId = s.forkedFromExamId;
                    } catch { }

                    if (forkedPracticeId || forkedExamId) {
                        setIsForked(true);
                        setForkedFromId(forkedPracticeId || forkedExamId);

                        const sourceId = forkedExamId || forkedPracticeId;
                        if (sourceId) {
                            try {
                                const sourceRes = await fetch(`/api/admin/exams/${sourceId}`);
                                if (sourceRes.ok) {
                                    const sourceExam = await sourceRes.json();
                                    setOfficialTitle(sourceExam.title || 'Đề chính thức');
                                    const sourceSettings = JSON.parse(sourceExam.settings || '{}');
                                    const officialRows: { parentId: string, counts: Record<string, number> }[] = [];
                                    const flatOfficial: Record<string, number> = {};

                                    if (sourceExam.type === 'TWO_PART' && sourceSettings.twoPartConfig) {
                                        const p1 = sourceSettings.part1Matrix || {};
                                        const p2 = sourceSettings.part2Matrix || {};
                                        for (const [tid, cnt] of Object.entries({ ...p1, ...p2 })) {
                                            flatOfficial[tid] = (flatOfficial[tid] || 0) + Number(cnt);
                                        }
                                    } else if (sourceSettings.matrix) {
                                        for (const [tid, cnt] of Object.entries(sourceSettings.matrix)) {
                                            flatOfficial[tid] = Number(cnt);
                                        }
                                    }

                                    // Group by parent using loadedTopics
                                    const grouped: Record<string, Record<string, number>> = {};
                                    for (const [tid, cnt] of Object.entries(flatOfficial)) {
                                        const t = loadedTopics.find((x: any) => x.id === tid);
                                        const pId = t?.parentId || tid;
                                        if (!grouped[pId]) grouped[pId] = {};
                                        grouped[pId][tid] = cnt;
                                    }
                                    for (const [pId, counts] of Object.entries(grouped)) {
                                        officialRows.push({ parentId: pId, counts });
                                    }
                                    setOfficialMatrix(officialRows);
                                }
                            } catch { }
                        }
                    }
                } else {
                    alert('Không tìm thấy đề thi');
                    router.push('/practice');
                }
            } catch (error) {
                console.error('Error fetching data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, router]);

    // Load current matrix from practice exam
    useEffect(() => {
        const loadSettings = async () => {
            if (topics.length === 0) return;
            try {
                const examRes = await fetch(`/api/practice/${id}`);
                if (examRes.ok) {
                    const exam = await examRes.json();
                    let matrixData: any[] = [];
                    if (exam.settings) {
                        const settings = JSON.parse(exam.settings);
                        matrixData = Array.isArray(settings) ? settings : (settings.matrix || []);
                    }

                    // Fallback: build matrix from question_ids if settings is empty
                    if (matrixData.length === 0 && exam.question_ids) {
                        try {
                            const qids = JSON.parse(exam.question_ids);
                            const topicCounts: Record<string, number> = {};
                            for (const qid of qids) {
                                const topic = topics.find((t: any) => t.questions?.some((q: any) => q.id === qid));
                                // Simple approach: we can't easily get topic from question_id without extra API call
                                // Just skip fallback and show empty matrix
                            }
                        } catch { }
                    }

                    const groupedMatrix: Record<string, Record<string, number>> = {};
                    if (Array.isArray(matrixData)) {
                        matrixData.forEach((item: any) => {
                            const tid = item.topicIds?.[0];
                            const count = item.count;
                            if (!tid) return;
                            const topic = topics.find((t: any) => t.id === tid);
                            if (topic) {
                                const pId = topic.parentId || topic.id;
                                if (!groupedMatrix[pId]) groupedMatrix[pId] = {};
                                groupedMatrix[pId][tid] = count;
                            }
                        });
                    }
                    const newMatrix = Object.entries(groupedMatrix).map(([pId, counts]) => ({ parentId: pId, counts }));
                    if (newMatrix.length > 0) {
                        setMatrix(newMatrix);
                    }

                    // Check deviation from official
                    if (officialMatrix.length > 0 && newMatrix.length > 0) {
                        checkDeviation(newMatrix);
                    }
                }
            } catch { }
        };
        if (!loading && topics.length > 0) loadSettings();
    }, [loading, topics, id, officialMatrix]);

    const checkDeviation = (current: { parentId: string, counts: Record<string, number> }[]) => {
        let diff = false;
        const flatCurr: Record<string, number> = {};
        const flatOff: Record<string, number> = {};
        current.forEach(r => Object.entries(r.counts).forEach(([k, v]) => { flatCurr[k] = v; }));
        officialMatrix.forEach(r => Object.entries(r.counts).forEach(([k, v]) => { flatOff[k] = v; }));

        for (const k of Object.keys(flatOff)) {
            if ((flatCurr[k] || 0) !== flatOff[k]) { diff = true; break; }
        }
        for (const k of Object.keys(flatCurr)) {
            if (!(k in flatOff)) { diff = true; break; }
        }
        setDeviated(diff);
    };

    const handleCountChange = (index: number, topicId: string, count: number) => {
        const newMatrix = [...matrix];
        newMatrix[index].counts = { ...newMatrix[index].counts, [topicId]: count };
        setMatrix(newMatrix);
        checkDeviation(newMatrix);
    };

    const handleResetToOfficial = () => {
        if (officialMatrix.length === 0) return;
        setMatrix(JSON.parse(JSON.stringify(officialMatrix)));
        setDeviated(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const apiMatrix: any[] = [];
        matrix.forEach(row => {
            Object.entries(row.counts).forEach(([topicId, count]) => {
                if (count > 0) apiMatrix.push({ topicIds: [topicId], count });
            });
        });
        if (apiMatrix.length === 0) {
            alert('Vui lòng chọn ít nhất một chủ đề và số lượng câu hỏi > 0');
            setSubmitting(false);
            return;
        }
        try {
            const res = await fetch(`/api/practice/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, duration, matrix: apiMatrix }),
            });
            if (res.ok) {
                alert('Cập nhật đề ôn tập thành công!');
                router.push('/practice');
            } else {
                const data = await res.json();
                alert(data.error || 'Lỗi khi cập nhật');
            }
        } catch { alert('Lỗi hệ thống'); }
        finally { setSubmitting(false); }
    };

    const rootTopics = topics.filter((t: any) => !t.parentId);
    const getChildren = (id: string) => topics.filter((t: any) => t.parentId === id);

    if (loading) return <div className="p-8">Đang tải...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow">
                <h1 className="text-2xl font-bold mb-6 text-blue-800">
                    {isForked ? 'Sửa đề ôn tập (Bản sao)' : 'Sửa đề ôn tập'}
                </h1>

                {isForked && (
                    <div className={`mb-6 p-4 rounded-lg border-2 ${deviated ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-400'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {deviated ? (
                                <span className="text-yellow-700 font-bold">⚠ Đã thay đổi so với đề chính thức "{officialTitle}"</span>
                            ) : (
                                <span className="text-green-700 font-bold">✅ Cấu trúc giống với đề chính thức "{officialTitle}"</span>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                            Bạn đang chỉnh sửa bản sao cá nhân. Chỉ có thể thay đổi số lượng câu hỏi, không thể thêm/xóa chủ đề.
                        </p>
                        {deviated && (
                            <button
                                type="button"
                                onClick={handleResetToOfficial}
                                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 font-bold text-sm"
                            >
                                🔄 Đặt lại giống đề chính thức
                            </button>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên đề ôn tập</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút)</label>
                        <input type="number" required min="1" max="999" value={duration}
                            onChange={(e) => { const v = parseInt(e.target.value) || 1; setDuration(v > 999 ? 999 : v < 1 ? 1 : v); }}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-black" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cấu trúc đề thi</label>

                        {isForked && officialMatrix.length > 0 && (
                            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200 text-sm">
                                <p className="font-bold text-blue-800 mb-2">📋 Cơ cấu đề chính thức:</p>
                                {officialMatrix.map((row, i) => {
                                    const parent = topics.find((t: any) => t.id === row.parentId);
                                    return (
                                        <div key={i} className="ml-2 mb-1">
                                            <span className="font-medium text-blue-700">{parent?.name || row.parentId}:</span>
                                            {Object.entries(row.counts).map(([tid, cnt]) => {
                                                const t = topics.find((x: any) => x.id === tid);
                                                return <span key={tid} className="ml-2 text-gray-600">{t?.name || tid}: <b>{cnt}</b> câu</span>;
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="space-y-4">
                            {matrix.map((row, index) => {
                                const allChildren = getChildren(row.parentId);
                                const offRow = officialMatrix.find(r => r.parentId === row.parentId);
                                // Only show topics from the official exam structure
                                const officialChildren = allChildren.filter((c: any) => offRow?.counts?.[c.id] != null);
                                const children = officialChildren.length > 0 ? officialChildren : allChildren;
                                return (
                                    <div key={index} className="border p-4 rounded bg-gray-50">
                                        <div className="mb-3">
                                            <label className="block text-xs text-gray-500 mb-1">Chủ đề chính</label>
                                            <select
                                                required
                                                value={row.parentId}
                                                onChange={(e) => {
                                                    const newMatrix = [...matrix];
                                                    newMatrix[index] = { parentId: e.target.value, counts: {} };
                                                    setMatrix(newMatrix);
                                                }}
                                                className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                                                disabled={isForked && officialMatrix.length > 0} // Lock for forked
                                            >
                                                <option value="">-- Chọn chủ đề --</option>
                                                {rootTopics.map((root: any) => (
                                                    <option key={root.id} value={root.id}>{root.name}</option>
                                                ))}
                                            </select>
                                            {isForked && officialMatrix.length > 0 && (
                                                <p className="text-xs text-orange-500 mt-1">🔒 Không thể thêm/xóa chủ đề</p>
                                            )}
                                        </div>

                                        {row.parentId && (
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-2">Số câu hỏi:</label>
                                                {children.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {children.map((child: any) => {
                                                            const officialCount = offRow?.counts?.[child.id] ?? null;
                                                            const isInOfficial = officialCount !== null;
                                                            const dimNonOfficial = isForked && officialMatrix.length > 0;
                                                            return (
                                                                <div key={child.id} className={`flex items-center justify-between p-2 rounded border ${dimNonOfficial && !isInOfficial ? 'bg-gray-50 border-gray-200 opacity-50' : 'bg-white border-blue-300'}`}>
                                                                    <label className="text-sm text-gray-700 flex-1 mr-2">
                                                                        {child.name} <span className="text-xs text-gray-500">(Max: {child._count?.questions || 0})</span>
                                                                        {officialCount !== null && (
                                                                            <span className="text-xs text-blue-600 ml-1">| Gốc: {officialCount}</span>
                                                                        )}
                                                                    </label>
                                                                    <input type="number" min="0" max={child._count?.questions || 0} placeholder="0"
                                                                        value={row.counts[child.id] || ''}
                                                                        onChange={(e) => { const v = parseInt(e.target.value) || 0; const max = child._count?.questions || 0; handleCountChange(index, child.id, v > max ? max : v); }}
                                                                        className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-black" />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-white p-2 rounded border">
                                                        <label className="text-sm text-gray-700 flex-1 mr-2">
                                                            Câu hỏi từ chủ đề chính <span className="text-xs text-gray-500">(Max: {topics.find((t: any) => t.id === row.parentId)?._count?.questions || 0})</span>
                                                        </label>
                                                        <input type="number" min="0" max={topics.find((t: any) => t.id === row.parentId)?._count?.questions || 0} placeholder="0"
                                                            value={row.counts[row.parentId] || ''}
                                                            onChange={(e) => { const v = parseInt(e.target.value) || 0; const max = topics.find((t: any) => t.id === row.parentId)?._count?.questions || 0; handleCountChange(index, row.parentId, v > max ? max : v); }}
                                                            className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-black" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {!isForked && (
                            <button type="button" onClick={() => setMatrix([...matrix, { parentId: '', counts: {} }])}
                                className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                                + Thêm chủ đề
                            </button>
                        )}
                    </div>

                    <div className="flex justify-end space-x-4 pt-4 border-t">
                        <button type="button" onClick={() => router.back()}
                            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">Hủy</button>
                        <button type="submit" disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300">
                            {submitting ? 'Đang cập nhật...' : 'Cập nhật'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
