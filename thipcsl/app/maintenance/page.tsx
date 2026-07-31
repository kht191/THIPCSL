export default function MaintenancePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="max-w-2xl w-full mx-4">
                <div className="bg-white shadow-2xl rounded-2xl p-8 md:p-12">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <svg
                                className="h-20 w-20 text-yellow-500 animate-pulse"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <div className="absolute -top-1 -right-1">
                                <span className="flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500"></span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
                        Hệ Thống Đang Bảo Trì
                    </h1>

                    {/* Description */}
                    <p className="text-lg text-gray-600 mb-8 text-center">
                        Hệ thống đang được nâng cấp để phục vụ quý thầy cô và học viên tốt hơn.
                    </p>

                    {/* Info Box */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-semibold text-blue-900 mb-1">
                                    ⏰ Thời gian dự kiến
                                </p>
                                <p className="text-blue-800">
                                    23:00 - 01:00
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-blue-900 mb-1">
                                    🔧 Trạng thái
                                </p>
                                <p className="text-blue-800">
                                    Đang nâng cấp database...
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
                        <h2 className="text-lg font-semibold text-green-900 mb-3">
                            ✨ Cải tiến sau nâng cấp:
                        </h2>
                        <ul className="space-y-2 text-green-800">
                            <li className="flex items-start">
                                <svg className="h-5 w-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Hỗ trợ nhiều người dùng đồng thời hơn (100+ users)</span>
                            </li>
                            <li className="flex items-start">
                                <svg className="h-5 w-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Hiệu suất tốt hơn, tải trang nhanh hơn</span>
                            </li>
                            <li className="flex items-start">
                                <svg className="h-5 w-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Ổn định hơn, giảm lỗi khi nhiều người thi</span>
                            </li>
                            <li className="flex items-start">
                                <svg className="h-5 w-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Sẵn sàng cho quy mô lớn hơn</span>
                            </li>
                        </ul>
                    </div>

                    {/* Footer */}
                    <div className="text-center">
                        <p className="text-gray-600 mb-4">
                            Vui lòng quay lại sau khi bảo trì hoàn tất.
                        </p>
                        <p className="text-sm text-gray-500">
                            Xin cảm ơn quý thầy cô và học viên đã kiên nhẫn chờ đợi! 🙏
                        </p>
                    </div>

                    {/* Progress indicator */}
                    <div className="mt-8">
                        <div className="flex justify-center space-x-2">
                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                </div>

                {/* Contact info (optional) */}
                <div className="mt-6 text-center text-sm text-gray-600">
                    <p>
                        Nếu có thắc mắc, vui lòng liên hệ: <span className="font-semibold">admin@example.com</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
