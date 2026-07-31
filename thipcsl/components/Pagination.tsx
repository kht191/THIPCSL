'use client';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    // Simple pagination logic: show all if <= 7, otherwise show start, end, and current neighborhood
    // For simplicity, let's just show a simple list or a limited window.
    // Let's stick to a simple window for now: Prev, Next, and pages.

    for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
    }

    // Better logic for many pages
    const getVisiblePages = () => {
        if (totalPages <= 7) return pages;
        if (currentPage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
        if (currentPage >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    };

    const visiblePages = getVisiblePages();

    return (
        <div className="flex justify-center items-center gap-1 mt-4 flex-wrap">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm"
            >
                Trước
            </button>
            {visiblePages.map((page, index) => (
                <button
                    key={index}
                    onClick={() => typeof page === 'number' && onPageChange(page)}
                    disabled={page === '...'}
                    className={`px-3 py-1 border rounded text-sm ${currentPage === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-black'} ${page === '...' ? 'cursor-default border-none hover:bg-transparent' : ''}`}
                >
                    {page}
                </button>
            ))}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm"
            >
                Sau
            </button>
        </div>
    );
}
