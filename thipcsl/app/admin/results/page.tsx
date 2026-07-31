'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import Pagination from '@/components/Pagination';

export default function AdminResults() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [results, setResults] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSessionId, setFilterSessionId] = useState('');
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isPageInitialized, setIsPageInitialized] = useState(false);

    // Đọc page từ URL khi component mount hoặc URL thay đổi
    useEffect(() => {
        const pageParam = searchParams.get('page');
        if (pageParam) {
            const pageNum = parseInt(pageParam);
            if (!isNaN(pageNum) && pageNum > 0) {
                setPage(pageNum);
            }
        }
        setIsPageInitialized(true);
    }, [searchParams]); // Chạy khi searchParams thay đổi

    useEffect(() => {
        if (!isPageInitialized) return;
        setPage(1);
        fetchData(1);
    }, [filterSessionId, limit]);

    // Debounce search → gửi lên server thay vì lọc client-side
    useEffect(() => {
        if (!isPageInitialized) return;
        const timer = setTimeout(() => {
            setPage(1);
            fetchData(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (!isPageInitialized) return;
        fetchData(page);
        // Update URL khi page thay đổi (chỉ khi không phải từ URL)
        const currentPageParam = searchParams.get('page');
        if (currentPageParam !== page.toString()) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', page.toString());
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
    }, [page, isPageInitialized]);

    const fetchData = async (currentPage = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterSessionId) params.append('sessionId', filterSessionId);
            if (searchTerm) params.append('search', searchTerm);
            params.append('page', currentPage.toString());
            params.append('limit', limit.toString());

            const [resResults, resSessions] = await Promise.all([
                fetch(`/api/admin/results?${params.toString()}`),
                fetch('/api/admin/sessions')
            ]);

            if (resResults.ok) {
                const data = await resResults.json();
                setResults(data.data);
                setTotalPages(data.metadata.totalPages);
            }
            if (resSessions.ok) {
                const sessionData = await resSessions.json();
                setSessions(sessionData.data || []);
            }
        } catch (error) {
            console.error('Error fetching data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa kết quả này? Hành động này không thể hoàn tác.')) return;

        try {
            const res = await fetch(`/api/admin/results?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setResults(results.filter(r => r.id !== id));
                setSelectedIds(selectedIds.filter(sid => sid !== id));
                alert('Đã xóa kết quả thành công');
            } else {
                alert('Lỗi khi xóa kết quả');
            }
        } catch (error) {
            console.error('Error deleting result', error);
            alert('Lỗi kết nối');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.length} kết quả đã chọn? Hành động này không thể hoàn tác.`)) return;

        try {
            const res = await fetch('/api/admin/results', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });

            if (res.ok) {
                setResults(results.filter(r => !selectedIds.includes(r.id)));
                setSelectedIds([]);
                alert(`Đã xóa ${selectedIds.length} kết quả thành công`);
            } else {
                alert('Lỗi khi xóa kết quả');
            }
        } catch (error) {
            console.error('Error deleting results', error);
            alert('Lỗi kết nối');
        }
    };

    const handlePrint = (resultId: string) => {
        // Open dedicated print page in new window
        const printWindow = window.open(`/admin/results/${resultId}/print`, '_blank', 'width=1000,height=800');

        if (!printWindow) {
            alert('Vui lòng cho phép popup để in bài thi');
            return;
        }

        // Check periodically if window is closed, then reload data
        const checkClosed = setInterval(() => {
            if (printWindow.closed) {
                clearInterval(checkClosed);
                // Reload data to get updated print status
                fetchData(page);
            }
        }, 500);
    };


    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(results.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const filteredResults = results;

    if (loading) return <div className="p-8">Đang tải dữ liệu...</div>;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-bold text-gray-800">Quản lý Kết quả Thi</h1>
                <div className="flex flex-wrap gap-2">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors whitespace-nowrap"
                        >
                            Xóa {selectedIds.length} mục đã chọn
                        </button>
                    )}
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
                <table className="min-w-full table-fixed">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="w-10 px-3 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={filteredResults.length > 0 && selectedIds.length === filteredResults.length}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                            </th>
                            <th className="w-[18%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thí sinh</th>
                            <th className="w-[22%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bài thi</th>
                            <th className="w-[14%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ca thi</th>
                            <th className="w-[12%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm số</th>
                            <th className="w-[16%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian nộp</th>
                            <th className="w-[18%] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredResults.map((result) => (
                            <tr
                                key={result.id}
                                className={`hover:bg-gray-50 ${selectedIds.includes(result.id) ? 'bg-blue-50' : ''} ${result.exam.type === 'OFFICIAL' && result.is_printed ? 'bg-green-50' : ''}`}
                            >
                                <td className="px-3 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(result.id)}
                                        onChange={() => handleSelectOne(result.id)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </td>
                                <td className="px-3 py-3">
                                    <div className="text-sm font-medium text-gray-900 break-words">{result.user.full_name}</div>
                                    <div className="text-xs text-gray-500 break-words">{result.user.username} - {result.user.department}</div>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="text-sm text-gray-900 break-words">{result.exam.title}</div>
                                </td>
                                <td className="px-3 py-3">
                                    <div className="text-xs text-gray-500 break-words">
                                        {result.exam.type === 'PRACTICE' ? 'Ôn tập' : (result.session?.name || '-')}
                                    </div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                    {result.exam.type === 'PRACTICE' ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {result.score.toFixed(1)} / 10
                                        </span>
                                    ) : result.exam.type === 'TWO_PART' ? (
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${result.is_passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {result.score.toFixed(1)} / 10 {result.is_passed ? '✓' : '✗'}
                                        </span>
                                    ) : (
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${result.is_passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {result.score.toFixed(1)} / 10 ({result.is_passed ? 'Đạt' : 'Không đạt'})
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(result.submitted_at).toLocaleString('vi-VN')}
                                </td>
                                <td className="px-3 py-3 text-right text-sm font-medium whitespace-nowrap">
                                    {result.exam.type !== 'PRACTICE' && (
                                        <button
                                            onClick={() => handlePrint(result.id)}
                                            className={`mr-4 ${result.is_printed ? 'text-green-600 hover:text-green-900' : 'text-purple-600 hover:text-purple-900'}`}
                                            title={result.is_printed ? 'Đã in - Click để in lại' : 'In bài thi'}
                                        >
                                            {result.is_printed ? '✓ In' : '🖨️ In'}
                                        </button>
                                    )}
                                    <Link href={`/admin/results/${result.id}?page=${page}`} className="text-blue-600 hover:text-blue-900 mr-4">
                                        Chi tiết
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(result.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Xóa
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredResults.length === 0 && (
                    <div className="p-4 text-center text-gray-500">Không tìm thấy kết quả nào.</div>
                )}
            </div>

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
            />
        </div >
    );
}
