'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreatePracticePage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [duration, setDuration] = useState(30);
    const [topics, setTopics] = useState<any[]>([]);
    const [matrix, setMatrix] = useState<{ parentId: string, counts: Record<string, number> }[]>([{ parentId: '', counts: {} }]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const res = await fetch('/api/practice/topics');
                if (!res.ok) throw new Error('Không thể tải chủ đề ôn tập. Vui lòng tải lại trang hoặc đăng nhập lại.');
                setTopics(await res.json());
            } catch (error) {
                console.error('Error fetching topics', error);
                setLoadError(error instanceof Error ? error.message : 'Không thể tải chủ đề ôn tập. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };
        fetchTopics();
    }, []);

    const handleAddRow = () => {
        setMatrix([...matrix, { parentId: '', counts: {} }]);
    };

    const handleRemoveRow = (index: number) => {
        const newMatrix = [...matrix];
        newMatrix.splice(index, 1);
        setMatrix(newMatrix);
    };

    const handleParentChange = (index: number, parentId: string) => {
        const newMatrix = [...matrix];
        newMatrix[index] = { ...newMatrix[index], parentId, counts: {} };
        setMatrix(newMatrix);
    };

    const handleCountChange = (index: number, topicId: string, count: number) => {
        const newMatrix = [...matrix];
        newMatrix[index].counts = { ...newMatrix[index].counts, [topicId]: count };
        setMatrix(newMatrix);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Transform matrix for API
        // Flatten the grouped UI matrix into API format: [{ topicIds: [id], count: number }]
        const apiMatrix: any[] = [];

        matrix.forEach(row => {
            Object.entries(row.counts).forEach(([topicId, count]) => {
                if (count > 0) {
                    apiMatrix.push({
                        topicIds: [topicId],
                        count: count
                    });
                }
            });
        });

        if (apiMatrix.length === 0) {
            alert('Vui lòng chọn ít nhất một chủ đề và số lượng câu hỏi > 0');
            setSubmitting(false);
            return;
        }

        try {
            const res = await fetch('/api/practice/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    duration,
                    matrix: apiMatrix
                }),
            });

            const data = await res.json();

            if (res.ok) {
                alert('Tạo đề ôn tập thành công!');
                router.push('/practice');
            } else {
                alert(data.error || 'Lỗi khi tạo đề');
            }
        } catch (error) {
            console.error('Error creating practice', error);
            alert('Lỗi hệ thống');
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to organize topics
    const rootTopics = topics.filter(t => !t.parentId);
    const getChildren = (id: string) => topics.filter(t => t.parentId === id);

    if (loading) return <div className="p-8">Đang tải...</div>;
    if (loadError) return <div role="alert" className="p-8 text-red-700">{loadError}</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow">
                <h1 className="text-2xl font-bold mb-6 text-blue-800">Tạo đề ôn tập mới</h1>
                {topics.length === 0 && <p role="status" className="mb-4 text-gray-700">Chưa có chủ đề ôn tập nào được mở. Vui lòng liên hệ quản trị viên.</p>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên đề ôn tập</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ví dụ: Ôn tập chương 1"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Thời gian làm bài (phút) <span className="text-xs text-gray-400">(tối đa 999 phút)</span>
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            max="999"
                            value={duration}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setDuration(val > 999 ? 999 : val < 1 ? 1 : val);
                            }}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cấu trúc đề thi (Ma trận)</label>
                        <div className="space-y-4">
                            {matrix.map((row, index) => {
                                const children = getChildren(row.parentId);
                                return (
                                    <div key={index} className="border p-4 rounded bg-gray-50 relative">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRow(index)}
                                            className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-sm"
                                            disabled={matrix.length === 1}
                                        >
                                            Xóa
                                        </button>

                                        <div className="mb-3">
                                            <label className="block text-xs text-gray-500 mb-1">Chủ đề chính</label>
                                            <select
                                                required
                                                value={row.parentId}
                                                onChange={(e) => handleParentChange(index, e.target.value)}
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
                                                <label className="block text-xs text-gray-500 mb-2">Số lượng câu hỏi theo chủ đề con:</label>
                                                {children.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {children.map(child => (
                                                            <div key={child.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                                                <label className="text-sm text-gray-700 flex-1 mr-2">
                                                                    {child.name} <span className="text-xs text-gray-500">(Max: {child._count?.questions || 0})</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={child._count?.questions || 0}
                                                                    placeholder="0"
                                                                    value={row.counts[child.id] || ''}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        const max = child._count?.questions || 0;
                                                                        handleCountChange(index, child.id, val > max ? max : val);
                                                                    }}
                                                                    className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-black"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-white p-2 rounded border">
                                                        <label className="text-sm text-gray-700 flex-1 mr-2">
                                                            Câu hỏi từ chủ đề chính <span className="text-xs text-gray-500">(Max: {topics.find(t => t.id === row.parentId)?._count?.questions || 0})</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={topics.find(t => t.id === row.parentId)?._count?.questions || 0}
                                                            placeholder="0"
                                                            value={row.counts[row.parentId] || ''}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                const max = topics.find(t => t.id === row.parentId)?._count?.questions || 0;
                                                                handleCountChange(index, row.parentId, val > max ? max : val);
                                                            }}
                                                            className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-black"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            + Thêm chủ đề
                        </button>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                        >
                            {submitting ? 'Đang tạo...' : 'Tạo đề thi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
