export type SalonCartItem = {
    product_id: number;
    name: string;
    price: number;
    stock: number;
    quantity: number;
    image?: string | null;
};

const STORAGE_KEY = 'salon_cart_v1';

export function loadSalonCart(): SalonCartItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveSalonCart(items: SalonCartItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function clearSalonCart() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}
