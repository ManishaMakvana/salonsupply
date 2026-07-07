'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { notifications as notificationsApi } from '@/lib/api';

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<{ notifications: any[]; unread_count: number } | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const load = async () => {
        try {
            const res = await notificationsApi.getAll();
            setData(res);
        } catch {
            setData({ notifications: [], unread_count: 0 });
        }
    };

    useEffect(() => {
        load();
        const t = setInterval(load, 60000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const markAll = async () => {
        await notificationsApi.markAllRead();
        load();
    };

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => {
                    setOpen(!open);
                    if (!open) load();
                }}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 relative"
            >
                <Bell className="w-5 h-5" />
                {(data?.unread_count ?? 0) > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
                        {data!.unread_count > 9 ? '9+' : data!.unread_count}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50">
                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Notifications</span>
                        <button
                            type="button"
                            onClick={markAll}
                            className="text-xs text-primary font-bold flex items-center gap-1"
                        >
                            <Check className="w-3 h-3" /> Mark all read
                        </button>
                    </div>
                    {!data?.notifications?.length ? (
                        <p className="p-4 text-sm text-zinc-500 text-center">No notifications yet</p>
                    ) : (
                        data.notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`p-3 border-b border-zinc-50 dark:border-zinc-800 ${
                                    !n.is_read ? 'bg-primary/5' : ''
                                }`}
                            >
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">{n.title}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{n.message}</p>
                                <p className="text-[10px] text-zinc-400 mt-1" suppressHydrationWarning>
                                    {new Date(n.created_at).toLocaleString('en-IN')}
                                    {n.channel !== 'in_app' && ` · ${n.channel}`}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
