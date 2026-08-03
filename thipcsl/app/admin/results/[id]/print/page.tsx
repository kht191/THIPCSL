'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { parseCorrectAnswerValue } from '@/lib/question-options';

export default function PrintResultPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [printed, setPrinted] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/admin/results/${id}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                } else {
                    alert('Không tìm thấy kết quả');
                    window.close();
                }
            } catch (error) {
                console.error('Error', error);
                window.close();
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        if (data && !printed) {
            // Auto print after data loaded
            setTimeout(() => {
                window.print();
                setPrinted(true);

                // After print dialog closes, ask for confirmation
                setTimeout(() => {
                    const confirmed = confirm('Bạn đã in xong bài thi này chưa?\n\nNhấn OK để đánh dấu đã in.\nNhấn Cancel để đóng mà không đánh dấu.');

                    if (confirmed) {
                        markAsPrinted();
                    } else {
                        window.close();
                    }
                }, 500);
            }, 500);
        }
    }, [data, printed]);

    const markAsPrinted = async () => {
        try {
            const res = await fetch(`/api/admin/results/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_printed: true })
            });

            // Close window immediately without alert
            window.close();
        } catch (error) {
            console.error('Error updating print status', error);
            window.close();
        }
    };

    if (loading) return <div className="p-8 text-center">Đang tải...</div>;
    if (!data) return <div className="p-8 text-center">Lỗi tải dữ liệu</div>;

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
    const isTwoPart = result.exam.type === 'TWO_PART' && twoPartScore;

    return (
        <div className="p-8 max-w-5xl mx-auto print:p-0 print:max-w-none">
            {/* Print Only View */}
            <div className="text-black print-content">
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
                            {/* Two-Part Breakdown */}
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
