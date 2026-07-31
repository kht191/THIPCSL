'use client';
import { useState, useEffect } from 'react';

export default function MobileSidebar({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    // Close sidebar on route change (click on a link)
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('a') && open) {
                setOpen(false);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [open]);

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <>
            {/* Hamburger button - only visible below md */}
            <button
                onClick={() => setOpen(true)}
                className="fixed top-3 left-3 z-50 md:hidden bg-gray-800 text-white p-2.5 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
                aria-label="Mở menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Overlay - closes sidebar, only below md */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sidebar: off-screen below md, visible from md upwards */}
            <aside className={`w-64 bg-gray-800 text-white p-6 print:hidden fixed md:static inset-y-0 left-0 z-40 transform transition-transform duration-200 overflow-y-auto ${
                open ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0`}>
                {children}
            </aside>
        </>
    );
}
