'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeOptions, parseCorrectAnswerValue } from '@/lib/question-options';

export default function MonitorDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [data, setData] = useState<any>(null);
    const [viewerRole, setViewerRole] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s for live updates
        return () => clearInterval(interval);
    }, [id]);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/admin/results/${id}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
                if (json.viewerRole) setViewerRole(json.viewerRole);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Error', error);
        } finally {
            setLoading(false);
        }
    };
    const handleUnlock = async () => {
        if (!confirm('Bạn có chắc muốn mở khóa cho thí sinh này?')) return;
        try {
            const res = await fetch(`/api/admin/results/${id}/unlock`, {
                method: 'POST',
            });
            if (res.ok) {
                alert('Đã mở khóa thành công');
                fetchData();
            } else {
                alert('Lỗi khi mở khóa');
            }
        } catch (error) {
            console.error('Error unlocking', error);
        }
    };

    if (loading && !data) return <div className="p-8">Đang tải dữ liệu...</div>;
    if (!data) return <div className="p-8">Không tìm thấy dữ liệu</div>;

    const { result, questions } = data;
    const details = JSON.parse(result.details || '{}');
    const userAnswers = details.answers || details;
    const answeredCount = Object.keys(userAnswers).length;
    const totalQuestions = questions.length;
    const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    // TWO_PART: Parse config
    const isTwoPart = result?.exam?.type === 'TWO_PART';
    const twoPartConfig = (() => {
        if (!isTwoPart || !result?.exam?.settings) return null;
        try {
            const s = typeof result.exam.settings === 'string' ? JSON.parse(result.exam.settings) : result.exam.settings;
            return s.twoPartConfig || null;
        } catch { return null; }
    })();
    const partMap: Record<string, number> = {};
    if (twoPartConfig) {
        (twoPartConfig.part1QuestionIds || []).forEach((qid: string) => { partMap[qid] = 1; });
        (twoPartConfig.part2QuestionIds || []).forEach((qid: string) => { partMap[qid] = 2; });
    }
    // Per-part progress
    const p1Answered = questions.filter((q: any) => partMap[q.id] === 1 && userAnswers[q.id]?.length > 0).length;
    const p1Total = questions.filter((q: any) => partMap[q.id] === 1).length;
    const p2Answered = questions.filter((q: any) => partMap[q.id] === 2 && userAnswers[q.id]?.length > 0).length;
    const p2Total = questions.filter((q: any) => partMap[q.id] === 2).length;

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Chi tiết Giám sát</h1>
                    <div className="text-sm text-gray-500 mt-1">
                        Cập nhật lúc: {lastUpdated.toLocaleTimeString('vi-VN')}
                    </div>
                </div>
                <button
                    onClick={() => window.history.back()}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    Quay lại
                </button>
            </div>

            {/* Main Layout */}
            <div className="flex gap-6">
                {/* Left Column: Info & Questions */}
                <div className="flex-1 min-w-0">
                    {/* Info Card */}
                    <div className="bg-white p-6 rounded shadow mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-blue-800 mb-2">{result.exam.title}</h2>
                                <p><span className="font-bold">Thí sinh:</span> {result.user.full_name} ({result.user.username})</p>
                                <p><span className="font-bold">Đơn vị:</span> {result.user.department}</p>
                            </div>
                            <div className="text-right">
                                <p><span className="font-bold">Bắt đầu:</span> {new Date(result.started_at).toLocaleString('vi-VN')}</p>
                                <div className="mt-2">
                                    <span className="font-bold">Tiến độ:</span> {answeredCount}/{totalQuestions} câu
                                    {isTwoPart && <span className="text-xs text-gray-500 ml-2">(P1: {p1Answered}/{p1Total}, P2: {p2Answered}/{p2Total})</span>}
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1 ml-auto max-w-[200px]">
                                        <div
                                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${progressPercent}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    {(() => {
                                        const startTime = new Date(result.started_at);
                                        const durationMs = result.exam.duration * 60 * 1000;
                                        const endTime = new Date(startTime.getTime() + durationMs);
                                        const now = new Date();
                                        const isExpired = now > endTime;
                                        const isCompleted = result.status === 'COMPLETED';

                                        if (isCompleted) {
                                            return (
                                                <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                                    ĐÃ NỘP BÀI
                                                </span>
                                            );
                                        } else if (isExpired) {
                                            return (
                                                <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
                                                    ĐÃ HẾT GIỜ
                                                </span>
                                            );
                                        } else {
                                            return (
                                                <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800 animate-pulse">
                                                    ĐANG THI
                                                </span>
                                            );
                                        }
                                    })()}
                                    {result.is_locked && (
                                        <div className="mt-2">
                                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-600 text-white block text-center mb-2">
                                                ĐANG BỊ KHÓA
                                            </span>
                                            <button
                                                onClick={handleUnlock}
                                                className="w-full bg-blue-600 text-white py-1 rounded hover:bg-blue-700 text-sm font-bold"
                                            >
                                                Mở khóa
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Questions List */}
                    <div className="bg-white p-6 rounded shadow">
                        <h3 className="font-bold text-gray-700 mb-4">Chi tiết bài làm</h3>
                        <div className="space-y-6">
                            {questions.map((q: any, index: number) => {
                                let opts: any = {};
                                try { opts = normalizeOptions(JSON.parse(q.options)); } catch (e) { opts = {}; }
                                const userAnswer = userAnswers[q.id] || [];
                                const correctAns = parseCorrectAnswerValue(q.correct_answer);
                                const isAdmin = viewerRole === 'ADMIN';
                                const qPart = partMap[q.id];

                                // Part separator
                                const isPart2Start = isTwoPart && qPart === 2 &&
                                    (index === 0 || partMap[questions[index - 1]?.id] === 1);

                                return (
                                    <React.Fragment key={q.id}>
                                        {isPart2Start && (
                                            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 my-4 text-center">
                                                <span className="font-bold text-blue-800">
                                                    Phần 2: {twoPartConfig?.part2Label || 'Yêu cầu riêng'}
                                                </span>
                                            </div>
                                        )}
                                        <div id={`question-${index}`} className="border-b pb-4 last:border-0 scroll-mt-24">
                                            {isTwoPart && (
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded mb-1 inline-block ${qPart === 1 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                    {qPart === 1 ? `Phần 1: ${twoPartConfig?.part1Label || 'YC chung'}` : `Phần 2: ${twoPartConfig?.part2Label || 'YC riêng'}`}
                                                </span>
                                            )}
                                        <div className="flex space-x-2 mb-2">
                                            <span className="font-bold">Câu {index + 1}:</span>
                                            <div>{q.content}</div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 ml-8">
                                            {Object.keys(opts).map((key) => {
                                                if (!opts[key]) return null;

                                                const isSelected = userAnswer.includes(key);
                                                const isCorrect = correctAns.includes(key);

                                                let styleClass = 'border-gray-300';
                                                if (isAdmin) {
                                                    // Admin view: Show correct/incorrect
                                                    if (isSelected && isCorrect) {
                                                        styleClass = 'bg-green-100 border-green-500 font-bold text-green-800';
                                                    } else if (isSelected && !isCorrect) {
                                                        styleClass = 'bg-red-100 border-red-500 font-bold text-red-800';
                                                    } else if (!isSelected && isCorrect) {
                                                        styleClass = 'bg-green-50 border-green-300 text-green-700 border-dashed';
                                                    }
                                                } else {
                                                    // Proctor view: Show selection only (Blue)
                                                    if (isSelected) {
                                                        styleClass = 'bg-blue-100 border-blue-500 font-bold text-blue-800';
                                                    }
                                                }

                                                return (
                                                    <div key={key} className="flex items-center space-x-2">
                                                        <span className={`
                                                    w-6 h-6 rounded-full flex items-center justify-center text-xs border
                                                    ${styleClass}
                                                `}>
                                                            {key}
                                                        </span>
                                                        <span className={isSelected || (isAdmin && isCorrect) ? (isCorrect && isAdmin ? 'font-medium text-green-700' : (isSelected ? 'font-medium text-blue-700' : '')) : ''}>
                                                            {opts[key]}
                                                            {isAdmin && isCorrect && <span className="ml-2 text-xs text-green-600">(Đúng)</span>}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Question Palette */}
                <div className="w-80 shrink-0">
                    <div className="bg-white p-4 rounded shadow sticky top-6">
                        <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Danh sách câu hỏi</h3>

                        <div className="mb-4 text-sm text-gray-600 flex justify-between">
                            <span>Đã làm: <span className="font-bold text-green-600">{answeredCount}</span></span>
                            <span>Chưa làm: <span className="font-bold text-gray-500">{totalQuestions - answeredCount}</span></span>
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                            {questions.map((q: any, index: number) => {
                                const userAnswer = userAnswers[q.id] || [];
                                const isAnswered = userAnswer.length > 0;
                                const isAdmin = viewerRole === 'ADMIN';

                                let statusClass = 'bg-gray-100 text-gray-600 border-gray-200 border hover:bg-gray-200';

                                if (isAnswered) {
                                    if (isAdmin) {
                                        // Calculate correctness
                                        const correctAns = parseCorrectAnswerValue(q.correct_answer);
                                        const isCorrect = JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAns.sort());
                                        statusClass = isCorrect
                                            ? 'bg-green-100 text-green-800 border-green-500 border hover:bg-green-200'
                                            : 'bg-red-100 text-red-800 border-red-500 border hover:bg-red-200';
                                    } else {
                                        // Proctor view: just show as answered (Blue)
                                        statusClass = 'bg-blue-100 text-blue-800 border-blue-300 border hover:bg-blue-200';
                                    }
                                }

                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => {
                                            const el = document.getElementById(`question-${index}`);
                                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }}
                                        className={`h-10 w-10 rounded flex items-center justify-center text-sm font-medium transition-colors ${statusClass}`}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
}
