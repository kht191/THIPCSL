'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { getOptionLabel } from '@/lib/question-options';

export default function ExamRunner({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState<any>(null);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<{ [key: string]: string[] }>({});
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0); // seconds
    const [submitting, setSubmitting] = useState(false);

    const [submitError, setSubmitError] = useState(false);
    const [sessionConflict, setSessionConflict] = useState(false);

    const [violationCount, setViolationCount] = useState(0);
    const [isExamStarted, setIsExamStarted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [timeOffset, setTimeOffset] = useState(0); // Chênh lệch giữa server time và client time (ms)
    const [twoPartConfig, setTwoPartConfig] = useState<any>(null); // Cấu hình đề thi 2 phần

    // Handle bfcache (Back/Forward Cache)
    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                window.location.reload();
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    // Load Exam Data
    useEffect(() => {
        const fetchExam = async () => {
            try {
                const savedToken = localStorage.getItem(`exam_${id}_sessionToken`);
                const res = await fetch(`/api/exam-runner/${id}${savedToken ? `?sessionToken=${savedToken}` : ''}`);
                if (res.ok) {
                    const data = await res.json();
                    setExam(data.exam);
                    setUserInfo(data.user);
                    setQuestions(data.questions);
                    if (data.twoPartConfig) {
                        setTwoPartConfig(data.twoPartConfig);
                    }
                    if (data.sessionToken) {
                        setSessionToken(data.sessionToken);
                        localStorage.setItem(`exam_${id}_sessionToken`, data.sessionToken);
                    }
                    if (data.isLocked) {
                        setIsLocked(true);
                        setIsExamStarted(true); // Ensure UI shows locked screen instead of start screen
                    }
                    if (data.resultId) {
                        setExam((prev: any) => ({ ...prev, resultId: data.resultId }));
                    }

                    // Tính timeOffset từ serverTime
                    if (data.serverTime) {
                        const serverTime = new Date(data.serverTime).getTime();
                        const clientTime = Date.now();
                        const offset = serverTime - clientTime;
                        setTimeOffset(offset);
                        console.log('[TIME SYNC] Server time:', new Date(serverTime).toISOString());
                        console.log('[TIME SYNC] Client time:', new Date(clientTime).toISOString());
                        console.log('[TIME SYNC] Offset:', offset, 'ms (', Math.round(offset / 1000), 'seconds)');
                    }

                    // Initialize or Load Timer
                    let endTime = 0;
                    if (data.startedAt) {
                        // Server source of truth - Bài thi đang làm dở
                        const startTime = new Date(data.startedAt).getTime();
                        const durationMs = data.exam.duration * 60 * 1000;
                        endTime = startTime + durationMs;

                        // Update local storage to match server
                        localStorage.setItem(`exam_${id}_endTime`, endTime.toString());
                    } else {
                        // Bài thi mới - Xóa localStorage cũ để tránh load dữ liệu cũ
                        console.log('[INFO] New exam session - Clearing old localStorage data');
                        localStorage.removeItem(`exam_${id}_endTime`);
                        localStorage.removeItem(`exam_${id}_answers`);
                        localStorage.removeItem(`exam_${id}_violations`);
                        // Giữ sessionToken để server có thể track

                        // Tạo endTime mới dựa trên server time
                        const durationSec = data.exam.duration * 60;
                        const serverNow = Date.now() + (data.serverTime ? new Date(data.serverTime).getTime() - Date.now() : 0);
                        endTime = serverNow + durationSec * 1000;
                        localStorage.setItem(`exam_${id}_endTime`, endTime.toString());
                    }

                    // Tính thời gian còn lại dựa trên server time
                    const serverNow = Date.now() + (data.serverTime ? new Date(data.serverTime).getTime() - Date.now() : 0);
                    const remaining = Math.floor((endTime - serverNow) / 1000);
                    setTimeLeft(remaining > 0 ? remaining : 0);

                    // Load Saved Answers (Server First, then Local)
                    if (data.answers && Object.keys(data.answers).length > 0) {
                        setAnswers(data.answers);
                        localStorage.setItem(`exam_${id}_answers`, JSON.stringify(data.answers));
                    } else {
                        // Chỉ load từ localStorage nếu có startedAt (bài thi đang làm dở)
                        if (data.startedAt) {
                            const savedAnswers = localStorage.getItem(`exam_${id}_answers`);
                            if (savedAnswers) {
                                setAnswers(JSON.parse(savedAnswers));
                            }
                        } else {
                            // Bài thi mới - Reset answers
                            setAnswers({});
                        }
                    }

                    // Load Violation Count (chỉ nếu có startedAt)
                    if (data.startedAt) {
                        const savedViolations = localStorage.getItem(`exam_${id}_violations`);
                        if (savedViolations) {
                            setViolationCount(parseInt(savedViolations));
                        }
                    } else {
                        // Bài thi mới - Reset violation count
                        setViolationCount(0);
                    }

                } else {
                    const err = await res.json();
                    if (err.submitted) {
                        alert(err.error || 'Bài thi đã được nộp.');
                        if (err.resultId) {
                            router.replace(`/exam/results/${err.resultId}`);
                        } else {
                            router.replace('/');
                        }
                    } else {
                        alert(err.error || 'Lỗi tải đề thi');
                        router.replace('/exam');
                    }
                }
            } catch (error) {
                console.error('Error', error);
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [id, router]);

    // Anti-Cheating Logic
    useEffect(() => {
        if (!isExamStarted || submitting || submitError || sessionConflict) return;
        if (exam?.type === 'PRACTICE' || isMobileDevice()) return; // Disable for practice exams & mobile

        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleViolation("Bạn đã rời khỏi màn hình làm bài!");
            }
        };

        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            if (!isFull) {
                handleViolation("Bạn đã thoát chế độ toàn màn hình!");
            }
        };

        const handleBlur = () => {
            if (document.fullscreenElement) {
                handleViolation("Bạn đã rời khỏi màn hình làm bài (mất tiêu điểm)!");
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        window.addEventListener("blur", handleBlur);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            window.removeEventListener("blur", handleBlur);
        };
    }, [isExamStarted, submitting, submitError, violationCount, exam, isLocked]);

    const lockExam = async () => {
        setIsLocked(true);
        try {
            await fetch('/api/exam-runner/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resultId: exam.resultId }),
            });
        } catch (error) {
            console.error('Error locking exam', error);
        }
    };

    const handleViolation = (message: string) => {
        if (isLocked) return;

        const newCount = violationCount + 1;
        setViolationCount(newCount);
        localStorage.setItem(`exam_${id}_violations`, newCount.toString());

        const maxViolations = exam.max_violations || 3;

        if (newCount >= maxViolations) {
            alert(`Bạn đã vi phạm đến giới hạn quy định (${maxViolations} lần). Bài thi sẽ bị KHÓA và TỰ ĐỘNG NỘP BÀI.`);
            lockExam();
            // Tự động nộp bài sau khi khóa
            setTimeout(() => {
                handleSubmit();
            }, 1000); // Đợi 1 giây để lockExam() hoàn thành
        } else {
            alert(`${message}\nSố lần vi phạm: ${newCount}/${maxViolations}`);
        }
    };

    const isMobileDevice = () => {
        // Check if touch device or mobile user agent
        if (typeof navigator === 'undefined') return false;
        const hasTouch = navigator.maxTouchPoints > 0;
        const isMobileUA = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
        return hasTouch || isMobileUA;
    };

    const startExam = () => {
        if (exam?.type === 'PRACTICE' || isMobileDevice()) {
            setIsExamStarted(true);
            setIsFullscreen(true); // pretend fullscreen to bypass warning
            return;
        }

        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen().then(() => {
                setIsExamStarted(true);
                setIsFullscreen(true);
            }).catch((err) => {
                alert(`Không thể vào chế độ toàn màn hình: ${err.message}`);
            });
        }
    };

    // Timer Countdown
    useEffect(() => {
        if (loading || submitting || submitError || !isExamStarted || sessionConflict) return;
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }

        const timer = setInterval(() => {
            // Recalculate time left based on server time
            const endTimeStr = localStorage.getItem(`exam_${id}_endTime`);
            if (endTimeStr) {
                const endTime = parseInt(endTimeStr);
                const serverNow = Date.now() + timeOffset;
                const remaining = Math.floor((endTime - serverNow) / 1000);

                if (remaining <= 0) {
                    clearInterval(timer);
                    handleSubmit();
                    setTimeLeft(0);
                } else {
                    setTimeLeft(remaining);
                }
            } else {
                // Fallback to simple countdown if no endTime
                setTimeLeft((prev: number) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, loading, submitting, submitError, isExamStarted, timeOffset]);

    // Sync Progress
    const syncProgress = async (currentAnswers: any) => {
        try {
            const token = sessionToken || localStorage.getItem(`exam_${id}_sessionToken`);
            const res = await fetch('/api/exam-runner/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examId: id, answers: currentAnswers, sessionToken: token }),
            });

            if (res.status === 409) {
                setSessionConflict(true);
                return;
            }
        } catch (error) {
            console.error('Error syncing progress', error);
        }
    };

    // Auto-save Answers
    const handleAnswerChange = (qId: string, value: string, isMultiple: boolean) => {
        setAnswers((prev: { [key: string]: string[] }) => {
            let newAnswers;
            if (isMultiple) {
                const current = prev[qId] || [];
                if (current.includes(value)) {
                    newAnswers = { ...prev, [qId]: current.filter(v => v !== value) };
                } else {
                    newAnswers = { ...prev, [qId]: [...current, value] };
                }
            } else {
                newAnswers = { ...prev, [qId]: [value] };
            }

            localStorage.setItem(`exam_${id}_answers`, JSON.stringify(newAnswers));
            syncProgress(newAnswers); // Sync to server
            return newAnswers;
        });
    };

    const handleSubmit = async () => {
        if (submitting) return;
        setSubmitting(true);
        setSubmitError(false);

        // Exit fullscreen if active
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }

        try {
            const res = await fetch(`/api/exam-runner/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers, sessionToken: sessionToken || localStorage.getItem(`exam_${id}_sessionToken`) }),
            });

            if (res.status === 409) {
                setSessionConflict(true);
                return;
            }

            if (res.ok) {
                const data = await res.json();
                alert(`Nộp bài thành công! Điểm số: ${parseFloat(data.score).toFixed(1)}/10`);
                // Fix: Match keys with load/save logic
                localStorage.removeItem(`exam_${id}_answers`);
                localStorage.removeItem(`exam_${id}_endTime`);
                localStorage.removeItem(`exam_${id}_violations`);
                localStorage.removeItem(`exam_${id}_sessionToken`); // Clear session token for retakes
                router.replace(`/exam/results/${data.resultId}`);
            } else {
                const data = await res.json();
                alert(data.error || 'Lỗi khi nộp bài');
                setSubmitting(false);
                setSubmitError(true);
            }
        } catch (error) {
            console.error('Error submitting', error);
            alert('Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.');
            setSubmitting(false);
            setSubmitError(true);
        }
    };

    // Format Time
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Prevent Right Click & Copy
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        const handleCopy = (e: ClipboardEvent) => e.preventDefault();

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('cut', handleCopy);
        document.addEventListener('paste', handleCopy);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('cut', handleCopy);
            document.removeEventListener('paste', handleCopy);
        };
    }, []);

    // Scroll to Question
    const scrollToQuestion = (index: number) => {
        const element = document.getElementById(`question-${index}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    if (loading) return <div className="p-8 text-center">Đang tải đề thi...</div>;
    if (!exam) return null; // Prevent crash if exam failed to load but component is still mounted

    if (!isExamStarted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded shadow-lg max-w-md w-full text-center">
                    <h1 className="text-2xl font-bold text-blue-800 mb-4">{exam.title}</h1>
                    <div className="text-left bg-yellow-50 p-4 rounded border border-yellow-200 mb-6 text-sm text-yellow-800">
                        <p className="font-bold mb-2">Quy định thi:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            {exam.type === 'PRACTICE' || isMobileDevice() ? (
                                <li>Đây là đề thi, bạn hãy tập trung làm bài.</li>
                            ) : (
                                <>
                                    <li>Bài thi yêu cầu chế độ <strong>Toàn màn hình</strong>.</li>
                                    <li>Không được chuyển tab hoặc mở ứng dụng khác.</li>
                                    <li>Số lần vi phạm tối đa: <strong>{exam.max_violations || 3}</strong>.</li>
                                    <li>Nếu vi phạm quá số lần quy định, bài thi sẽ bị <strong>nộp tự động</strong>.</li>
                                </>
                            )}
                        </ul>
                    </div>
                    <button
                        onClick={startExam}
                        onTouchEnd={(e) => { e.preventDefault(); startExam(); }}
                        className="w-full bg-blue-600 text-white py-4 rounded font-bold hover:bg-blue-700 active:bg-blue-800 transition-colors text-lg"
                    >
                        Bắt đầu làm bài
                    </button>
                </div>
            </div>
        );
    }

    if (sessionConflict) {
        return (
            <div className="fixed inset-0 bg-gray-900 z-[110] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full text-center">
                    <div className="text-yellow-600 text-6xl mb-4">🔄</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Phiên làm việc bị gián đoạn!</h2>
                    <p className="text-gray-600 mb-6">
                        Tài khoản của bạn đang được đăng nhập hoặc làm bài ở một cửa sổ/thiết bị khác.
                        <br />
                        Vui lòng tải lại trang để tiếp tục phiên làm việc tại đây.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition-colors"
                    >
                        Tải lại trang & Tiếp tục
                    </button>
                    <button
                        onClick={() => router.push('/exam')}
                        className="w-full mt-3 bg-gray-200 text-gray-700 py-3 rounded font-bold hover:bg-gray-300 transition-colors"
                    >
                        Quay lại trang chủ
                    </button>
                </div>
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="fixed inset-0 bg-gray-900 z-[100] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full text-center">
                    <div className="text-red-600 text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Bài thi bị khóa!</h2>
                    <p className="text-gray-600 mb-6">
                        Bạn đã vi phạm quy chế thi (thoát toàn màn hình hoặc chuyển tab).
                        <br />
                        Vui lòng liên hệ Giám thị để được mở khóa.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition-colors"
                    >
                        Đã được mở khóa? Tải lại trang
                    </button>
                </div>
            </div>
        );
    }

    if (isExamStarted && !isFullscreen && !submitting && !submitError && exam?.type !== 'PRACTICE') {
        return (
            <div className="fixed inset-0 bg-gray-900 z-[100] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full text-center">
                    <div className="text-red-600 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Cảnh báo!</h2>
                    <p className="text-gray-600 mb-6">
                        Bạn đã thoát khỏi chế độ toàn màn hình. Vui lòng quay lại chế độ toàn màn hình để tiếp tục làm bài.
                    </p>
                    <button
                        onClick={() => {
                            document.documentElement.requestFullscreen().then(() => {
                                setIsFullscreen(true);
                            }).catch(err => alert(err.message));
                        }}
                        className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition-colors"
                    >
                        Tiếp tục làm bài
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 select-none flex flex-col">
            {/* Header / Timer */}
            <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 px-4 sm:px-8 py-3">
                <div className="flex justify-between items-center">
                    {/* Left: Exam Title + User Info */}
                    <div className="flex-1 min-w-0 mr-4">
                        <h1 className="text-lg sm:text-xl font-bold text-blue-800 truncate">{exam.title}</h1>
                        <div className="flex items-center gap-3 text-xs mt-1">
                            <span className="text-gray-700">
                                <span className="font-semibold">Thí sinh:</span> {userInfo?.full_name || userInfo?.username}
                            </span>
                            {userInfo?.username && (
                                <span className="text-gray-600">
                                    ({userInfo.username})
                                </span>
                            )}
                            {userInfo?.department && (
                                <span className="text-gray-600 hidden sm:inline">
                                    • {userInfo.department}
                                </span>
                            )}
                            <span className="text-red-600 font-bold ml-auto sm:ml-0">
                                Vi phạm: {violationCount}/{exam.max_violations || 3}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className={`text-2xl font-mono font-bold ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                            {formatTime(timeLeft)}
                        </div>
                        <button
                            onClick={() => {
                                const unanswered = questions.length - Object.keys(answers).length;
                                if (unanswered > 0) {
                                    if (!confirm(`Bạn còn ${unanswered} câu chưa làm. Bạn có chắc muốn nộp bài?`)) return;
                                } else {
                                    if (!confirm('Bạn có chắc muốn nộp bài sớm?')) return;
                                }
                                handleSubmit();
                            }}
                            disabled={submitting}
                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
                        >
                            {submitting ? 'Đang nộp...' : 'Nộp bài'}
                        </button>
                    </div>
                </div>
                {/* Progress Bar (Optional - keeping it as a secondary indicator) */}
                <div className="w-full bg-gray-200 rounded-full h-1.5 absolute bottom-0 left-0">
                    <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="pt-28 pb-12 max-w-7xl mx-auto px-4 w-full flex-1 flex gap-6">

                {/* Questions Column */}
                <div className="flex-1 space-y-6">
                    {questions.map((q, index) => {
                        let opts: any = {};
                        try {
                            opts = JSON.parse(q.options);
                        } catch (e) {
                            opts = {};
                        }

                        return (
                            <div key={q.id} id={`question-${index}`} className="bg-white p-6 rounded shadow scroll-mt-32">
                                <div className="flex space-x-3 mb-4">
                                    <span className="font-bold text-gray-700 whitespace-nowrap">Câu {index + 1}:</span>
                                    <div className="text-gray-900">
                                        {q.content}
                                        {q.isMultiple && (
                                            <span className="text-sm text-blue-600 font-style-italic ml-2">
                                                (Câu hỏi có nhiều đáp án)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3 ml-10">
                                    {q.shuffledOptions && q.shuffledOptions.map((opt: any, optIndex: number) => {
                                        const displayLabel = getOptionLabel(optIndex);
                                        return (
                                            <label key={opt.key} className="flex items-start space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                                <input
                                                    type={q.isMultiple ? "checkbox" : "radio"}
                                                    name={`question-${q.id}`}
                                                    checked={answers[q.id]?.includes(opt.key) || false}
                                                    onChange={() => handleAnswerChange(q.id, opt.key, q.isMultiple)}
                                                    className={`mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 ${!q.isMultiple ? 'rounded-full' : 'rounded'}`}
                                                />
                                                <span className="text-gray-800 leading-6">
                                                    <span className="font-bold mr-2">{displayLabel}.</span>
                                                    {opt.content}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Question Palette Sidebar */}
                <div className="hidden lg:block w-80 shrink-0">
                    <div className="bg-white p-4 rounded shadow sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto">
                        <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Danh sách câu hỏi</h3>

                        <div className="mb-4 text-sm text-gray-600 flex justify-between">
                            <span>Đã làm: <span className="font-bold text-green-600">{Object.keys(answers).length}</span></span>
                            <span>Chưa làm: <span className="font-bold text-gray-500">{questions.length - Object.keys(answers).length}</span></span>
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                            {questions.map((q, index) => {
                                const isAnswered = answers[q.id] && answers[q.id].length > 0;
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => scrollToQuestion(index)}
                                        className={`
                                            h-10 w-10 rounded flex items-center justify-center text-sm font-medium transition-colors
                                            ${isAnswered
                                                ? 'bg-green-100 text-green-800 border-green-300 border hover:bg-green-200'
                                                : 'bg-gray-100 text-gray-600 border-gray-200 border hover:bg-gray-200'
                                            }
                                        `}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
