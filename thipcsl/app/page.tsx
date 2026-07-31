import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Hệ thống Thi Trực Tuyến</h1>
        <p className="text-xl text-gray-600 mb-8">Chào mừng bạn đến với hệ thống kiểm tra năng lực.</p>

        <Link
          href="/login"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Đăng nhập để bắt đầu
        </Link>
      </div>
    </div>
  );
}
