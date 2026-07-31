'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

interface ImportPreview {
    success: boolean;
    canImport: boolean;
    totalRows: number;
    validRows: number;
    errorCount: number;
    warningCount: number;
    issues: { row: number; type: 'error' | 'warning'; message: string }[];
}

export default function ExamList() {
    const [exams, setExams] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    // Import OFFICIAL state
    const [showOfficial, setShowOfficial] = useState(false);
    const [officialFile, setOfficialFile] = useState<File | null>(null);
    const [officialPreview, setOfficialPreview] = useState<ImportPreview | null>(null);
    const [officialLoading, setOfficialLoading] = useState(false);
    const officialFileRef = useRef<HTMLInputElement>(null);

    // Import TWO_PART state
    const [showTwoPart, setShowTwoPart] = useState(false);
    const [twoPartFile, setTwoPartFile] = useState<File | null>(null);
    const [twoPartPreview, setTwoPartPreview] = useState<ImportPreview | null>(null);
    const [twoPartLoading, setTwoPartLoading] = useState(false);
    const twoPartFileRef = useRef<HTMLInputElement>(null);

    // Import Users state
    const [showUserImport, setShowUserImport] = useState(false);
    const [userFile, setUserFile] = useState<File | null>(null);
    const [userPreview, setUserPreview] = useState<ImportPreview | null>(null);
    const [userLoading, setUserLoading] = useState(false);
    const userFileRef = useRef<HTMLInputElement>(null);

    // Publish status for exams
    const [publishStatus, setPublishStatus] = useState<Record<string, boolean>>({});
    const [publishLoading, setPublishLoading] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchExams(page);
    }, [page, limit]);

    const fetchExams = async (currentPage = 1) => {
        const res = await fetch(`/api/admin/exams?page=${currentPage}&limit=${limit}`);
        if (res.ok) {
            const data = await res.json();
            setExams(data.data);
            setTotalPages(data.metadata.totalPages);

            // Fetch publish status for all exams
            const statusMap: Record<string, boolean> = {};
            for (const exam of data.data) {
                try {
                    const pubRes = await fetch(`/api/admin/exams/${exam.id}/publish-practice`);
                    if (pubRes.ok) {
                        const pubData = await pubRes.json();
                        statusMap[exam.id] = pubData.published;
                    }
                } catch { }
            }
            setPublishStatus(statusMap);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa đề thi này?')) {
            const res = await fetch(`/api/admin/exams/${id}`, { method: 'DELETE' });
            if (res.ok) fetchExams(page);
            else alert('Lỗi khi xóa đề thi');
        }
    };

    // === Shared import handler ===
    const handleImport = async (
        file: File,
        preview: ImportPreview | null,
        setPreview: (p: ImportPreview | null) => void,
        setFile: (f: File | null) => void,
        setLoading: (l: boolean) => void,
        fileRef: React.RefObject<HTMLInputElement | null>,
    ) => {
        if (!file || !preview?.canImport) return;
        if (!confirm(`Xác nhận import ${preview.validRows} đề thi?`)) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('validateOnly', 'false');

        try {
            const res = await fetch('/api/admin/exams/import', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                alert(`Đã import thành công ${data.count} đề thi!`);
                setFile(null);
                setPreview(null);
                if (fileRef.current) fileRef.current.value = '';
                fetchExams(page);
            } else {
                alert(data.error || 'Lỗi khi import');
                setPreview(data);
            }
        } catch { alert('Lỗi kết nối khi import'); }
        finally { setLoading(false); }
    };

    const handleValidate = async (
        file: File | null,
        setPreview: (p: ImportPreview | null) => void,
        setLoading: (l: boolean) => void,
    ) => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('validateOnly', 'true');
        try {
            const res = await fetch('/api/admin/exams/import', { method: 'POST', body: formData });
            setPreview(await res.json());
        } catch { alert('Lỗi kết nối khi rà soát'); }
        finally { setLoading(false); }
    };

    // === Import Users ===
    const handleUserValidate = async () => {
        if (!userFile) return;
        setUserLoading(true);
        const formData = new FormData();
        formData.append('file', userFile);
        formData.append('validateOnly', 'true');
        try {
            const res = await fetch('/api/admin/exams/import-users', { method: 'POST', body: formData });
            setUserPreview(await res.json());
        } catch { alert('Lỗi kết nối khi rà soát'); }
        finally { setUserLoading(false); }
    };

    const handleUserImport = async () => {
        if (!userFile || !userPreview?.canImport) return;
        if (!confirm(`Xác nhận import ${userPreview.validRows} người thi?`)) return;
        setUserLoading(true);
        const formData = new FormData();
        formData.append('file', userFile);
        formData.append('validateOnly', 'false');
        try {
            const res = await fetch('/api/admin/exams/import-users', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                alert(`Đã import thành công ${data.count} người thi!`);
                setUserFile(null);
                setUserPreview(null);
                if (userFileRef.current) userFileRef.current.value = '';
            } else {
                alert(data.error || 'Lỗi khi import');
                setUserPreview(data);
            }
        } catch { alert('Lỗi kết nối khi import'); }
        finally { setUserLoading(false); }
    };

    // === Render import panel ===
    const renderImportPanel = (
        title: string,
        borderColor: string,
        headerColor: string,
        btnColor: string,
        file: File | null,
        preview: ImportPreview | null,
        loading: boolean,
        fileRef: React.RefObject<HTMLInputElement | null>,
        sampleUrl: string,
        setFile: (f: File | null) => void,
        setPreview: (p: ImportPreview | null) => void,
        setLoading: (l: boolean) => void,
    ) => (
        <div className={`mb-6 bg-white p-4 rounded-lg shadow border ${borderColor}`}>
            <h2 className={`text-lg font-bold ${headerColor} mb-3`}>{title}</h2>
            <div className="flex items-center gap-3 mb-3">
                <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(null); } }}
                    className="border p-2 rounded text-black flex-1"
                />
                <a href={sampleUrl} className="text-blue-600 hover:underline text-sm whitespace-nowrap">📥 Tải file mẫu</a>
            </div>
            <div className="flex gap-2 mb-3">
                <button
                    onClick={() => handleValidate(file, setPreview, setLoading)}
                    disabled={!file || loading}
                    className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50 font-bold"
                >
                    {loading && !preview ? 'Đang rà soát...' : '🔍 Rà soát'}
                </button>
                {preview ? (
                    <button
                        onClick={() => handleImport(file!, preview, setPreview, setFile, setLoading, fileRef)}
                        disabled={!preview.canImport || loading}
                        className={`${btnColor} text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 font-bold`}
                    >
                        {loading ? 'Đang import...' : '✅ Import'}
                    </button>
                ) : (
                    <span className="text-sm text-gray-400 flex items-center italic">⚠ Vui lòng nhấn "Rà soát" trước khi import</span>
                )}
            </div>
            {preview && (
                <div className="mt-3">
                    <div className="flex gap-4 mb-2 text-sm">
                        <span>Tổng: <b>{preview.totalRows}</b> dòng</span>
                        <span className="text-green-600">Hợp lệ: <b>{preview.validRows}</b> đề</span>
                        {preview.errorCount > 0 && <span className="text-red-600">Lỗi: <b>{preview.errorCount}</b></span>}
                        {preview.warningCount > 0 && <span className="text-yellow-600">Cảnh báo: <b>{preview.warningCount}</b></span>}
                        {preview.canImport && <span className="text-green-600 font-bold">✅ Có thể import</span>}
                    </div>
                    {preview.issues.length > 0 && (
                        <div className="max-h-60 overflow-y-auto border rounded">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr><th className="px-3 py-2 text-left text-xs text-gray-500">Dòng</th><th className="px-3 py-2 text-left text-xs text-gray-500">Loại</th><th className="px-3 py-2 text-left text-xs text-gray-500">Nội dung</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {preview.issues.map((issue, i) => (
                                        <tr key={i} className={issue.type === 'error' ? 'bg-red-50' : 'bg-yellow-50'}>
                                            <td className="px-3 py-1.5 text-black">{issue.row}</td>
                                            <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-xs font-bold ${issue.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>{issue.type === 'error' ? 'Lỗi' : 'Cảnh báo'}</span></td>
                                            <td className="px-3 py-1.5 text-black">{issue.message}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-bold text-black">Quản lý Đề thi</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="border p-2 rounded text-black">
                        <option value={10}>10 dòng</option><option value={25}>25 dòng</option><option value={50}>50 dòng</option><option value={100}>100 dòng</option><option value={10000}>Tất cả</option>
                    </select>
                    <Link href="/admin/exams/create" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap">+ Tạo Đề thi mới</Link>
                    <button onClick={() => { setShowOfficial(!showOfficial); setShowTwoPart(false); setShowUserImport(false); }}
                        className={`px-4 py-2 rounded font-bold whitespace-nowrap ${showOfficial ? 'bg-purple-800' : 'bg-purple-600'} text-white hover:bg-purple-700`}>
                        📤 Import OFFICIAL
                    </button>
                    <button onClick={() => { setShowTwoPart(!showTwoPart); setShowOfficial(false); setShowUserImport(false); }}
                        className={`px-4 py-2 rounded font-bold whitespace-nowrap ${showTwoPart ? 'bg-pink-800' : 'bg-pink-600'} text-white hover:bg-pink-700`}>
                        📤 Import 2 Phần
                    </button>
                    <button onClick={() => { setShowUserImport(!showUserImport); setShowOfficial(false); setShowTwoPart(false); }}
                        className={`px-4 py-2 rounded font-bold whitespace-nowrap ${showUserImport ? 'bg-green-800' : 'bg-green-600'} text-white hover:bg-green-700`}>
                        👥 Import Người thi
                    </button>
                </div>
            </div>

            {/* OFFICIAL Import Panel */}
            {showOfficial && renderImportPanel(
                '📤 Import Đề thi OFFICIAL (1 phần)',
                'border-purple-200', 'text-purple-800', 'bg-purple-600',
                officialFile, officialPreview, officialLoading, officialFileRef,
                '/api/admin/samples/exams',
                setOfficialFile, setOfficialPreview, setOfficialLoading,
            )}

            {/* TWO_PART Import Panel */}
            {showTwoPart && renderImportPanel(
                '📤 Import Đề thi 2 Phần (TWO_PART)',
                'border-pink-200', 'text-pink-800', 'bg-pink-600',
                twoPartFile, twoPartPreview, twoPartLoading, twoPartFileRef,
                '/api/admin/samples/exams-two-part',
                setTwoPartFile, setTwoPartPreview, setTwoPartLoading,
            )}

            {/* Users Import Panel */}
            {showUserImport && (
                <div className="mb-6 bg-white p-4 rounded-lg shadow border border-green-200">
                    <h2 className="text-lg font-bold text-green-800 mb-3">👥 Import Người thi vào Đề thi</h2>
                    <div className="flex items-center gap-3 mb-3">
                        <input ref={userFileRef} type="file" accept=".xlsx,.xls"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUserFile(f); setUserPreview(null); } }}
                            className="border p-2 rounded text-black flex-1" />
                        <a href="/api/admin/samples/exam-users" className="text-blue-600 hover:underline text-sm whitespace-nowrap">📥 Tải file mẫu</a>
                    </div>
                    <div className="flex gap-2 mb-3">
                        <button onClick={handleUserValidate} disabled={!userFile || userLoading}
                            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50 font-bold">
                            {userLoading && !userPreview ? 'Đang rà soát...' : '🔍 Rà soát'}
                        </button>
                        {userPreview ? (
                            <button onClick={handleUserImport} disabled={!userPreview.canImport || userLoading}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 font-bold">
                                {userLoading ? 'Đang import...' : '✅ Import'}
                            </button>
                        ) : (
                            <span className="text-sm text-gray-400 flex items-center italic">⚠ Vui lòng nhấn "Rà soát" trước khi import</span>
                        )}
                    </div>
                    {userPreview && (
                        <div className="mt-3">
                            <div className="flex gap-4 mb-2 text-sm">
                                <span>Tổng: <b>{userPreview.totalRows}</b> dòng</span>
                                <span className="text-green-600">Hợp lệ: <b>{userPreview.validRows}</b></span>
                                {userPreview.errorCount > 0 && <span className="text-red-600">Lỗi: <b>{userPreview.errorCount}</b></span>}
                                {userPreview.warningCount > 0 && <span className="text-yellow-600">Cảnh báo: <b>{userPreview.warningCount}</b></span>}
                                {userPreview.canImport && <span className="text-green-600 font-bold">✅ Có thể import</span>}
                            </div>
                            {userPreview.issues.length > 0 && (
                                <div className="max-h-60 overflow-y-auto border rounded">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr><th className="px-3 py-2 text-left text-xs text-gray-500">Dòng</th><th className="px-3 py-2 text-left text-xs text-gray-500">Loại</th><th className="px-3 py-2 text-left text-xs text-gray-500">Nội dung</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {userPreview.issues.map((issue, i) => (
                                                <tr key={i} className={issue.type === 'error' ? 'bg-red-50' : 'bg-yellow-50'}>
                                                    <td className="px-3 py-1.5 text-black">{issue.row}</td>
                                                    <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-xs font-bold ${issue.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>{issue.type === 'error' ? 'Lỗi' : 'Cảnh báo'}</span></td>
                                                    <td className="px-3 py-1.5 text-black">{issue.message}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên đề thi</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ôn tập</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {exams.map((exam) => (
                            <tr key={exam.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-black">
                                    {exam.title}
                                    {exam.type === 'TWO_PART' && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">2 Phần</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-black">{exam.duration} phút</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${exam.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {exam.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button
                                        onClick={async () => {
                                            setPublishLoading(prev => ({ ...prev, [exam.id]: true }));
                                            try {
                                                const newState = !publishStatus[exam.id];
                                                const res = await fetch(`/api/admin/exams/${exam.id}/publish-practice`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ publish: newState }),
                                                });
                                                if (res.ok) {
                                                    setPublishStatus(prev => ({ ...prev, [exam.id]: newState }));
                                                }
                                            } catch { }
                                            finally { setPublishLoading(prev => ({ ...prev, [exam.id]: false })); }
                                        }}
                                        disabled={publishLoading[exam.id]}
                                        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                                            publishStatus[exam.id]
                                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                        }`}
                                        title={publishStatus[exam.id] ? 'Đang hiển thị trong Ôn tập' : 'Chưa hiển thị'}
                                    >
                                        {publishLoading[exam.id] ? '...' : publishStatus[exam.id] ? '🔔 ON' : '🔕 OFF'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(exam.createdAt).toLocaleDateString('vi-VN')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link href={`/admin/exams/${exam.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">Sửa</Link>
                                    <button onClick={() => handleDelete(exam.id)} className="text-red-600 hover:text-red-900">Xóa</button>
                                </td>
                            </tr>
                        ))}
                        {exams.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Chưa có đề thi nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}
