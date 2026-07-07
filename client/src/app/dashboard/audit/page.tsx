'use client';

import { useEffect, useState } from 'react';
import { audit as auditApi } from '@/lib/api';
import { isPaginated, type PaginationMeta } from '@/lib/pagination';
import { Pagination } from '@/components/ui/Pagination';
import { Loader2, Shield } from 'lucide-react';

export default function AuditPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [listLoading, setListLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);

    useEffect(() => {
        if (page === 1 && logs.length === 0) setLoading(true);
        else setListLoading(true);

        auditApi
            .getLogs({ page, limit: 20 })
            .then((res) => {
                if (isPaginated(res)) {
                    setLogs(res.data);
                    setPagination(res.pagination);
                } else {
                    setLogs(res as any[]);
                    setPagination(null);
                }
            })
            .catch(console.error)
            .finally(() => {
                setLoading(false);
                setListLoading(false);
            });
    }, [page]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary" />
                Audit log
            </h1>
            <p className="text-zinc-500">Who changed orders and recorded payments</p>

            <div
                className={`bg-white dark:bg-zinc-900 rounded-3xl border overflow-hidden transition-opacity ${
                    listLoading ? 'opacity-60' : ''
                }`}
            >
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-left text-xs uppercase text-zinc-500">
                            <th className="px-4 py-3">When</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                                    No audit entries yet
                                </td>
                            </tr>
                        ) : (
                            logs.map((l) => (
                                <tr key={l.id}>
                                    <td className="px-4 py-3 whitespace-nowrap" suppressHydrationWarning>
                                        {new Date(l.created_at).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3">
                                        {l.user_name || '—'}
                                        <span className="text-zinc-400 text-xs block">{l.user_role}</span>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{l.action}</td>
                                    <td className="px-4 py-3 text-xs text-zinc-500 max-w-md truncate">
                                        {typeof l.details === 'string'
                                            ? l.details
                                            : JSON.stringify(l.details)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {pagination && (
                    <div className="px-4 pb-4">
                        <Pagination pagination={pagination} onPageChange={setPage} />
                    </div>
                )}
            </div>
        </div>
    );
}
