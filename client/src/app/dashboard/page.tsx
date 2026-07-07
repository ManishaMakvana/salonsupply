'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
    TrendingUp, 
    ShoppingCart, 
    Users, 
    CreditCard, 
    ArrowUpRight, 
    Package,
    Clock,
    CheckCircle2,
    AlertCircle,
    Plus,
    ShoppingBag,
    IndianRupee,
    MapPin,
    Target
} from 'lucide-react';
import { orders as ordersApi, salons as salonsApi, products as productsApi } from '@/lib/api';
import { formatINR, formatDate } from '@/lib/format';
import { useStoredUser } from '@/hooks/useStoredUser';

export default function DashboardPage() {
    const { user, mounted } = useStoredUser({ redirect: false });
    const [stats, setStats] = useState<any>(null);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [salonProfile, setSalonProfile] = useState<any>(null);
    const [lowStock, setLowStock] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!mounted || !user) return;

        const loadDashboardData = async () => {
            try {
                const parsed = user;
                const response = await ordersApi.getAll();

                const orders = Array.isArray(response)
                    ? response
                    : response.data ?? [];

                setRecentOrders(orders);

                const totalRevenue = orders.reduce(
                    (sum: number, o: any) => sum + Number(o.total_amount || 0),
                    0
                );

                const pendingOrders = orders.filter(
                    (o: any) => o.status === "pending"
                ).length;

                let salonsCount = 0;
                if (parsed?.role === 'distributor' || parsed?.role === 'super_admin') {
                    try {
                        const response = await salonsApi.getAll();
                        const salonList = Array.isArray(response) ? response : response.data ?? [];
                        salonsCount = salonList.length;
                        const alerts = await productsApi.getLowStock();
                        setLowStock(alerts);
                    } catch {
                        /* ignore */
                    }
                }

                if (parsed?.role === 'salon') {
                    try {
                        const me = await salonsApi.getMe();
                        setSalonProfile(me);
                    } catch {
                        /* ignore */
                    }
                }

                setStats({
                    revenue: totalRevenue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
                    ordersCount: orders.length,
                    pendingCount: pendingOrders,
                    salonsCount,
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [mounted, user]);

    if (!mounted || !user || loading) return (
        <div className="flex items-center justify-center h-full min-h-[60vh]">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    // SALON DASHBOARD
    if (user.role === 'salon') {
        return (
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Salon Dashboard</h1>
                        <p className="text-zinc-500 dark:text-zinc-400">Welcome back, {user.name}!</p>
                    </div>
                    <Link 
                        href="/dashboard/products"
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all text-center justify-center"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        Order Supplies
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                            <Clock className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Active Orders</p>
                        <p className="text-3xl font-bold text-zinc-900 dark:text-white">{recentOrders.filter(o => o.status !== 'delivered').length}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Delivered</p>
                        <p className="text-3xl font-bold text-zinc-900 dark:text-white">{recentOrders.filter(o => o.status === 'delivered').length}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">You owe</p>
                        <p className="text-3xl font-bold text-zinc-900 dark:text-white tabular-nums">
                            {formatINR(salonProfile?.outstanding ?? 0)}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                            Limit {formatINR(salonProfile?.credit_limit ?? 50000)} · Available{' '}
                            {formatINR(salonProfile?.available_credit ?? 0)}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">My Recent Orders</h3>
                        <Link href="/dashboard/orders" className="text-sm font-bold text-primary hover:underline">View All</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Order ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {recentOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 italic">No orders found</td>
                                    </tr>
                                ) : recentOrders.slice(0, 5).map((order) => (
                                    <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-zinc-900 dark:text-white">{order.order_number}</td>
                                        <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400" suppressHydrationWarning>{formatDate(order.created_at)}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-zinc-900 dark:text-white">{formatINR(order.total_amount)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 
                                                order.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // SALESMAN DASHBOARD
    if (user.role === 'salesman') {
        return (
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Sales Partner Portal</h1>
                        <p className="text-zinc-500 dark:text-zinc-400">Tracking your field performance.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-primary p-6 rounded-3xl shadow-xl shadow-primary/20 text-white relative overflow-hidden">
                        <Target className="absolute -bottom-4 -right-4 w-24 h-24 opacity-20" />
                        <p className="text-sm font-bold text-white/80 uppercase tracking-widest mb-1">Monthly Target</p>
                        <p className="text-3xl font-bold tabular-nums">{formatINR(500000)}</p>
                        <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white w-[65%]" />
                        </div>
                        <p className="text-xs mt-2 font-medium text-white/80 tabular-nums">65% Achieved ({formatINR(320000)})</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <Users className="w-8 h-8 text-indigo-600 mb-4" />
                        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Assigned Salons</p>
                        <p className="text-3xl font-bold text-zinc-900 dark:text-white">42</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <ShoppingBag className="w-8 h-8 text-emerald-600 mb-4" />
                        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Orders Collected</p>
                        <p className="text-3xl font-bold text-zinc-900 dark:text-white">128</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Today's Route Plan</h3>
                        <div className="space-y-4">
                            {[
                                { name: 'Glamour Studio', time: '10:30 AM', status: 'visited' },
                                { name: 'Style & Smile', time: '12:15 PM', status: 'pending' },
                                { name: 'The Hair Lab', time: '02:45 PM', status: 'pending' },
                            ].map((salon, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-4">
                                        <MapPin className={`w-5 h-5 ${salon.status === 'visited' ? 'text-emerald-500' : 'text-zinc-400'}`} />
                                        <div>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white">{salon.name}</p>
                                            <p className="text-xs text-zinc-500">{salon.time}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                                        salon.status === 'visited' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                        {salon.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Recent Sales Activity</h3>
                        <div className="space-y-6">
                            {recentOrders.slice(0, 4).map((order) => (
                                <div key={order.id} className="flex items-start gap-4">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white">Order collected from {order.salon_name}</p>
                                        <p className="text-xs text-zinc-500 tabular-nums" suppressHydrationWarning>
                                            Amount: {formatINR(order.total_amount)} •{' '}
                                            {new Date(order.created_at).toLocaleTimeString('en-IN')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // DISTRIBUTOR DASHBOARD (DEFAULT)
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Welcome back, {user.name}!</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link 
                        href="/dashboard/products"
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 transition-all"
                    >
                        <Package className="w-4 h-4" />
                        Inventory
                    </Link>
                    <Link 
                        href="/dashboard/orders"
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Manage Orders
                    </Link>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Revenue', value: stats.revenue, icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'Total Orders', value: stats.ordersCount, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Active Salons', value: stats.salonsCount, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                    { label: 'Pending Orders', value: stats.pendingCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
                    >
                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-3xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {lowStock.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-2">
                        Low stock alert ({lowStock.length} products)
                    </p>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                        {lowStock.slice(0, 5).map((p: any) => (
                            <li key={p.id}>
                                {p.name} — only {p.stock} left
                            </li>
                        ))}
                    </ul>
                    <Link href="/dashboard/products" className="text-xs font-bold text-primary mt-2 inline-block">
                        View inventory →
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Recent Activity</h3>
                        <Link href="/dashboard/orders" className="text-sm font-bold text-primary hover:underline">View All</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Salon</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {recentOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-zinc-500 italic">No orders found</td>
                                    </tr>
                                ) : recentOrders.slice(0, 5).map((order) => (
                                    <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white">{order.salon_name}</p>
                                            <p className="text-xs text-zinc-500" suppressHydrationWarning>{formatDate(order.created_at)}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-zinc-900 dark:text-white">{formatINR(order.total_amount)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 
                                                order.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Stock Alerts</h3>
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="space-y-4">
                        {[
                            { name: 'Hair Color Blue', stock: 4, limit: 10 },
                            { name: 'Keratin Shampoo', stock: 2, limit: 5 },
                            { name: 'Developer 20vol', stock: 8, limit: 15 },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <div>
                                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</p>
                                    <p className="text-xs text-zinc-500">Stock: {item.stock}</p>
                                </div>
                                <button className="text-[10px] font-bold text-primary uppercase">Restock</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
