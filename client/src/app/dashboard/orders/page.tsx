'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { orders as ordersApi } from '@/lib/api';
import { isPaginated, type PaginationMeta } from '@/lib/pagination';
import { Pagination } from '@/components/ui/Pagination';
import { TableRowsSkeleton } from '@/components/ui/TableRowsSkeleton';
import { formatINR } from '@/lib/format';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Search, Filter, Eye, CheckCircle2, Clock, Truck, Loader2, Trash2, CreditCard, FileDown, RotateCcw } from 'lucide-react';
import { useSalonShopOptional } from '@/context/SalonShopContext';
import { OrderTrackingStepper } from '@/components/OrderTrackingStepper';
import { getPaymentLabel, type PaymentStatus, type OrderStatus } from '@/lib/orderTracking';

function OrdersPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const salonFilter = searchParams.get('salon_id');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [listLoading, setListLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [searchDebounced, setSearchDebounced] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');

    const isSalon = user?.role === 'salon';
    const shop = useSalonShopOptional();
    const canUpdateStatus = user?.role === 'distributor' || user?.role === 'super_admin';
    const canRecordPayment =
        user?.role === 'distributor' || user?.role === 'salesman' || user?.role === 'super_admin';

    const getPaymentStyle = (paymentStatus: string) => {
        switch (paymentStatus) {
            case 'paid':
                return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200';
            case 'partial':
                return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200';
            default:
                return 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 border-zinc-200';
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(searchQuery.trim()), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [salonFilter, statusFilter, paymentFilter, searchDebounced]);

    useEffect(() => {
        if (page === 1 && orders.length === 0) setLoading(true);
        else setListLoading(true);
        ordersApi
            .getAll({
                page,
                limit: 15,
                salon_id: salonFilter || undefined,
                status: statusFilter || undefined,
                payment_status: paymentFilter || undefined,
                search: searchDebounced || undefined,
            })
            .then((data) => {
                if (isPaginated(data)) {
                    setOrders(data.data);
                    setPagination(data.pagination);
                } else {
                    setOrders(data as any[]);
                    setPagination(null);
                }
            })
            .catch(console.error)
            .finally(() => {
                setLoading(false);
                setListLoading(false);
            });
    }, [page, salonFilter, statusFilter, paymentFilter, searchDebounced]);

    const reloadOrders = async () => {
        setListLoading(true);
        try {
            const data = await ordersApi.getAll({
                page,
                limit: 15,
                salon_id: salonFilter || undefined,
                status: statusFilter || undefined,
                payment_status: paymentFilter || undefined,
                search: searchDebounced || undefined,
            });
            if (isPaginated(data)) {
                setOrders(data.data);
                setPagination(data.pagination);
            } else {
                setOrders(data as any[]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setListLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await ordersApi.updateStatus(id, status);
            reloadOrders();
            setIsDetailsModalOpen(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCancelOrder = async (order: { id: string | number; order_number: string; status: string }) => {
        if (order.status !== 'pending') {
            setActionError('Only pending orders can be cancelled.');
            return;
        }
        const confirmed = window.confirm(
            `Cancel order ${order.order_number}? This will remove the order and return items to stock.`
        );
        if (!confirmed) return;

        setCancellingId(String(order.id));
        setActionError(null);
        try {
            await ordersApi.cancel(String(order.id));
            if (selectedOrder?.id === order.id) {
                setIsDetailsModalOpen(false);
                setSelectedOrder(null);
            }
            reloadOrders();
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Could not cancel order');
        } finally {
            setCancellingId(null);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200';
            case 'approved': return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200';
            case 'processing': return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200';
            case 'delivered': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200';
            case 'rejected': return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200';
            default: return 'bg-zinc-50 text-zinc-600';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4" />;
            case 'delivered': return <CheckCircle2 className="w-4 h-4" />;
            case 'processing': return <Truck className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Orders</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        {isSalon
                            ? 'Track your supply orders and delivery status.'
                            : 'Track and manage salon orders and deliveries.'}
                    </p>
                </div>
            </div>

            {actionError && (
                <motion.div layout className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 text-sm font-medium">
                    {actionError}
                </motion.div>
            )}

            {/* Orders Table */}
            <div className={`bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-opacity ${listLoading ? 'opacity-60' : ''}`}>
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300"
                        >
                            <option value="">All delivery status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="processing">Processing</option>
                            <option value="delivered">Delivered</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <select
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value)}
                            className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300"
                        >
                            <option value="">All payment status</option>
                            <option value="pending">Unpaid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Order Details</th>
                                {!isSalon && (
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Salon Name</th>
                                )}
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Delivery</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Payment</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider min-w-[140px]">Track</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {loading ? (
                                <TableRowsSkeleton rows={6} cols={isSalon ? 7 : 8} />
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={isSalon ? 7 : 8} className="px-6 py-12 text-center text-zinc-500 italic">
                                        No orders found
                                    </td>
                                </tr>
                            ) : orders.map((order) => (
                                <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{order.order_number}</p>
                                        <p className="text-xs text-zinc-500">Items: {order.item_count || 0}</p>
                                    </td>
                                    {!isSalon && (
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{order.salon_name}</p>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{new Date(order.created_at).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">
                                        {formatINR(order.total_amount)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {order.status.toUpperCase()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getPaymentStyle(order.payment_status || 'pending')}`}>
                                            {getPaymentLabel(
                                                (order.payment_status || 'pending') as PaymentStatus,
                                                parseFloat(order.paid_amount || 0),
                                                parseFloat(order.total_amount)
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 min-w-[160px]">
                                        <OrderTrackingStepper
                                            status={order.status as OrderStatus}
                                            paymentStatus={(order.payment_status || 'pending') as PaymentStatus}
                                            compact
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <motion.div layout className="flex items-center gap-1">
                                            <button 
                                                type="button"
                                                title="View details"
                                                onClick={async () => {
                                                    const details = await ordersApi.getById(order.id);
                                                    setSelectedOrder(details);
                                                    setIsDetailsModalOpen(true);
                                                }}
                                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-600 dark:text-zinc-400"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            {isSalon && order.status === 'pending' && (
                                                <button
                                                    type="button"
                                                    title="Cancel order"
                                                    disabled={cancellingId === String(order.id)}
                                                    onClick={() => handleCancelOrder(order)}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-red-600 disabled:opacity-50"
                                                >
                                                    {cancellingId === String(order.id) ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-5 h-5" />
                                                    )}
                                                </button>
                                            )}
                                        </motion.div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {pagination && (
                    <div className="px-6 pb-6">
                        <Pagination pagination={pagination} onPageChange={setPage} />
                    </div>
                )}
            </div>

            {/* Details Modal */}
            <AnimatePresence>
                {isDetailsModalOpen && selectedOrder && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDetailsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
                                <div>
                                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Order Details</h2>
                                    <p className="text-sm text-zinc-500">#{selectedOrder.order_number}</p>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${getStatusStyle(selectedOrder.status)}`}>
                                    {selectedOrder.status.toUpperCase()}
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[70vh]">
                                <div className="mb-8 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                    <OrderTrackingStepper
                                        status={selectedOrder.status as OrderStatus}
                                        paymentStatus={(selectedOrder.payment_status || 'pending') as PaymentStatus}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div>
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Salon Info</h3>
                                        <p className="font-bold text-zinc-900 dark:text-white">{selectedOrder.salon_name}</p>
                                        <p className="text-sm text-zinc-500">{selectedOrder.salon_address}</p>
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Order Date</h3>
                                        <p className="font-bold text-zinc-900 dark:text-white">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="mb-8 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Payment</p>
                                        <p className="font-bold text-zinc-900 dark:text-white">
                                            {getPaymentLabel(
                                                (selectedOrder.payment_status || 'pending') as PaymentStatus,
                                                selectedOrder.paid_amount,
                                                parseFloat(selectedOrder.total_amount)
                                            )}
                                            {selectedOrder.balance_due > 0 && (
                                                <span className="text-sm font-normal text-zinc-500 ml-2">
                                                    · Due {formatINR(selectedOrder.balance_due)}
                                                </span>
                                            )}
                                        </p>
                                        {selectedOrder.payments?.length > 0 && (
                                            <ul className="mt-2 text-xs text-zinc-500 space-y-1">
                                                {selectedOrder.payments.map((p: { id: number; amount: string; payment_method: string; payment_date: string }) => (
                                                    <li key={p.id}>
                                                        {formatINR(p.amount)} via {p.payment_method} ·{' '}
                                                        {new Date(p.payment_date).toLocaleString('en-IN')}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    {canRecordPayment &&
                                        selectedOrder.status !== 'pending' &&
                                        selectedOrder.status !== 'rejected' &&
                                        selectedOrder.payment_status !== 'paid' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsDetailsModalOpen(false);
                                                    router.push('/dashboard/payments');
                                                }}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shrink-0"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                                Record payment
                                            </button>
                                        )}
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Order Items</h3>
                                    <div className="border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-bold text-zinc-600">Product</th>
                                                    <th className="px-4 py-3 text-center font-bold text-zinc-600">Qty</th>
                                                    <th className="px-4 py-3 text-right font-bold text-zinc-600">Price</th>
                                                    <th className="px-4 py-3 text-right font-bold text-zinc-600">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                {selectedOrder.items?.map((item: any) => (
                                                    <tr key={item.id}>
                                                        <td className="px-4 py-3 font-medium">{item.product_name}</td>
                                                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-right">{formatINR(item.price)}</td>
                                                        <td className="px-4 py-3 text-right font-bold">{formatINR(item.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-zinc-50 dark:bg-zinc-800/50 font-bold">
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-4 text-right">Total Amount</td>
                                                    <td className="px-4 py-4 text-right text-primary text-lg">{formatINR(selectedOrder.total_amount)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                {isSalon && selectedOrder.status === 'pending' && (
                                    <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
                                        <button
                                            type="button"
                                            disabled={cancellingId === String(selectedOrder.id)}
                                            onClick={() => handleCancelOrder(selectedOrder)}
                                            className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
                                        >
                                            {cancellingId === String(selectedOrder.id) ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-5 h-5" />
                                            )}
                                            Cancel Order
                                        </button>
                                    </div>
                                )}

                                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                                    <button
                                        type="button"
                                        onClick={() => ordersApi.downloadInvoice(String(selectedOrder.id))}
                                        className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    >
                                        <FileDown className="w-4 h-4" />
                                        GST Invoice (PDF)
                                    </button>
                                    {isSalon && shop && selectedOrder.items?.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                selectedOrder.items.forEach((item: any) => {
                                                    shop.addToCart(
                                                        {
                                                            id: item.product_id,
                                                            name: item.product_name,
                                                            price: item.price,
                                                            stock: 999,
                                                        },
                                                        item.quantity
                                                    );
                                                });
                                                setIsDetailsModalOpen(false);
                                                shop.openCart();
                                            }}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary hover:text-white transition-all"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            Reorder to cart
                                        </button>
                                    )}
                                </div>

                                {canUpdateStatus && (
                                <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 text-center">Update Order Status</h3>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        {['pending', 'approved', 'processing', 'delivered', 'rejected'].map((status) => (
                                            <button 
                                                key={status}
                                                onClick={() => handleStatusUpdate(selectedOrder.id, status)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                    selectedOrder.status === status 
                                                    ? 'bg-primary text-white ring-4 ring-primary/10' 
                                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                                }`}
                                            >
                                                {status.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function OrdersPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <OrdersPageContent />
        </Suspense>
    );
}
