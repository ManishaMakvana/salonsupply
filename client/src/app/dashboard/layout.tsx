'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useStoredUser } from '@/hooks/useStoredUser';
import { DashboardLoadingShell } from '@/components/DashboardLoadingShell';
import { auth as authApi } from '@/lib/api';
import Link from 'next/link';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    UserCircle,
    CreditCard,
    LogOut,
    Scissors,
    Menu,
    X,
    BarChart3,
    Shield,
    Heart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationBell } from '@/components/NotificationBell';
import { SalonShopProvider } from '@/context/SalonShopContext';
import { SalonCartDrawer } from '@/components/salon/SalonCartDrawer';
import { SalonWishlistDrawer } from '@/components/salon/SalonWishlistDrawer';
import { SalonHeaderShopButtons } from '@/components/salon/SalonHeaderShopButtons';
import { clearSalonCart } from '@/lib/salonCartStorage';

function DashboardShell({
    user,
    children,
    showSalonShop,
}: {
    user: { name: string; role: string };
    children: React.ReactNode;
    showSalonShop: boolean;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['super_admin', 'distributor', 'salesman', 'salon'] },
        { name: 'Products', icon: Package, path: '/dashboard/products', roles: ['super_admin', 'distributor', 'salon'] },
        { name: 'Wishlist', icon: Heart, path: '/dashboard/wishlist', roles: ['salon'] },
        { name: 'Orders', icon: ShoppingCart, path: '/dashboard/orders', roles: ['super_admin', 'distributor', 'salesman', 'salon'] },
        { name: 'Salons', icon: Users, path: '/dashboard/salons', roles: ['super_admin', 'distributor', 'salesman'] },
        { name: 'Salesmen', icon: UserCircle, path: '/dashboard/salesmen', roles: ['super_admin', 'distributor'] },
        { name: 'Payments', icon: CreditCard, path: '/dashboard/payments', roles: ['super_admin', 'distributor', 'salesman'] },
        { name: 'Reports', icon: BarChart3, path: '/dashboard/reports', roles: ['super_admin', 'distributor', 'salesman'] },
        { name: 'Audit Log', icon: Shield, path: '/dashboard/audit', roles: ['super_admin', 'distributor'] },
    ];

    const filteredNavItems = navItems.filter((item) => item.roles.includes(user.role));

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={{
                    x: isSidebarOpen ? 0 : -280,
                    width: isSidebarOpen ? 280 : 0,
                }}
                className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300 ease-in-out ${!isSidebarOpen && 'md:w-0 overflow-hidden'}`}
            >
                <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary p-1.5 rounded-lg text-white">
                            <Scissors className="w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                            SalonSupply
                        </span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {filteredNavItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => {
                                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                                }}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                                }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="truncate">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4 shrink-0">
                    <div className="flex items-center gap-3 px-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-400">
                            {user.name[0]}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{user.name}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{user.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            clearSalonCart();
                            window.location.href = '/login';
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </motion.aside>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"
                    >
                        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                    <div className="flex items-center gap-3 md:gap-4">
                        {showSalonShop && <SalonHeaderShopButtons />}
                        <NotificationBell />
                        <div className="h-8 w-[1px] bg-zinc-200 dark:border-zinc-800 hidden md:block" />
                        <div className="hidden md:flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">{user.name}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{user.role}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                {user.name[0]}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 page-enter">{children}</main>
            </div>

            {showSalonShop && (
                <>
                    <SalonCartDrawer />
                    <SalonWishlistDrawer />
                </>
            )}
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, mounted, ready } = useStoredUser();

    useEffect(() => {
        if (!ready) return;
        authApi
            .me()
            .then((res: { user: { name: string; role: string; email?: string } }) => {
                localStorage.setItem('user', JSON.stringify(res.user));
            })
            .catch(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login?session=expired';
            });
    }, [ready]);

    if (!mounted || !user) {
        return <DashboardLoadingShell />;
    }

    const isSalon = user.role === 'salon';

    if (isSalon) {
        return (
            <SalonShopProvider>
                <DashboardShell user={user} showSalonShop>
                    {children}
                </DashboardShell>
            </SalonShopProvider>
        );
    }

    return (
        <DashboardShell user={user} showSalonShop={false}>
            {children}
        </DashboardShell>
    );
}
