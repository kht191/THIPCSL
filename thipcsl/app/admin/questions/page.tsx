'use client';

import { useState, useEffect, Fragment, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Pagination from '@/components/Pagination';

export default function QuestionManagement() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [topics, setTopics] = useState<any[]>([]);
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<any>(null);
    const [importing, setImporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    const [isInitialized, setIsInitialized] = useState(false);
    const filterInitRef = useRef(true);

    // Đọc filter từ URL khi mount
    useEffect(() => {
        const topicParam = searchParams.get('topicId') || '';
        const searchParam = searchParams.get('search') || '';
        const pageParam = searchParams.get('page') || '1';
        const limitParam = searchParams.get('limit') || '10';

        setSelectedTopic(topicParam);
        setSearchTerm(searchParam);
        setPage(parseInt(pageParam) || 1);
        setLimit(parseInt(limitParam) || 10);
        setIsInitialized(true);
    }, []);

    // Đồng bộ page/filter lên URL
    useEffect(() => {
        if (!isInitialized) return;
        const params = new URLSearchParams();
        if (selectedTopic) params.set('topicId', selectedTopic);
        if (searchTerm) params.set('search', searchTerm);
        params.set('page', page.toString());
        params.set('limit', limit.toString());
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [page, selectedTopic, searchTerm, limit, isInitialized]);

    useEffect(() => {
        fetchTopics();
    }, []);

    // Fetch questions when page changes (skip if not initialized yet)
    useEffect(() => {
        if (!isInitialized) return;
        fetchQuestions(page);
    }, [page, isInitialized]);

    // Fetch questions when filter changes (with debounce + reset to page 1)
    useEffect(() => {
        if (filterInitRef.current) {
            filterInitRef.current = false;
            return;
        }
        const timer = setTimeout(() => {
            setPage(1);
            fetchQuestions(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [selectedTopic, searchTerm, limit]);

    const fetchTopics = async () => {
        const res = await fetch('/api/admin/topics');
        if (res.ok) {
            setTopics(await res.json());
        }
    };

    const fetchQuestions = async (currentPage = 1) => {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedTopic) params.append('topicId', selectedTopic);
        if (searchTerm) params.append('search', searchTerm);
        params.append('page', currentPage.toString());
        params.append('limit', limit.toString());

        const res = await fetch(`/api/admin/questions?${params.toString()}`);
        if (res.ok) {
            const data = await res.json();
            setQuestions(data.data);
            setTotalPages(data.metadata.totalPages);
            setSelectedIds([]); // Reset selection on filter change
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;

        const res = await fetch(`/api/admin/questions/${id}`, {
            method: 'DELETE',
        });

        if (res.ok) {
            fetchQuestions();
        } else {
            alert('Lỗi khi xóa');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.length} câu hỏi đã chọn?`)) return;

        const res = await fetch('/api/admin/questions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds }),
        });

        if (res.ok) {
            alert('Xóa thành công');
            fetchQuestions();
        } else {
            alert('Lỗi khi xóa');
        }
    };

    const handleDeleteAllInTopic = async () => {
        if (!selectedTopic) return;
        if (!confirm('CẢNH BÁO: Bạn có chắc muốn xóa TOÀN BỘ câu hỏi trong chủ đề này? Hành động này không thể hoàn tác!')) return;

        const res = await fetch('/api/admin/questions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicId: selectedTopic }),
        });

        if (res.ok) {
            alert('Đã xóa toàn bộ câu hỏi trong chủ đề');
            fetchQuestions();
        } else {
            alert('Lỗi khi xóa');
        }
    };

    const runImportValidation = async () => {
        if (!file) return null;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('validateOnly', 'true');

        const res = await fetch('/api/admin/questions/import', {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        setImportPreview(data);
        return data;
    };

    const handleImport = async () => {
        if (!file) return;
        setImporting(true);

        const preview = importPreview || await runImportValidation();
        if (!preview?.canImport) {
            alert('Dữ liệu chưa đạt yêu cầu. Vui lòng rà soát lỗi trước khi nhập.');
            setImporting(false);
            return;
        }

        if (!confirm('Rà soát đã đạt. Bạn có muốn đẩy dữ liệu vào hệ thống không?')) {
            setImporting(false);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/questions/import', {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        if (res.ok) {
            let msg = `Import thành công ${data.count} câu hỏi.`;
            if (data.issues && data.issues.length > 0) {
                msg += `\n\nCó ${data.issues.length} mục cần chú ý:\n` + data.issues.map((i: any) => `Dòng ${i.row}: ${i.message}`).join('\n');
            }
            alert(msg);
            setImportPreview(null);
            fetchQuestions();
        } else {
            alert(data.error || 'Lỗi import');
        }

        setImporting(false);
    };

    const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(questions.map(q => q.id));
        } else {
            setSelectedIds([]);
        }
    };

    const toggleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // ─── Inline Editing ───
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editOptions, setEditOptions] = useState<Record<string, string>>({});
    const [editCorrectAnswer, setEditCorrectAnswer] = useState<string[]>([]);
    const [editTopicId, setEditTopicId] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    const startEdit = (q: any) => {
        setEditingId(q.id);
        setEditContent(q.content);
        setEditTopicId(q.topicId || '');
        try {
            const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
            setEditOptions(opts || {});
        } catch { setEditOptions({}); }
        try {
            const correct = typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer;
            setEditCorrectAnswer(Array.isArray(correct) ? correct : [correct]);
        } catch { setEditCorrectAnswer([]); }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditContent('');
        setEditOptions({});
        setEditCorrectAnswer([]);
        setEditTopicId('');
    };

    const addEditOption = () => {
        const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const existing = Object.keys(editOptions);
        const next = labels.split('').find(l => !existing.includes(l)) || `X${existing.length}`;
        setEditOptions({ ...editOptions, [next]: '' });
    };

    const removeEditOption = (key: string) => {
        if (Object.keys(editOptions).length <= 2) {
            alert('Cần tối thiểu 2 đáp án');
            return;
        }
        const next = { ...editOptions };
        delete next[key];
        setEditOptions(next);
        setEditCorrectAnswer(editCorrectAnswer.filter(a => a !== key));
    };

    const saveEdit = async (id: string) => {
        setSavingEdit(true);
        // Clean empty options
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(editOptions)) {
            if (v.trim()) cleaned[k] = v.trim();
        }
        const cleanCorrect = editCorrectAnswer.filter(a => cleaned[a] !== undefined);

        if (!editContent.trim() || Object.keys(cleaned).length < 2 || cleanCorrect.length === 0) {
            alert('Thiếu thông tin: cần nội dung, ít nhất 2 đáp án và 1 đáp án đúng');
            setSavingEdit(false);
            return;
        }

        const selectedTopic = topics.find(t => t.id === editTopicId);
        const res = await fetch(`/api/admin/questions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: editContent.trim(),
                category: selectedTopic?.name || '',
                topicId: editTopicId || null,
                correct_answer: JSON.stringify(cleanCorrect),
                options: cleaned,
            }),
        });

        if (res.ok) {
            cancelEdit();
            fetchQuestions(page);
        } else {
            const data = await res.json();
            alert(data.error || 'Lỗi khi cập nhật');
        }
        setSavingEdit(false);
    };

    const optionLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Helper to organize topics
    const rootTopics = topics.filter(t => !t.parentId);
    const getChildren = (id: string) => topics.filter(t => t.parentId === id);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-black">Ngân hàng câu hỏi</h1>
                <Link
                    href="/admin/questions/create"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    + Thêm câu hỏi
                </Link>
            </div>

            <div className="mb-6 bg-white p-4 rounded shadow space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-black whitespace-nowrap">Lọc theo chủ đề:</span>
                        <select
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2 text-black"
                        >
                            <option value="">-- Tất cả chủ đề --</option>
                            {rootTopics.map(root => (
                                <Fragment key={root.id}>
                                    <option value={root.id} className="font-bold">
                                        {root.name}
                                    </option>
                                    {getChildren(root.id).map(child => (
                                        <option key={child.id} value={child.id}>
                                            &nbsp;&nbsp;&nbsp;&nbsp;{child.name}
                                        </option>
                                    ))}
                                </Fragment>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="font-medium text-black whitespace-nowrap">Tìm kiếm:</span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm nội dung hoặc đáp án..."
                            className="border border-gray-300 rounded px-3 py-2 text-black w-40 sm:w-48 lg:w-72"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="font-medium text-black whitespace-nowrap">Hiển thị:</span>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="border border-gray-300 rounded px-3 py-2 text-black"
                        >
                            <option value={10}>10 dòng</option>
                            <option value={25}>25 dòng</option>
                            <option value={50}>50 dòng</option>
                            <option value={100}>100 dòng</option>
                            <option value={10000}>Tất cả</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="text-black text-sm"
                    />
                    <button
                        onClick={runImportValidation}
                        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
                        disabled={!file || importing}
                    >
                        Rà soát
                    </button>
                    <button
                        onClick={handleImport}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                        disabled={!file || importing}
                    >
                        Import Excel
                    </button>
                    <a
                        href="/api/admin/samples/questions"
                        className="ml-2 text-blue-600 hover:underline text-sm whitespace-nowrap"
                    >
                        Tải file mẫu
                    </a>
                </div>

                {importPreview && (
                    <div className={`p-4 rounded border ${importPreview.canImport ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                        <div className="font-semibold text-black mb-2">Kết quả rà soát</div>
                        <div className="text-sm text-black space-y-1 mb-3">
                            <div>Tổng dòng: {importPreview.totalRows || 0}</div>
                            <div>Hợp lệ: {importPreview.validRows || 0}</div>
                            <div>Lỗi: {importPreview.errorCount || 0}</div>
                        </div>
                        {Array.isArray(importPreview.issues) && importPreview.issues.length > 0 && (
                            <div className="max-h-56 overflow-auto bg-white border rounded p-3">
                                {importPreview.issues.map((issue: any, index: number) => (
                                    <div key={index} className={`text-sm mb-1 ${issue.type === 'error' ? 'text-red-700' : 'text-yellow-700'}`}>
                                        Dòng {issue.row}: {issue.message}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Bulk Actions */}
                <div className="flex items-center space-x-4 pt-4 border-t">
                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedIds.length === 0}
                        className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Xóa {selectedIds.length} câu đã chọn
                    </button>
                    {selectedTopic && (
                        <button
                            onClick={handleDeleteAllInTopic}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                        >
                            Xóa TẤT CẢ trong chủ đề này
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={questions.length > 0 && selectedIds.length === questions.length}
                                    onChange={toggleSelectAll}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chủ đề</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đáp án</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {questions.map((q) => (
                            editingId === q.id ? (
                                // ─── INLINE EDIT ROW ───
                                <tr key={q.id} className="bg-yellow-50">
                                    <td className="px-4 py-2" colSpan={5}>
                                        <div className="space-y-3 p-2">
                                            {/* Content */}
                                            <div>
                                                <label className="text-xs font-medium text-gray-600">Nội dung câu hỏi</label>
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="w-full border border-gray-300 rounded px-3 py-2 text-black text-sm h-20"
                                                />
                                            </div>
                                            {/* Topic */}
                                            <div>
                                                <label className="text-xs font-medium text-gray-600">Chủ đề</label>
                                                <select value={editTopicId} onChange={(e) => setEditTopicId(e.target.value)}
                                                    className="border border-gray-300 rounded px-3 py-2 text-black text-sm w-full max-w-md">
                                                    <option value="">-- Chọn chủ đề --</option>
                                                    {rootTopics.map(root => (
                                                        <Fragment key={root.id}>
                                                            <option value={root.id} disabled={getChildren(root.id).length > 0}>
                                                                {root.name} {getChildren(root.id).length > 0 ? '(có con)' : ''}
                                                            </option>
                                                            {getChildren(root.id).map(child => (
                                                                <option key={child.id} value={child.id}>&nbsp;&nbsp;{child.name}</option>
                                                            ))}
                                                        </Fragment>
                                                    ))}
                                                </select>
                                            </div>
                                            {/* Options */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-xs font-medium text-gray-600">Đáp án</label>
                                                    <button type="button" onClick={addEditOption}
                                                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                                                        + Thêm
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {Object.entries(editOptions).map(([key, val]) => (
                                                        <div key={key} className="flex items-center gap-2">
                                                            <label className="flex items-center gap-1 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editCorrectAnswer.includes(key)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setEditCorrectAnswer([...editCorrectAnswer, key]);
                                                                        else setEditCorrectAnswer(editCorrectAnswer.filter(a => a !== key));
                                                                    }}
                                                                    className="h-3 w-3 text-green-600"
                                                                />
                                                                <span className="text-xs font-bold text-green-700 w-5">{key}.</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={val}
                                                                onChange={(e) => setEditOptions({ ...editOptions, [key]: e.target.value })}
                                                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-black text-sm"
                                                            />
                                                            <button type="button" onClick={() => removeEditOption(key)}
                                                                className="text-red-500 hover:text-red-700 text-xs">✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">✓ = đáp án đúng. Ít nhất 2 đáp án, 1 đáp án đúng.</p>
                                            </div>
                                            {/* Actions */}
                                            <div className="flex gap-2 pt-2 border-t">
                                                <button onClick={() => saveEdit(q.id)} disabled={savingEdit}
                                                    className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400">
                                                    {savingEdit ? 'Đang lưu...' : 'Lưu'}
                                                </button>
                                                <button onClick={cancelEdit}
                                                    className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                // ─── NORMAL ROW ───
                                <tr key={q.id} className={selectedIds.includes(q.id) ? 'bg-blue-50' : ''}>
                                    <td className="px-4 py-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(q.id)}
                                            onChange={() => toggleSelectOne(q.id)}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-black text-sm">
                                        <div className="line-clamp-2">{q.content}</div>
                                    </td>
                                    <td className="px-4 py-2 text-black text-sm">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {q.topic?.name || q.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-black text-sm">
                                        {(() => {
                                            try {
                                                const opts = JSON.parse(q.options);
                                                const correct = (() => {
                                                    try { const p = JSON.parse(q.correct_answer); return Array.isArray(p) ? p : [p]; }
                                                    catch { return [q.correct_answer]; }
                                                })();
                                                return (
                                                    <div className="space-y-0.5 max-w-xs">
                                                        {Object.entries(opts).slice(0, 4).map(([key, val]: [string, any]) => {
                                                            const isCorrect = correct.includes(key);
                                                            return (
                                                                <div key={key} className={`text-xs ${isCorrect ? 'text-green-700 font-bold' : 'text-gray-500'}`}>
                                                                    {key}. {String(val).substring(0, 50)}{String(val).length > 50 ? '...' : ''}
                                                                    {isCorrect && ' ✓'}
                                                                </div>
                                                            );
                                                        })}
                                                        {Object.keys(opts).length > 4 && (
                                                            <div className="text-xs text-gray-400">+{Object.keys(opts).length - 4} đáp án nữa</div>
                                                        )}
                                                    </div>
                                                );
                                            } catch {
                                                return <span className="text-gray-400">-</span>;
                                            }
                                        })()}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm font-medium whitespace-nowrap">
                                        <button onClick={() => startEdit(q)}
                                            className="text-blue-600 hover:text-blue-900 mr-2">
                                            Sửa
                                        </button>
                                        <Link
                                            href={`/admin/questions/${q.id}?topicId=${selectedTopic}&search=${encodeURIComponent(searchTerm)}&page=${page}&limit=${limit}`}
                                            className="text-gray-500 hover:text-gray-700 mr-2 text-xs"
                                            title="Mở trang sửa đầy đủ">
                                            Mở
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(q.id)}
                                            className="text-red-600 hover:text-red-900">
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            )
                        ))}
                    </tbody>
                </table>
                {questions.length === 0 && !loading && (
                    <div className="p-8 text-center text-gray-500">Không tìm thấy câu hỏi nào.</div>
                )}
            </div>
            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
            />
        </div>
    );
}
