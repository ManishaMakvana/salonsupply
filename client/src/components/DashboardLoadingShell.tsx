'use client';

import { Loader2, Scissors } from 'lucide-react';

export function DashboardLoadingShell() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
            <div className="bg-primary p-3 rounded-2xl text-white">
                <Scissors className="w-8 h-8" />
            </div>
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading dashboard…</p>
        </div>
    );
}
