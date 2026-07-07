'use client';

import { useEffect, useState } from 'react';
import { reports as reportsApi } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { BarChart3, Loader2 } from 'lucide-react';

export default function ReportsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        reportsApi
            .get()
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) return <p className="text-zinc-500">Could not load reports.</p>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-8 h-8 text-primary" />
                    Reports
                </h1>
                <p className="text-zinc-500">Sales, collections, and top products</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs font-bold text-zinc-500 uppercase">Total collected</p>
                    <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                        {formatINR(data.summary.total_collected)}
                    </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs font-bold text-zinc-500 uppercase">Pending amount</p>
                    <p className="text-2xl font-bold text-amber-600 tabular-nums">
                        {formatINR(data.summary.pending_amount)}
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-4 border-b font-bold">Sales by salon</div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-left text-xs uppercase text-zinc-500">
                            <th className="px-4 py-3">Salon</th>
                            <th className="px-4 py-3">Orders</th>
                            <th className="px-4 py-3">Sales</th>
                            <th className="px-4 py-3">Paid</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {data.sales_by_salon.map((r: any) => (
                            <tr key={r.id}>
                                <td className="px-4 py-3 font-medium">{r.salon_name}</td>
                                <td className="px-4 py-3">{r.order_count}</td>
                                <td className="px-4 py-3">{formatINR(r.total_sales)}</td>
                                <td className="px-4 py-3">{formatINR(r.paid_sales)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border overflow-hidden">
                    <div className="p-4 border-b font-bold">By salesman</div>
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {data.sales_by_salesman.map((r: any) => (
                            <li key={r.id} className="px-4 py-3 flex justify-between text-sm">
                                <span>{r.name}</span>
                                <span className="font-bold">{formatINR(r.total_sales)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border overflow-hidden">
                    <div className="p-4 border-b font-bold">Top products</div>
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {data.top_products.map((r: any) => (
                            <li key={r.id} className="px-4 py-3 flex justify-between text-sm">
                                <span>
                                    {r.name} <span className="text-zinc-400">×{r.units_sold}</span>
                                </span>
                                <span className="font-bold">{formatINR(r.revenue)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
