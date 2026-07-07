'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export type StoredUser = {
    id: number;
    name: string;
    email?: string;
    role: string;
    distributor_id?: number | null;
    phone?: string | null;
};

export function useStoredUser(options?: { redirect?: boolean }) {
    const router = useRouter();
    const redirect = options?.redirect !== false;
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<StoredUser | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const raw = localStorage.getItem('user');

        if (!token || !raw) {
            if (redirect) router.replace('/login');
            setMounted(true);
            return;
        }

        try {
            setUser(JSON.parse(raw) as StoredUser);
        } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (redirect) router.replace('/login');
        }
        setMounted(true);
    }, [router, redirect]);

    return { user, mounted, ready: mounted && !!user };
}
