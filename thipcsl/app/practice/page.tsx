'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PracticePage() {
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        fetchUser();
        fetchExams();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            }
        } catch (error) {
            console.error('Error fetching user', error);
        }
    };

    const fetchExams = async () => {
        try {
            const res = await fetch('/api/practice');
            if (res.ok) {
                setExams(await res.json());
            } else {
                // Handle error (maybe redirect to login if 401)
            }
        } catch (error) {
            console.error('Error fetching exams', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Đang tải...</div>;

    const handleEdit = async (exam: any) => {
        if (exam.isOfficial) {
            try {
                const res = await fetch(`/api/practice/${exam.id}/fork`, { method: 'POST' });
                const data = await res.json();
                if (data.examId) router.push(`/practice/${data.examId}/edit`);
                else alert('Lỗi khi tạo bản sao cá nhân');
            } catch { alert('Lỗi kết nối'); }
        } else {
            router.push(`/practice/${exam.id}/edit`);
        }
    };

    const handleDeleteExam = async (examId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa đề thi này không?')) return;
        try {
            const res = await fetch(`/api/practice/${examId}`, { method: 'DELETE' });
            if (res.ok) setExams(exams.filter((e: any) => e.id !== examId));
            else alert('Có lỗi xảy ra khi xóa đề thi');
        } catch { alert('Có lỗi xảy ra khi xóa đề thi'); }
    };

    const handlePin = async (examId: string) => {
        try {
            const res = await fetch(`/api/practice/${examId}/pin`, { method: 'POST' });
            if (res.ok) fetchExams();
        } catch { }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header với thông tin người dùng */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Hệ thống Thi Trực Tuyến</h1>
                                {user && (
                                    <div className="flex items-center space-x-4 mt-1">
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold text-blue-600">{user.full_name}</span>
                                            {user.department && <span className="text-gray-400"> • {user.department}</span>}
                                        </p>
                                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                                            {user.role === 'ADMIN' && '👑 Admin'}
                                            {user.role === 'PROCTOR' && '👁️ Giám thị'}
                                            {user.role === 'CANDIDATE' && '📝 Thí sinh'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <nav className="flex space-x-4 ml-8">
                                <Link href="/exam" className="text-gray-600 hover:text-blue-600 font-medium pb-1">
                                    Đề thi
                                </Link>
                                <Link href="/practice" className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1">
                                    Ôn tập
                                </Link>
                                {(user?.role === 'ADMIN' || user?.role === 'PROCTOR') && (
                                    <Link href="/admin/monitor" className="text-gray-600 hover:text-blue-600 font-medium pb-1">
                                        Quản lý
                                    </Link>
                                )}
                            </nav>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link
                                href="/practice/create"
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center text-sm"
                            >
                                <span className="mr-2">+</span> Tạo đề ôn tập mới
                            </Link>
                            <button
                                onClick={() => {
                                    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                                    router.push('/login');
                                }}
                                className="text-red-600 hover:text-red-800 font-medium text-sm"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <div className="max-w-7xl mx-auto p-8">
                <h2 className="text-xl font-semibold text-gray-700 mb-6">Đề ôn tập</h2>

                {exams.length === 0 ? (
                    <div className="bg-white p-8 rounded shadow text-center text-gray-500">
                        Bạn chưa tạo đề ôn tập nào. Hãy bấm nút "Tạo đề ôn tập mới" để bắt đầu.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map((exam: any) => {
                            const badge = exam.isOfficial
                                ? { text: 'CHÍNH THỨC', bg: 'bg-orange-100 text-orange-700 border-orange-300' }
                                : exam.isForkedCopy
                                ? { text: 'BẢN SAO', bg: 'bg-blue-100 text-blue-700 border-blue-300' }
                                : { text: 'TỰ TẠO', bg: 'bg-gray-100 text-gray-600 border-gray-300' };

                            const cardBg = exam.isOfficial ? 'bg-orange-50 border-orange-200' :
                                           exam.isForkedCopy ? 'bg-blue-50 border-blue-200' : 'bg-white';

                            return (
                                <div key={exam.id} className={`${cardBg} p-6 rounded shadow border hover:shadow-md transition-shadow`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs px-2 py-0.5 rounded border font-bold ${badge.bg}`}>{badge.text}</span>
                                        <button
                                            onClick={() => handlePin(exam.id)}
                                            className={`px-2 py-1 rounded text-sm font-bold transition-all duration-200 ${
                                                exam.pinned
                                                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-400 shadow-sm'
                                                    : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300'
                                            }`}
                                            title={exam.pinned ? 'Đã ghim - Bấm để bỏ ghim' : 'Ghim lên đầu để ưu tiên ôn tập'}
                                        >
                                            📌 {exam.pinned ? 'Đã ghim' : 'Ghim'}
                                        </button>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 mb-2">{exam.title}</h2>
                                    <div className="text-sm text-gray-600 mb-4">
                                        <p>Thời gian: {exam.duration} phút</p>
                                        <p>Số câu hỏi: {JSON.parse(exam.question_ids || '[]').length} câu</p>
                                        {!exam.isOfficial && <p>Ngày tạo: {new Date(exam.createdAt).toLocaleDateString('vi-VN')}</p>}
                                        <p>Lần làm bài: {exam._count?.results || 0}</p>
                                    </div>
                                    <div className="flex space-x-3">
                                        <button onClick={() => router.push(`/exam/${exam.id}`)}
                                            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 text-center">Làm bài</button>
                                        <button onClick={() => handleEdit(exam)}
                                            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">Sửa</button>
                                        {exam.isForkedCopy && (
                                            <button onClick={async () => {
                                                if (!confirm('Đặt lại cấu trúc đề giống với đề chính thức?')) return;
                                                try {
                                                    const res = await fetch(`/api/practice/${exam.id}/reset`, { method: 'POST' });
                                                    if (res.ok) { alert('Đã đặt lại!'); fetchExams(); }
                                                    else alert('Lỗi khi đặt lại');
                                                } catch { alert('Lỗi kết nối'); }
                                            }}
                                                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                                                title="Đặt lại giống đề chính thức">🔄</button>
                                        )}
                                        {exam.canDelete && (
                                            <button onClick={() => handleDeleteExam(exam.id)}
                                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Xóa</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
