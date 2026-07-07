'use client';

import { useState, useEffect } from 'react';
import { payments as paymentsApi } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { CreditCard, Loader2, Info, Banknote, Smartphone, Building2, X, CheckCircle2 } from 'lucide-react';

type UnpaidOrder = {
    id: number;
    order_number: string;
    total_amount: number | string;
    paid_amount?: number | string;
    status: string;
    salon_name: string;
};

type PaymentQueue = {
    ready_to_collect: UnpaidOrder[];
    awaiting_approval: UnpaidOrder[];
};

export default function PaymentsPage() {
    const [user, setUser] = useState<{ role: string } | null>(null);
    const [summary, setSummary] = useState({ total_collected: 0, pending_amount: 0, order_count: 0 });
    const [payments, setPayments] = useState<any[]>([]);
    const [queue, setQueue] = useState<PaymentQueue>({ ready_to_collect: [], awaiting_approval: [] });
    const [loading, setLoading] = useState(true);
    const [recording, setRecording] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [recordModal, setRecordModal] = useState<UnpaidOrder | null>(null);
    const [form, setForm] = useState({
        amount: '',
        payment_method: 'cash' as 'cash' | 'upi' | 'bank_transfer',
        reference: '',
        notes: '',
    });

    const canRecord = user?.role === 'distributor' || user?.role === 'salesman' || user?.role === 'super_admin';

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) setUser(JSON.parse(stored));
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [s, p, u] = await Promise.all([
                paymentsApi.getSummary(),
                paymentsApi.getAll(),
                paymentsApi.getUnpaidOrders(),
            ]);
            setSummary(s);
            setPayments(Array.isArray(p) ? p : p.data ?? []);
            if (Array.isArray(u)) {
                setQueue({ ready_to_collect: u, awaiting_approval: [] });
            } else {
                setQueue(u as PaymentQueue);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openRecordModal = (order: UnpaidOrder) => {
        const due =
            parseFloat(String(order.total_amount)) - parseFloat(String(order.paid_amount || 0));
        setRecordModal(order);
        setForm({
            amount: String(Math.max(0, due)),
            payment_method: 'cash',
            reference: '',
            notes: '',
        });
        setSuccessMsg(null);
    };

    const submitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recordModal) return;
        setRecording(true);
        setSuccessMsg(null);
        try {
            const result = await paymentsApi.record({
                order_id: recordModal.id,
                amount: parseFloat(form.amount),
                payment_method: form.payment_method,
                reference: form.reference || undefined,
                notes: form.notes || undefined,
            });
            setSuccessMsg(
                result.payment_status === 'paid'
                    ? 'Payment confirmed — order is fully paid.'
                    : `Partial payment saved. Balance remaining: ${formatINR(result.balance_remaining ?? 0)}`
            );
            await loadData();
            setTimeout(() => {
                setRecordModal(null);
                setSuccessMsg(null);
            }, 1800);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to record payment');
        } finally {
            setRecording(false);
        }
    };

    const methodIcon = (m: string) => {
        if (m === 'upi') return <Smartphone className="w-4 h-4" />;
        if (m === 'bank_transfer') return <Building2 className="w-4 h-4" />;
        return <Banknote className="w-4 h-4" />;
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Payments</h1>
                    <p className="text-zinc-500">Offline collections — you confirm when money is received.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 min-w-[140px]">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Total Collected</p>
                        <p className="text-xl font-bold">{loading ? '...' : formatINR(summary.total_collected)}</p>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 min-w-[140px]">
                        <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Pending Amount</p>
                        <p className="text-xl font-bold">{loading ? '...' : formatINR(summary.pending_amount)}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl text-sm text-blue-800 dark:text-blue-200">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-2">
                    <p className="font-bold">How offline payment works</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
                        <li>Salon pays you in <strong>cash, UPI, or bank transfer</strong> (outside this app).</li>
                        <li>Distributor approves the order on <strong>Orders</strong> → Confirmed → Delivered.</li>
                        <li>
                            {canRecord
                                ? 'You tap Record payment and enter amount + method. That is your proof the money was received.'
                                : 'Your distributor or salesman records payment after they receive money.'}
                        </li>
                        <li>Order <strong>payment status</strong> becomes Paid — visible on Orders with tracking.</li>
                    </ol>
                    <p className="text-xs opacity-90">
                        There is no automatic bank hook-up. Success = you manually confirm collection here.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {queue.awaiting_approval.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-200 dark:border-amber-800 p-6">
                            <h2 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-2">
                                Waiting for order approval
                            </h2>
                            <p className="text-sm text-amber-800 dark:text-amber-300 mb-4">
                                These orders are not ready for payment yet. Approve them on Orders first.
                            </p>
                            <div className="space-y-2">
                                {queue.awaiting_approval.map((o) => (
                                    <div
                                        key={o.id}
                                        className="flex justify-between items-center p-3 bg-white/60 dark:bg-zinc-900/40 rounded-xl text-sm"
                                    >
                                        <span className="font-medium">
                                            {o.salon_name} · {o.order_number}
                                        </span>
                                        <span className="text-amber-700 font-bold uppercase text-xs">Pending approval</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {canRecord && (
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6">
                            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-primary" />
                                Record payment
                            </h2>
                            <p className="text-sm text-zinc-500 mb-4">
                                Orders that are approved or delivered and still unpaid.
                            </p>
                            {queue.ready_to_collect.length === 0 ? (
                                <p className="text-sm text-zinc-500 py-6 text-center">
                                    No orders ready to collect. Approve pending orders on Orders, then return here.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {queue.ready_to_collect.map((o) => {
                                        const due =
                                            parseFloat(String(o.total_amount)) -
                                            parseFloat(String(o.paid_amount || 0));
                                        return (
                                            <div
                                                key={o.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl"
                                            >
                                                <div>
                                                    <p className="font-bold">
                                                        {o.salon_name} · {o.order_number}
                                                    </p>
                                                    <p className="text-sm text-zinc-500">
                                                        Order: {o.status} · Due: {formatINR(due)}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => openRecordModal(o)}
                                                    className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90 shrink-0"
                                                >
                                                    Confirm payment received
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {!canRecord && user?.role === 'salon' && (
                        <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border text-sm text-zinc-600">
                            Pay your distributor offline. They will mark the order as paid here after they receive payment.
                        </div>
                    )}

                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                            <h2 className="font-bold">Payment history</h2>
                            <p className="text-xs text-zinc-500 mt-1">Each row is a confirmed offline collection</p>
                        </div>
                        {payments.length === 0 ? (
                            <p className="p-12 text-center text-zinc-500">No payments recorded yet.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-50 dark:bg-zinc-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Date</th>
                                        <th className="px-6 py-3 text-left">Order</th>
                                        <th className="px-6 py-3 text-left">Salon</th>
                                        <th className="px-6 py-3 text-left">Amount</th>
                                        <th className="px-6 py-3 text-left">Method</th>
                                        <th className="px-6 py-3 text-left">Reference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((p) => (
                                        <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                                            <td className="px-6 py-3 text-zinc-500">
                                                {new Date(p.payment_date).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-3 font-medium">{p.order_number}</td>
                                            <td className="px-6 py-3">{p.salon_name}</td>
                                            <td className="px-6 py-3 font-bold">{formatINR(p.amount)}</td>
                                            <td className="px-6 py-3 capitalize">
                                                <span className="inline-flex items-center gap-1.5">
                                                    {methodIcon(p.payment_method)}
                                                    {p.payment_method.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-xs text-zinc-500 max-w-[200px] truncate">
                                                {p.notes || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {recordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => !recording && setRecordModal(null)}
                    />
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl relative z-10 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold">Confirm payment received</h2>
                                <p className="text-sm text-zinc-500">
                                    {recordModal.salon_name} · {recordModal.order_number}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRecordModal(null)}
                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {successMsg ? (
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-2xl">
                                <CheckCircle2 className="w-6 h-6 shrink-0" />
                                <p className="text-sm font-medium">{successMsg}</p>
                            </div>
                        ) : (
                            <form onSubmit={submitPayment} className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                        Amount received (₹)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="w-full mt-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border rounded-xl dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Payment method</label>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {(
                                            [
                                                ['cash', 'Cash', Banknote],
                                                ['upi', 'UPI', Smartphone],
                                                ['bank_transfer', 'Bank', Building2],
                                            ] as const
                                        ).map(([val, label, Icon]) => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setForm({ ...form, payment_method: val })}
                                                className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border ${
                                                    form.payment_method === val
                                                        ? 'bg-primary text-white border-primary'
                                                        : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                        UPI / receipt reference (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={form.reference}
                                        onChange={(e) => setForm({ ...form, reference: e.target.value })}
                                        placeholder="e.g. UTR1234567890"
                                        className="w-full mt-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border rounded-xl dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Notes (optional)</label>
                                    <input
                                        type="text"
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        className="w-full mt-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border rounded-xl dark:text-white"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={recording}
                                    className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
                                >
                                    {recording ? 'Saving...' : 'Mark as paid — confirm received'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
