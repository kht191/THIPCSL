'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExamDashboard() {
    const [exams, setExams] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        fetchUser();
        fetchExams();
        fetchResults();
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
            const res = await fetch('/api/exam-runner/active');
            if (res.ok) {
                const data = await res.json();
                setExams(data);
            } else {
                if (res.status === 401) {
                    router.push('/login');
                }
            }
        } catch (error) {
            console.error('Error fetching exams', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchResults = async () => {
        try {
            const res = await fetch('/api/exam-runner/results');
            if (res.ok) {
                const data = await res.json();
                setResults(data.results || []);
            }
        } catch (error) {
            console.error('Error fetching results', error);
        }
    };

    if (loading) return <div className="p-8 text-center">Đang tải danh sách đề thi...</div>;

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
                                <Link href="/exam" className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1">
                                    Đề thi
                                </Link>
                                <Link href="/practice" className="text-gray-600 hover:text-blue-600 font-medium pb-1">
                                    Ôn tập
                                </Link>
                                {(user?.role === 'ADMIN' || user?.role === 'PROCTOR') && (
                                    <Link href="/admin/monitor" className="text-gray-600 hover:text-blue-600 font-medium pb-1">
                                        Quản lý
                                    </Link>
                                )}
                            </nav>
                        </div>
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
            </header>

            {/* Main content */}
            <div className="max-w-7xl mx-auto p-8">

                <h2 className="text-xl font-semibold text-gray-700 mb-4">Danh sách Ca thi đang diễn ra</h2>

                {exams.length === 0 ? (
                    <div className="bg-white p-8 rounded shadow text-center text-gray-500">
                        Hiện không có ca thi nào đang diễn ra dành cho bạn.
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        {exams.map((session: any) => (
                            <div key={session.id} className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow border-l-4 border-blue-500">
                                <h2 className="text-xl font-bold text-blue-600 mb-1">{session.name || 'Ca thi không tên'}</h2>
                                <div className="text-gray-600 mb-4 text-sm">
                                    <p>Bắt đầu: <span className="font-medium">{new Date(session.startTime).toLocaleString('vi-VN')}</span></p>
                                    <p>Kết thúc: <span className="font-medium">{new Date(session.endTime).toLocaleString('vi-VN')}</span></p>
                                </div>

                                <div className="space-y-4 mt-4">
                                    {session.exams?.map((exam: any) => (
                                        <div key={exam.id} className="bg-gray-50 p-3 rounded border">
                                            <h3 className="text-md font-semibold text-gray-800 mb-1">{exam.title}</h3>
                                            <p className="text-sm text-gray-600 mb-2">Thời gian: <span className="font-semibold">{exam.duration} phút</span></p>
                                            <Link
                                                href={`/exam/${exam.id}`}
                                                className="block w-full text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors text-sm"
                                            >
                                                Vào thi
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Kết quả đã thi */}
            {results.length > 0 && (
                <div className="max-w-7xl mx-auto px-8 pb-8">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Kết quả đã thi</h2>
                    <div className="bg-white rounded shadow overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đề thi</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Điểm</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Kết quả</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Lần thi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {results.map((r: any, i: number) => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{r.examTitle}</td>
                                        <td className="px-4 py-3 text-center text-sm font-bold">{r.score.toFixed(1)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${r.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {r.isPassed ? 'Đạt' : 'Không đạt'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.submittedAt).toLocaleString('vi-VN')}</td>
                                        <td className="px-4 py-3 text-center text-xs text-gray-500">{r.attemptNumber}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
