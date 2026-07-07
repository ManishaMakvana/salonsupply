import { buildPageQuery, type PaginatedResponse } from './pagination';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE}/api`;

export type ListParams = {
    page?: number;
    limit?: number;
    search?: string;
};

export const fetcher = async (endpoint: string, options: RequestInit = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const headers: Record<string, string> = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Something went wrong' }));
        const message = error.error || 'Something went wrong';
        const isAuthLogin =
            endpoint === '/auth/login' ||
            endpoint === '/auth/register' ||
            endpoint.startsWith('/auth/login') ||
            endpoint.startsWith('/auth/register');

        if (response.status === 401 && typeof window !== 'undefined' && !isAuthLogin) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login?session=expired';
            }
            throw new Error('Session expired. Please sign in again.');
        }

        throw new Error(message);
    }

    return response.json();
};

export const auth = {
    me: () => fetcher('/auth/me'),
    login: async (credentials: { email: string; password: string }) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        const data = await response.json().catch(() => ({ error: 'Something went wrong' }));
        if (!response.ok) {
            throw new Error(data.error || 'Invalid email or password');
        }
        return data;
    },
    register: (data: Record<string, unknown>) =>
        fetcher('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
};

export type ProductListParams = ListParams & {
    favorite_only?: boolean;
};

export const products = {
    getAll: (params?: ProductListParams) => {
        const qs = buildPageQuery({
            page: params?.page,
            limit: params?.limit,
            search: params?.search,
            favorite_only: params?.favorite_only ? '1' : undefined,
        });
        return fetcher(`/products${qs}`) as Promise<
            Record<string, unknown>[] | PaginatedResponse<Record<string, unknown>>
        >;
    },
    getLowStock: () => fetcher('/products/alerts/low-stock'),
    getById: (id: string) => fetcher(`/products/${id}`),
    create: (data: Record<string, unknown>) =>
        fetcher('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
        fetcher(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetcher(`/products/${id}`, { method: 'DELETE' }),
    uploadImage: async (id: string, file: File) => {
        const token = localStorage.getItem('token');
        const form = new FormData();
        form.append('image', file);
        const res = await fetch(`${API_URL}/products/${id}/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Upload failed');
        }
        return res.json();
    },
    imageUrl: (path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${API_BASE}${path}`;
    },
};

export type OrderListParams = ListParams & {
    salon_id?: string;
    status?: string;
    payment_status?: string;
    search?: string;
};

export const orders = {
    getAll: (params?: OrderListParams) => {
        const qs = buildPageQuery({
            page: params?.page,
            limit: params?.limit,
            salon_id: params?.salon_id,
            status: params?.status,
            payment_status: params?.payment_status,
            search: params?.search,
        });
        return fetcher(`/orders${qs}`) as Promise<
            Record<string, unknown>[] | PaginatedResponse<Record<string, unknown>>
        >;
    },
    getById: (id: string) => fetcher(`/orders/${id}`),
    create: (data: Record<string, unknown>) =>
        fetcher('/orders', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
        fetcher(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    cancel: (id: string) => fetcher(`/orders/${id}`, { method: 'DELETE' }),
    downloadInvoice: async (id: string) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/orders/${id}/invoice`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Could not download invoice');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    },
};

export const salons = {
    getAll: () => fetcher('/salons') as Promise<any[]>,
    getMe: () => fetcher('/salons/me'),
    create: (data: Record<string, unknown>) =>
        fetcher('/salons', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
        fetcher(`/salons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

export const salesmen = {
    getAll: () => fetcher('/salesmen'),
    getRoutes: (id: number | string) => fetcher(`/salesmen/${id}/routes`),
    getAssignments: (id: number | string) => fetcher(`/salesmen/${id}/assignments`),
    assignSalons: (id: number | string, salon_ids: number[]) =>
        fetcher(`/salesmen/${id}/assignments`, {
            method: 'PUT',
            body: JSON.stringify({ salon_ids }),
        }),
    create: (data: Record<string, unknown>) =>
        fetcher('/salesmen', { method: 'POST', body: JSON.stringify(data) }),
};

export const catalog = {
    getBrands: () => fetcher('/catalog/brands'),
    createBrand: (data: { name: string; logo?: string }) =>
        fetcher('/catalog/brands', { method: 'POST', body: JSON.stringify(data) }),
    getCategories: () => fetcher('/catalog/categories'),
    createCategory: (data: { name: string }) =>
        fetcher('/catalog/categories', { method: 'POST', body: JSON.stringify(data) }),
};

export const payments = {
    getSummary: () => fetcher('/payments/summary'),
    getAll: () => fetcher('/payments'),
    getUnpaidOrders: () => fetcher('/payments/unpaid-orders'),
    record: (data: {
        order_id: number;
        amount: number;
        payment_method: string;
        notes?: string;
        reference?: string;
    }) => fetcher('/payments', { method: 'POST', body: JSON.stringify(data) }),
};

export const notifications = {
    getAll: () => fetcher('/notifications'),
    markRead: (id: number | string) => fetcher(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => fetcher('/notifications/read-all', { method: 'PUT' }),
};

export const favorites = {
    getAll: () => fetcher('/favorites'),
    getReorder: () => fetcher('/favorites/reorder'),
    add: (product_id: number, quantity?: number) =>
        fetcher('/favorites', { method: 'POST', body: JSON.stringify({ product_id, quantity }) }),
    remove: (productId: number | string) => fetcher(`/favorites/${productId}`, { method: 'DELETE' }),
};

export const reports = {
    get: () => fetcher('/reports'),
};

export const audit = {
    getLogs: (params?: ListParams) => {
        const qs = buildPageQuery({ page: params?.page, limit: params?.limit });
        return fetcher(`/audit${qs}`) as Promise<
            Record<string, unknown>[] | PaginatedResponse<Record<string, unknown>>
        >;
    },
};
