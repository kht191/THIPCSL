'use client';

import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function StatisticsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    // Filters
    const [selectedSession, setSelectedSession] = useState('');
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'passed', 'failed'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchSessions();
        fetchExams();
    }, []);

    useEffect(() => {
        fetchStatistics();
    }, [selectedSession, startDate, endDate]);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/admin/sessions?limit=1000');
            if (res.ok) {
                const json = await res.json();
                setSessions(json.data || []);
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };

    const fetchExams = async () => {
        try {
            const res = await fetch('/api/admin/exams?limit=1000');
            if (res.ok) {
                const json = await res.json();
                setExams(json.data || []);
            }
        } catch (error) {
            console.error('Error fetching exams:', error);
        }
    };

    const fetchStatistics = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedSession) params.append('sessionId', selectedSession);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await fetch(`/api/admin/statistics?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);

                // Extract unique departments from both results and missing candidates
                const allDepts = [
                    ...(data.results || []).map((r: any) => r.department),
                    ...(data.missingCandidates || []).map((m: any) => m.department)
                ];
                const depts = [...new Set(allDepts)];
                setDepartments(depts.filter(Boolean) as string[]);
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    const displayStats = useMemo(() => {
        if (!stats) return null;

        let filteredResults = stats.results;
        let filteredMissing = stats.missingCandidates || [];

        // Apply filters
        if (filterStatus !== 'all') {
            filteredResults = filteredResults.filter((r: any) =>
                filterStatus === 'passed' ? r.is_passed : !r.is_passed
            );
            // Ẩn danh sách chưa thi nếu chỉ muốn xem Đạt / Không đạt
            filteredMissing = [];
        }

        if (selectedExam) {
            filteredResults = filteredResults.filter((r: any) => r.exam_title === selectedExam);
        }

        if (selectedDepartment) {
            filteredResults = filteredResults.filter((r: any) => r.department === selectedDepartment);
            // Lọc cả danh sách chưa thi theo đơn vị
            filteredMissing = filteredMissing.filter((m: any) => m.department === selectedDepartment);
        }

        const totalCandidates = filteredResults.length;

        if (totalCandidates === 0) {
            return {
                summary: {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    avgScore: 0,
                    maxScore: 0,
                    minScore: 0,
                    passRate: 0,
                },
                distribution: [],
                departmentStats: [],
                examStats: [],
                results: [],
                expectedCount: stats.expectedCount || 0,
                attemptedCount: stats.attemptedCount || 0,
                missingCount: filteredMissing.length,
                missingCandidates: filteredMissing,
            };
        }

        const passedCount = filteredResults.filter((r: any) => r.is_passed).length;
        const failedCount = totalCandidates - passedCount;
        const totalScore = filteredResults.reduce((sum: number, r: any) => sum + r.score, 0);
        const avgScore = totalScore / totalCandidates;
        const maxScore = Math.max(...filteredResults.map((r: any) => r.score));
        const minScore = Math.min(...filteredResults.map((r: any) => r.score));

        // Score distribution
        const distribution = [
            { range: '< 5', count: 0, percent: 0 },
            { range: '5 - 6.9', count: 0, percent: 0 },
            { range: '7 - 7.9', count: 0, percent: 0 },
            { range: '8 - 8.9', count: 0, percent: 0 },
            { range: '9 - 10', count: 0, percent: 0 },
        ];

        filteredResults.forEach((r: any) => {
            const s = r.score;
            if (s < 5) distribution[0].count++;
            else if (s < 7) distribution[1].count++;
            else if (s < 8) distribution[2].count++;
            else if (s < 9) distribution[3].count++;
            else distribution[4].count++;
        });

        distribution.forEach(d => {
            d.percent = parseFloat(((d.count / totalCandidates) * 100).toFixed(1));
        });

        // Department statistics (merge results + missing candidates)
        const deptMap = new Map<string, { total: number; passed: number; totalScore: number; missing: number }>();

        // Count actual results
        filteredResults.forEach((r: any) => {
            const dept = r.department || 'Không xác định';
            if (!deptMap.has(dept)) {
                deptMap.set(dept, { total: 0, passed: 0, totalScore: 0, missing: 0 });
            }
            const deptData = deptMap.get(dept)!;
            deptData.total++;
            if (r.is_passed) deptData.passed++;
            deptData.totalScore += r.score;
        });

        // Count missing candidates per department
        filteredMissing.forEach((m: any) => {
            const dept = m.department || 'Không xác định';
            if (!deptMap.has(dept)) {
                deptMap.set(dept, { total: 0, passed: 0, totalScore: 0, missing: 0 });
            }
            deptMap.get(dept)!.missing++;
        });

        const departmentStats = Array.from(deptMap.entries())
            .filter(([_, data]) => data.total > 0) // Chỉ hiện đơn vị có người đã thi
            .map(([dept, data]) => ({
            department: dept,
            expected: data.total + data.missing,
            attempted: data.total,
            missing: data.missing,
            passed: data.passed,
            failed: data.total - data.passed,
            passRate: data.total > 0 ? parseFloat(((data.passed / data.total) * 100).toFixed(1)) : 0,
            avgScore: data.total > 0 ? parseFloat((data.totalScore / data.total).toFixed(2)) : 0,
        })).sort((a, b) => b.expected - a.expected);

        // Exam statistics
        const examMap = new Map<string, { total: number; passed: number; totalScore: number }>();
        filteredResults.forEach((r: any) => {
            const exam = r.exam_title;
            if (!examMap.has(exam)) {
                examMap.set(exam, { total: 0, passed: 0, totalScore: 0 });
            }
            const examData = examMap.get(exam)!;
            examData.total++;
            if (r.is_passed) examData.passed++;
            examData.totalScore += r.score;
        });

        const examStats = Array.from(examMap.entries()).map(([exam, data]) => ({
            exam,
            total: data.total,
            passed: data.passed,
            failed: data.total - data.passed,
            passRate: parseFloat(((data.passed / data.total) * 100).toFixed(1)),
            avgScore: parseFloat((data.totalScore / data.total).toFixed(2)),
        })).sort((a, b) => b.total - a.total);

        return {
            summary: {
                total: totalCandidates,
                passed: passedCount,
                failed: failedCount,
                avgScore: parseFloat(avgScore.toFixed(2)),
                maxScore,
                minScore,
                passRate: parseFloat(((passedCount / totalCandidates) * 100).toFixed(1)),
            },
            distribution,
            departmentStats,
            examStats,
            results: filteredResults,
            expectedCount: stats.expectedCount || 0,
            attemptedCount: stats.attemptedCount || 0,
            missingCount: filteredMissing.length,
            missingCandidates: filteredMissing,
        };
    }, [stats, filterStatus, selectedExam, selectedDepartment]);

    const handleExportExcel = () => {
        if (!displayStats || !displayStats.results) return;

        const wb = XLSX.utils.book_new();

        // 1. Summary Sheet
        const summaryData = [
            ['BÁO CÁO THỐNG KÊ KẾT QUẢ THI'],
            ['Ngày xuất:', new Date().toLocaleString('vi-VN')],
            [''],
            ['TỔNG QUAN'],
            ['Tổng số thí sinh', displayStats.summary.total],
            ['Số lượng Đạt', displayStats.summary.passed],
            ['Số lượng Không Đạt', displayStats.summary.failed],
            ['Tỷ lệ Đạt (%)', displayStats.summary.passRate],
            ['Điểm trung bình', displayStats.summary.avgScore],
            ['Điểm cao nhất', displayStats.summary.maxScore],
            ['Điểm thấp nhất', displayStats.summary.minScore],
            [''],
            ['PHÂN BỐ ĐIỂM'],
            ['Khoảng điểm', 'Số lượng', 'Tỷ lệ (%)'],
            ...displayStats.distribution.map((d: any) => [d.range, d.count, d.percent]),
        ];

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng hợp");

        // 2. Department Stats
        if (displayStats.departmentStats.length > 0) {
            const deptData = displayStats.departmentStats.map((d: any) => ({
                'Đơn vị': d.department,
                'Tổng số': d.total,
                'Đạt': d.passed,
                'Không đạt': d.failed,
                'Tỷ lệ đạt (%)': d.passRate,
                'Điểm TB': d.avgScore,
            }));
            const wsDept = XLSX.utils.json_to_sheet(deptData);
            XLSX.utils.book_append_sheet(wb, wsDept, "Theo đơn vị");
        }

        // 3. Exam Stats
        if (displayStats.examStats.length > 0) {
            const examData = displayStats.examStats.map((e: any) => ({
                'Đề thi': e.exam,
                'Tổng số': e.total,
                'Đạt': e.passed,
                'Không đạt': e.failed,
                'Tỷ lệ đạt (%)': e.passRate,
                'Điểm TB': e.avgScore,
            }));
            const wsExam = XLSX.utils.json_to_sheet(examData);
            XLSX.utils.book_append_sheet(wb, wsExam, "Theo đề thi");
        }

        // 4. Details Sheet
        const detailsData = displayStats.results.map((r: any, index: number) => ({
            'STT': index + 1,
            'Họ và tên': r.full_name,
            'Mã nhân viên': r.username,
            'Đơn vị': r.department,
            'Ca thi': r.session_name,
            'Đề thi': r.exam_title,
            'Điểm số': r.score,
            'Kết quả': r.is_passed ? 'Đạt' : 'Không Đạt',
            'Thời gian nộp': new Date(r.submitted_at).toLocaleString('vi-VN'),
        }));

        const wsDetails = XLSX.utils.json_to_sheet(detailsData);
        XLSX.utils.book_append_sheet(wb, wsDetails, "Chi tiết");

        // 5. Missing Candidates Sheet
        if (displayStats.missingCandidates && displayStats.missingCandidates.length > 0) {
            const missingData = displayStats.missingCandidates.map((m: any, index: number) => ({
                'STT': index + 1,
                'Họ và tên': m.full_name || m.username,
                'Mã nhân viên': m.username,
                'Đơn vị': m.department,
            }));
            const wsMissing = XLSX.utils.json_to_sheet(missingData);
            XLSX.utils.book_append_sheet(wb, wsMissing, "Chưa thi");
        }

        XLSX.writeFile(wb, `Bao_cao_ket_qua_thi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleClearFilters = () => {
        setSelectedSession('');
        setSelectedExam('');
        setSelectedDepartment('');
        setFilterStatus('all');
        setStartDate('');
        setEndDate('');
    };

    if (loading && !stats) return <div className="p-8">Đang tải dữ liệu...</div>;

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Thống kê & Báo cáo</h1>
                    <p className="text-sm text-gray-500 mt-1">Chỉ thống kê đề thi chính thức (không bao gồm đề ôn tập)</p>
                </div>
                <button
                    onClick={handleExportExcel}
                    disabled={!displayStats || displayStats.summary.total === 0}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <span>📊</span> Xuất Excel
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Bộ lọc</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Ca thi</label>
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">-- Tất cả --</option>
                            {sessions.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Đề thi</label>
                        <select
                            value={selectedExam}
                            onChange={(e) => setSelectedExam(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">-- Tất cả --</option>
                            {[...new Set(stats?.results.map((r: any) => r.exam_title))].map((exam: any) => (
                                <option key={exam} value={exam}>{exam}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Đơn vị</label>
                        <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">-- Tất cả --</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Kết quả</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">-- Tất cả --</option>
                            <option value="passed">Đạt</option>
                            <option value="failed">Không Đạt</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Từ ngày</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Đến ngày</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={handleClearFilters}
                            className="w-full bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 text-sm"
                        >
                            Xóa lọc
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {selectedSession && (
                    <>
                        <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
                            <p className="text-xs text-gray-500 uppercase font-medium">Tổng dự kiến</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{displayStats?.expectedCount || 0}</p>
                        </div>
                        <div className="bg-white p-4 rounded shadow border-l-4 border-orange-500">
                            <p className="text-xs text-gray-500 uppercase font-medium">Chưa thi</p>
                            <p className="text-2xl font-bold text-orange-600 mt-1">{displayStats?.missingCount || 0}</p>
                        </div>
                    </>
                )}
                <div className="bg-white p-4 rounded shadow border-l-4 border-cyan-500">
                    <p className="text-xs text-gray-500 uppercase font-medium">Đã thi</p>
                    <p className="text-2xl font-bold text-cyan-600 mt-1">{displayStats?.summary.total || 0}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
                    <p className="text-xs text-gray-500 uppercase font-medium">Tỷ lệ Đạt</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{displayStats?.summary.passRate || 0}%</p>
                    <p className="text-xs text-gray-400 mt-1">{displayStats?.summary.passed || 0} / {displayStats?.summary.total || 0}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-yellow-500">
                    <p className="text-xs text-gray-500 uppercase font-medium">Điểm TB</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">{displayStats?.summary.avgScore || 0}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-purple-500">
                    <p className="text-xs text-gray-500 uppercase font-medium">Cao / Thấp nhất</p>
                    <div className="flex justify-between items-baseline mt-1">
                        <span className="text-lg font-bold text-purple-600">{displayStats?.summary.maxScore || 0}</span>
                        <span className="text-sm text-gray-500">/ {displayStats?.summary.minScore || 0}</span>
                    </div>
                </div>
            </div>

            {/* Distribution Table */}
            <div className="bg-white rounded shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700">Phân bố điểm</h3>
                </div>
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Khoảng điểm</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tỷ lệ (%)</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Biểu đồ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {displayStats?.distribution.map((d: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900">{d.range}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">{d.count}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 text-right">{d.percent}%</td>
                                <td className="px-4 py-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{ width: `${d.percent}%` }}
                                        ></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Department Stats */}
            {displayStats && displayStats.departmentStats.length > 0 && (
                <div className="bg-white rounded shadow overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700">Thống kê theo đơn vị</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                                    {selectedSession && (
                                        <>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Dự kiến</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Chưa thi</th>
                                        </>
                                    )}
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Đã thi</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Đạt</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">K.đạt</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tỷ lệ</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Điểm TB</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {displayStats.departmentStats.map((d: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-900">{d.department}</td>
                                        {selectedSession && (
                                            <>
                                                <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">{d.expected}</td>
                                                <td className="px-4 py-2 text-sm text-orange-600 text-right">{d.missing}</td>
                                            </>
                                        )}
                                        <td className="px-4 py-2 text-sm text-blue-600 text-right">{d.attempted}</td>
                                        <td className="px-4 py-2 text-sm text-green-600 text-right font-medium">{d.passed}</td>
                                        <td className="px-4 py-2 text-sm text-red-600 text-right">{d.failed}</td>
                                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">{d.passRate}%</td>
                                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{d.avgScore}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Exam Stats */}
            {displayStats && displayStats.examStats.length > 0 && (
                <div className="bg-white rounded shadow overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700">Thống kê theo đề thi</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đề thi</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tổng số</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Đạt</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Không đạt</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Tỷ lệ đạt</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Điểm TB</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {displayStats.examStats.map((e: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-900">{e.exam}</td>
                                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{e.total}</td>
                                        <td className="px-4 py-2 text-sm text-green-600 text-right font-medium">{e.passed}</td>
                                        <td className="px-4 py-2 text-sm text-red-600 text-right">{e.failed}</td>
                                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">{e.passRate}%</td>
                                        <td className="px-4 py-2 text-sm text-gray-900 text-right">{e.avgScore}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Missing candidates (chưa thi) */}
            {displayStats && displayStats.missingCount > 0 && (
                <div className="bg-white rounded shadow overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700">Danh sách chưa thi ({displayStats.missingCount})</h3>
                        <p className="text-xs text-gray-500 mt-1">Dự kiến: {displayStats.expectedCount} — Đã thi: {displayStats.attemptedCount}</p>
                    </div>
                    <div className="overflow-x-auto max-h-64">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mã NV</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {displayStats.missingCandidates.map((m: any, idx: number) => (
                                    <tr key={m.id || idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-900">{m.full_name || m.username}</td>
                                        <td className="px-4 py-2 text-sm text-gray-500">{m.username}</td>
                                        <td className="px-4 py-2 text-sm text-gray-500">{m.department}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detailed List */}
            <div className="bg-white rounded shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-700">Danh sách chi tiết ({displayStats?.results.length || 0})</h3>
                </div>
                <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Họ tên</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mã NV</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đề thi</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Điểm</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Kết quả</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {displayStats?.results.map((r: any) => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm text-gray-900">{r.full_name}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500">{r.username}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500">{r.department}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500">{r.exam_title}</td>
                                    <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">{r.score}</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${r.is_passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {r.is_passed ? 'Đạt' : 'Không đạt'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {displayStats?.results.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        Không có dữ liệu
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
