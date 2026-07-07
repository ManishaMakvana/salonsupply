'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/lib/pagination';

type PaginationProps = {
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
    className?: string;
};

export function Pagination({ pagination, onPageChange, className = '' }: PaginationProps) {
    const { page, totalPages, total, limit } = pagination;
    if (totalPages <= 1) return null;

    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    return (
        <div
            className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 ${className}`}
        >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Showing {start}–{end} of {total}
            </p>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-bold disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                </button>
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 px-2">
                    {page} / {totalPages}
                </span>
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-bold disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                    Next
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
