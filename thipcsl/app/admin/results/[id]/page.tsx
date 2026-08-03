'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { normalizeOptions, parseCorrectAnswerValue } from '@/lib/question-options';

export default function ResultDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/admin/results/${id}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                } else {
                    alert('Không tìm thấy kết quả');
                }
            } catch (error) {
                console.error('Error', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        const page = searchParams.get('page');
        if (page) {
            router.push(`/admin/results?page=${page}`);
        } else {
            router.push('/admin/results');
        }
    };

    if (loading) return <div className="p-8">Đang tải...</div>;
    if (!data) return <div className="p-8">Lỗi tải dữ liệu</div>;

    const { result, questions } = data;
    const details = JSON.parse(result.details || '{}');
    const userAnswers = details.answers || details;

    const totalQuestions = questions.length;
    const correctCount = questions.filter((q: any) => {
        const userAnswer = userAnswers[q.id] || [];
        const correctAnswer = parseCorrectAnswerValue(q.correct_answer);
        return JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort());
    }).length;

    // TWO_PART: Parse per-part scoring
    const twoPartScore = details.twoPartScore || null;
    const isTwoPart = (result.exam.type === 'TWO_PART' || (
        result.exam.type === 'PRACTICE' && (() => {
            try { const s = JSON.parse(result.exam.settings || '{}'); return !!s.twoPartConfig || s.isTwoPart === true; } catch { return false; }
        })()
    )) && twoPartScore;

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto print:p-0 print:max-w-none">
            {/* Action Bar - Hidden when printing */}
            <div className="flex justify-between items-center mb-8 print:hidden">
                <h1 className="text-2xl font-bold text-gray-800">Chi tiết bài thi</h1>
                <div className="space-x-4">
                    <button
                        onClick={handlePrint}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        In bài thi
                    </button>
                    <button
                        onClick={handleBack}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                        Quay lại
                    </button>
                </div>
            </div>

            {/* Print Only View */}
            <div className="hidden print:block text-black print-content">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold uppercase mb-2">KẾT QUẢ BÀI THI</h1>
                    <h2 className="text-xl font-bold uppercase">{result.exam.title}</h2>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-bold border-b border-black pb-1 mb-3 uppercase">I. Thông tin thí sinh</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <p><span className="font-bold">Họ và tên:</span> {result.user.full_name}</p>
                        <p><span className="font-bold">Mã nhân viên:</span> {result.user.username}</p>
                        <p><span className="font-bold">Đơn vị:</span> {result.user.department}</p>
                        <p><span className="font-bold">Ngày thi:</span> {new Date(result.submitted_at).toLocaleString('vi-VN')}</p>
                        {result.session && <p><span className="font-bold">Ca thi:</span> {result.session.name}</p>}
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-bold border-b border-black pb-1 mb-3 uppercase">II. Kết quả chi tiết</h3>
                    {isTwoPart ? (
                        <div>
                            <table className="w-full text-sm border-collapse border border-black mb-3">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-black px-2 py-1 text-left">Phần thi</th>
                                        <th className="border border-black px-2 py-1 text-center">Số câu đúng</th>
                                        <th className="border border-black px-2 py-1 text-center">Tổng số câu</th>
                                        <th className="border border-black px-2 py-1 text-center">Tỷ lệ</th>
                                        <th className="border border-black px-2 py-1 text-center">Điểm</th>
                                        <th className="border border-black px-2 py-1 text-center">Kết quả</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-black px-2 py-1 font-bold">Phần 1: {twoPartScore.part1Label || 'Yêu cầu chung'}</td>
                                        <td className="border border-black px-2 py-1 text-center">{twoPartScore.part1Correct}</td>
                                        <td className="border border-black px-2 py-1 text-center">{twoPartScore.part1Total}</td>
                                        <td className="border border-black px-2 py-1 text-center">{(twoPartScore.part1Percent ?? (twoPartScore.part1Total > 0 ? (twoPartScore.part1Correct / twoPartScore.part1Total) * 100 : 0)).toFixed(2)}%</td>
                                        <td className="border border-black px-2 py-1 text-center">{(twoPartScore.part1Score ?? (twoPartScore.part1Total > 0 ? (twoPartScore.part1Correct / twoPartScore.part1Total * 10) : 0)).toFixed(1)}</td>
                                        <td className={`border border-black px-2 py-1 text-center font-bold ${twoPartScore.part1Passed ? '' : 'text-red-600'}`}>
                                            {twoPartScore.part1Passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black px-2 py-1 font-bold">Phần 2: {twoPartScore.part2Label || 'Yêu cầu riêng'}</td>
                                        <td className="border border-black px-2 py-1 text-center">{twoPartScore.part2Correct}</td>
                                        <td className="border border-black px-2 py-1 text-center">{twoPartScore.part2Total}</td>
                                        <td className="border border-black px-2 py-1 text-center">{(twoPartScore.part2Percent ?? (twoPartScore.part2Total > 0 ? (twoPartScore.part2Correct / twoPartScore.part2Total) * 100 : 0)).toFixed(2)}%</td>
                                        <td className="border border-black px-2 py-1 text-center">{(twoPartScore.part2Score ?? (twoPartScore.part2Total > 0 ? (twoPartScore.part2Correct / twoPartScore.part2Total * 10) : 0)).toFixed(1)}</td>
                                        <td className={`border border-black px-2 py-1 text-center font-bold ${twoPartScore.part2Passed ? '' : 'text-red-600'}`}>
                                            {twoPartScore.part2Passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <p className="mt-2"><span className="font-bold">Tổng điểm:</span> {result.score.toFixed(2)} / 10</p>
                            <p><span className="font-bold">Tổng số câu đúng:</span> {correctCount} / {totalQuestions}</p>
                            <p className="text-lg mt-2">
                                <span className="font-bold">Xếp loại:</span>{' '}
                                <span className={`font-bold uppercase ${result.is_passed ? '' : 'text-red-600'}`}>
                                    {result.is_passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                                    {!result.is_passed && ` (${!twoPartScore.part1Passed ? 'Phần 1 chưa đạt' : ''}${!twoPartScore.part1Passed && !twoPartScore.part2Passed ? ', ' : ''}${!twoPartScore.part2Passed ? 'Phần 2 chưa đạt' : ''})`}
                                </span>
                            </p>
                        </div>
                    ) : (
                        <div className="text-sm space-y-2">
                            <p><span className="font-bold">Điểm số:</span> {result.score.toFixed(2)} / 10</p>
                            <p><span className="font-bold">Số câu đúng:</span> {correctCount} / {totalQuestions}</p>
                            <p><span className="font-bold">Xếp loại:</span> {result.is_passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-between mt-20 pt-10 px-24">
                    <div className="text-center">
                        <p className="font-bold mb-2 uppercase">NGƯỜI COI THI</p>
                        <p className="italic text-sm">(Ký và ghi rõ họ tên)</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold mb-2 uppercase">THÍ SINH</p>
                        <p className="italic text-sm">(Ký và ghi rõ họ tên)</p>
                    </div>
                </div>
            </div>

            {/* Screen Only View (Existing Detail) */}
            <div className="bg-white p-8 rounded shadow print:hidden">
                {/* Header Info */}
                <div className="border-b pb-6 mb-6">
                    <h2 className="text-2xl font-bold text-center mb-2 uppercase">{result.exam.title}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4">
                        <div>
                            <p><span className="font-bold">Họ tên:</span> {result.user.full_name}</p>
                            <p><span className="font-bold">Mã NV:</span> {result.user.username}</p>
                            <p><span className="font-bold">Đơn vị:</span> {result.user.department}</p>
                        </div>
                        <div className="text-right">
                            <p><span className="font-bold">Ngày thi:</span> {new Date(result.submitted_at).toLocaleString('vi-VN')}</p>
                            {result.session && <p><span className="font-bold">Ca thi:</span> {result.session.name}</p>}
                            <p className="mt-2">
                                <span className="font-bold text-lg">Điểm số: {result.score.toFixed(1)} / 10</span>
                                {result.exam.type !== 'PRACTICE' && (
                                    <span className={`ml-2 px-3 py-1 rounded-full text-sm font-bold ${result.is_passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {result.is_passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* TWO_PART: Hiển thị bảng tóm tắt 2 phần */}
                {(() => {
                    const details = (() => { try { return JSON.parse(result.details || '{}'); } catch { return {}; } })();
                    const twoPartScore = details.twoPartScore;
                    const isTwoPart = (result.exam.type === 'TWO_PART' || (
        result.exam.type === 'PRACTICE' && (() => {
            try { const s = JSON.parse(result.exam.settings || '{}'); return !!s.twoPartConfig || s.isTwoPart === true; } catch { return false; }
        })()
    )) && twoPartScore;
                    if (!isTwoPart) return null;
                    return (
                        <div className="mt-4 border-2 border-blue-200 rounded-lg overflow-hidden">
                            <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                                <h3 className="font-bold text-blue-800">Kết quả chi tiết theo từng phần</h3>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-blue-200">
                                <div className="p-4">
                                    <h4 className="font-bold text-blue-700 mb-2">Phần 1: {twoPartScore.part1Label || 'Yêu cầu chung'}</h4>
                                    <p className="text-sm">Đúng: <strong>{twoPartScore.part1Correct}/{twoPartScore.part1Total}</strong> câu</p>
                                    <p className="text-sm">Tỷ lệ đúng: <strong>{(twoPartScore.part1Percent ?? (twoPartScore.part1Total > 0 ? (twoPartScore.part1Correct / twoPartScore.part1Total) * 100 : 0)).toFixed(2)}%</strong></p>
                                    <p className="text-sm">Yêu cầu: <strong>≥ {twoPartScore.part1PassPercent ?? 70}%</strong></p>
                                    <div className={`mt-2 px-3 py-1 rounded-full text-sm font-bold inline-block ${twoPartScore.part1Passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {twoPartScore.part1Passed ? '✓ ĐẠT' : '✗ KHÔNG ĐẠT'}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h4 className="font-bold text-green-700 mb-2">Phần 2: {twoPartScore.part2Label || 'Yêu cầu riêng'}</h4>
                                    <p className="text-sm">Đúng: <strong>{twoPartScore.part2Correct}/{twoPartScore.part2Total}</strong> câu</p>
                                    <p className="text-sm">Tỷ lệ đúng: <strong>{(twoPartScore.part2Percent ?? (twoPartScore.part2Total > 0 ? (twoPartScore.part2Correct / twoPartScore.part2Total) * 100 : 0)).toFixed(2)}%</strong></p>
                                    <p className="text-sm">Yêu cầu: <strong>≥ {twoPartScore.part2PassPercent ?? 70}%</strong></p>
                                    <div className={`mt-2 px-3 py-1 rounded-full text-sm font-bold inline-block ${twoPartScore.part2Passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {twoPartScore.part2Passed ? '✓ ĐẠT' : '✗ KHÔNG ĐẠT'}
                                    </div>
                                </div>
                            </div>
                            <div className={`px-4 py-3 text-center font-bold ${twoPartScore.overallPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {twoPartScore.overallPassed ? '🎉 TỔNG KẾT: ĐẠT' : '❌ TỔNG KẾT: KHÔNG ĐẠT'}
                            </div>
                        </div>
                    );
                })()}

                <div className="flex gap-8">
                    {/* Questions */}
                    <div className="flex-1 space-y-6">
                        {questions.map((q: any, index: number) => {
                            let opts: any = {};
                            try { opts = normalizeOptions(JSON.parse(q.options)); } catch (e) { opts = {}; }

                            const userAnswer = userAnswers[q.id] || [];
                            const correctAnswer = parseCorrectAnswerValue(q.correct_answer);

                            const isCorrect = JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort());

                            return (
                                <div key={q.id} id={`question-${index}`} className="break-inside-avoid scroll-mt-24 border-b pb-6 last:border-0">
                                    <div className="flex space-x-2 mb-2">
                                        <span className="font-bold">Câu {index + 1}:</span>
                                        <div>{q.content}</div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 ml-8 mb-2">
                                        {Object.keys(opts).map((key) => (
                                            opts[key] && (
                                                <div key={key} className="flex items-center space-x-2">
                                                    <span className={`
                                                        w-6 h-6 rounded-full flex items-center justify-center text-xs border
                                                        ${userAnswer.includes(key) ? (isCorrect ? 'bg-green-100 border-green-500 font-bold text-green-800' : 'bg-red-100 border-red-500 font-bold text-red-800') : 'border-gray-300'}
                                                        ${correctAnswer.includes(key) ? 'ring-2 ring-green-400' : ''}
                                                    `}>
                                                        {key}
                                                    </span>
                                                    <span className={userAnswer.includes(key) || correctAnswer.includes(key) ? (correctAnswer.includes(key) ? 'font-medium text-green-700' : 'font-medium text-red-700') : ''}>
                                                        {opts[key]}
                                                    </span>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                    <div className="ml-8 text-sm text-gray-500">
                                        Đáp án đúng: <span className="font-bold text-green-600">{correctAnswer.join(', ')}</span>
                                        {!isCorrect && <span className="text-red-500 ml-4"> (Bạn chọn: {userAnswer.length > 0 ? userAnswer.join(', ') : 'Không chọn'})</span>}
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
                                {questions.map((q: any, index: number) => {
                                    const userAnswer = userAnswers[q.id] || [];
                                    const isAnswered = userAnswer.length > 0;

                                    const correctAnswer = parseCorrectAnswerValue(q.correct_answer);

                                    const isCorrect = isAnswered && JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort());

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
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 1cm;
                    }
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                        background-color: white;
                        font-family: 'Times New Roman', Times, serif;
                    }
                    .print-content {
                        font-family: 'Times New Roman', Times, serif;
                    }
                }
            `}</style>
        </div>
    );
}
