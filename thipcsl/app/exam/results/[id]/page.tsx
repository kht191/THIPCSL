'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { normalizeOptions, parseCorrectAnswerValue } from '@/lib/question-options';

export default function ExamResult() {
    const { id } = useParams();
    const router = useRouter();
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        if (id) fetchResult();
        fetchUserRole();
    }, [id]);

    // Handle bfcache
    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                window.location.reload();
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    const fetchUserRole = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUserRole(data.role);
            }
        } catch (e) {
            console.error('Failed to fetch user role:', e);
        }
    };

    const fetchResult = async () => {
        try {
            const res = await fetch(`/api/results/${id}`);
            if (res.ok) {
                const data = await res.json();
                setResult(data);
            } else {
                const err = await res.json();
                setError(err.error || 'Lỗi khi tải kết quả');
            }
        } catch (e) {
            setError('Lỗi kết nối');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Đang tải kết quả...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
    if (!result) return <div className="p-8 text-center">Không tìm thấy kết quả</div>;

    const details = JSON.parse(result.details || '{}');
    // Handle both old format (details IS answers) and new format (details.answers IS answers)
    const userAnswers = details.answers || details;

    // Helper to check correctness for display
    const isCorrect = (question: any, answerKey: string) => {
        const correctAns = parseCorrectAnswerValue(question.correct_answer);
        return correctAns.includes(answerKey);
    };

    // TWO_PART: Parse twoPartScore từ details
    const twoPartScore = details.twoPartScore || null;
    const isTwoPart = (result.exam.type === 'TWO_PART' || (
        result.exam.type === 'PRACTICE' && (() => {
            try { const s = JSON.parse(result.exam.settings || '{}'); return !!s.twoPartConfig || s.isTwoPart === true; } catch { return false; }
        })()
    )) && twoPartScore;

    // TWO_PART: Tạo map question -> part
    let partMap: Record<string, number> = {};
    if (isTwoPart && result.exam.settings) {
        try {
            const settings = JSON.parse(result.exam.settings);
            if (settings.twoPartConfig) {
                (settings.twoPartConfig.part1QuestionIds || []).forEach((qid: string) => { partMap[qid] = 1; });
                (settings.twoPartConfig.part2QuestionIds || []).forEach((qid: string) => { partMap[qid] = 2; });
            }
        } catch (e) { /* ignore */ }
    }

    const isUserSelected = (questionId: string, answerKey: string) => {
        const ans = userAnswers[questionId] || [];
        return ans.includes(answerKey);
    };

    // Determine back link based on user role
    let backLink = '/';
    let backText = 'Quay lại';

    if (userRole === 'admin' || userRole === 'teacher') {
        backLink = '/admin/results';
        backText = 'Quay lại Danh sách Kết quả';
    } else {
        backLink = result.exam.type === 'PRACTICE' ? '/practice' : '/exam';
        backText = result.exam.type === 'PRACTICE' ? 'Quay lại Danh sách Ôn tập' : 'Quay lại Danh sách Đề thi';
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="max-w-4xl mx-auto bg-white rounded shadow p-4 md:p-6">
                <div className="mb-4">
                    <Link href={backLink} className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                        <span>←</span> {backText}
                    </Link>
                </div>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-black">Kết quả thi: {result.exam.title}</h1>
                        <p className="text-gray-600">Thí sinh: {result.user.full_name} ({result.user.username})</p>
                        <p className="text-gray-600">Thời gian nộp: {new Date(result.submitted_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <div className="text-right">
                        <div className={`text-4xl font-bold ${result.is_passed ? 'text-green-600' : 'text-red-600'}`}>{parseFloat(result.score).toFixed(1)} / 10</div>
                        <p className="text-sm text-gray-500">Điểm số</p>
                    </div>
                </div>

                {/* TWO_PART: Hiển thị bảng tóm tắt 2 phần */}
                {isTwoPart && (
                    <div className="mb-6 border-2 border-blue-200 rounded-lg overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                            <h3 className="font-bold text-blue-800">Kết quả chi tiết theo từng phần</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-blue-200">
                            {/* Part 1 */}
                            <div className="p-4">
                                <h4 className="font-bold text-blue-700 mb-2">Phần 1: {twoPartScore.part1Label || 'Yêu cầu chung'}</h4>
                                <p className="text-sm">Đúng: <strong>{twoPartScore.part1Correct}/{twoPartScore.part1Total}</strong> ({twoPartScore.part1Total > 0 ? Math.round(twoPartScore.part1Correct / twoPartScore.part1Total * 100) : 0}%)</p>
                                <p className="text-sm">Điểm: <strong>{twoPartScore.part1Score.toFixed(1)}/10</strong></p>
                                <div className={`mt-2 px-3 py-1 rounded-full text-sm font-bold inline-block ${twoPartScore.part1Passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {twoPartScore.part1Passed ? '✓ ĐẠT' : '✗ KHÔNG ĐẠT'}
                                </div>
                            </div>
                            {/* Part 2 */}
                            <div className="p-4">
                                <h4 className="font-bold text-green-700 mb-2">Phần 2: {twoPartScore.part2Label || 'Yêu cầu riêng'}</h4>
                                <p className="text-sm">Đúng: <strong>{twoPartScore.part2Correct}/{twoPartScore.part2Total}</strong> ({twoPartScore.part2Total > 0 ? Math.round(twoPartScore.part2Correct / twoPartScore.part2Total * 100) : 0}%)</p>
                                <p className="text-sm">Điểm: <strong>{twoPartScore.part2Score.toFixed(1)}/10</strong></p>
                                <div className={`mt-2 px-3 py-1 rounded-full text-sm font-bold inline-block ${twoPartScore.part2Passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {twoPartScore.part2Passed ? '✓ ĐẠT' : '✗ KHÔNG ĐẠT'}
                                </div>
                            </div>
                        </div>
                        <div className={`px-4 py-3 text-center font-bold ${twoPartScore.overallPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {twoPartScore.overallPassed
                                ? '🎉 TỔNG KẾT: ĐẠT (Cả 2 phần đều đạt yêu cầu)'
                                : `❌ TỔNG KẾT: KHÔNG ĐẠT (${!twoPartScore.part1Passed ? 'Phần 1 chưa đạt' : ''}${!twoPartScore.part1Passed && !twoPartScore.part2Passed ? ', ' : ''}${!twoPartScore.part2Passed ? 'Phần 2 chưa đạt' : ''})`
                            }
                        </div>
                    </div>
                )}

                <div className="flex gap-8">
                    {/* Questions */}
                    <div className="flex-1 space-y-6">
                        <h2 className="text-xl font-semibold text-black">Chi tiết bài làm</h2>
                        {result.questions.map((q: any, index: number) => {
                            const userAns = userAnswers[q.id] || [];

                            return (
                                <div key={q.id} id={`question-${index}`} className="border rounded p-4 bg-gray-50 scroll-mt-24">
                                    <div className="flex justify-between">
                                        <h3 className="font-medium text-black mb-2">Câu {index + 1}: {q.content}</h3>
                                    </div>

                                    <div className="space-y-2 ml-4">
                                        {Object.entries(normalizeOptions(JSON.parse(q.options))).map(([key, value]: [string, any]) => {
                                            const selected = isUserSelected(q.id, key);
                                            const correct = isCorrect(q, key);

                                            let bgClass = '';
                                            if (correct) bgClass = 'bg-green-100 border-green-500 text-green-800';
                                            else if (selected && !correct) bgClass = 'bg-red-100 border-red-500 text-red-800';
                                            else bgClass = 'bg-white border-gray-200 text-gray-700';

                                            return (
                                                <div key={key} className={`p-2 border rounded flex items-center ${bgClass}`}>
                                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full mr-2 text-sm font-bold ${correct ? 'bg-green-500 text-white' : (selected ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600')
                                                        }`}>
                                                        {key}
                                                    </span>
                                                    <span>{value}</span>
                                                    <div className="ml-auto flex gap-2">
                                                        {selected && <span className="text-blue-600 text-sm font-medium">✓ Bạn đã chọn</span>}
                                                        {correct && <span className="text-green-600 text-sm font-medium">✓ Đáp án đúng</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Sidebar Palette */}
                    <div className="w-64 shrink-0 hidden lg:block">
                        <div className="sticky top-8 border rounded p-4 bg-gray-50">
                            <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Danh sách câu hỏi</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {result.questions.map((q: any, index: number) => {
                                    const userAns = userAnswers[q.id] || [];
                                    const isAnswered = userAns.length > 0;

                                    // Check if all selected answers are correct and all correct answers are selected
                                    const correctAns = parseCorrectAnswerValue(q.correct_answer);

                                    const isCorrect = isAnswered && JSON.stringify(userAns.sort()) === JSON.stringify(correctAns.sort());

                                    let statusClass = 'bg-gray-100 text-gray-400 border-gray-200';
                                    if (isAnswered) {
                                        statusClass = isCorrect
                                            ? 'bg-green-100 text-green-800 border-green-500 font-bold'
                                            : 'bg-red-100 text-red-800 border-red-500 font-bold';
                                    }

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => {
                                                const el = document.getElementById(`question-${index}`);
                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }}
                                            className={`h-10 rounded flex items-center justify-center text-sm border transition-colors ${statusClass} hover:opacity-80`}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-4 pt-4 border-t text-xs space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-100 border border-green-500 rounded"></div>
                                    <span>Đúng</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-100 border border-red-500 rounded"></div>
                                    <span>Sai</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                                    <span>Chưa làm / Bỏ trống</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <div className="mt-8 text-center">
                        <Link href={backLink} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                            {backText}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
