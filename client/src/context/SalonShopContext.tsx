'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { favorites as favoritesApi } from '@/lib/api';
import {
    loadSalonCart,
    saveSalonCart,
    clearSalonCart,
    type SalonCartItem,
} from '@/lib/salonCartStorage';

type FavoriteItem = {
    id: number;
    product_id: number;
    quantity: number;
    name: string;
    price: number;
    stock: number;
    image?: string | null;
};

type SalonShopContextValue = {
    cart: SalonCartItem[];
    cartCount: number;
    cartTotal: number;
    addToCart: (product: {
        id: number;
        name: string;
        price: number | string;
        stock: number;
        image?: string | null;
    }, quantity?: number) => void;
    updateCartQty: (productId: number, delta: number) => void;
    removeFromCart: (productId: number) => void;
    clearCart: () => void;
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    favorites: FavoriteItem[];
    favoriteIds: Set<number>;
    wishlistCount: number;
    toggleFavorite: (productId: number, quantity?: number) => Promise<void>;
    refreshFavorites: () => Promise<void>;
    addFavoriteToCart: (item: FavoriteItem) => void;
    addAllFavoritesToCart: () => void;
    isWishlistOpen: boolean;
    openWishlist: () => void;
    closeWishlist: () => void;
    showFavoritesOnly: boolean;
    setShowFavoritesOnly: (v: boolean) => void;
};

const SalonShopContext = createContext<SalonShopContextValue | null>(null);

export function SalonShopProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<SalonCartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setCart(loadSalonCart());
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (hydrated) saveSalonCart(cart);
    }, [cart, hydrated]);

    const refreshFavorites = useCallback(async () => {
        try {
            const list = await favoritesApi.getAll();
            setFavorites(list);
            setFavoriteIds(new Set(list.map((f: FavoriteItem) => f.product_id)));
        } catch {
            setFavorites([]);
            setFavoriteIds(new Set());
        }
    }, []);

    useEffect(() => {
        refreshFavorites();
    }, [refreshFavorites]);

    const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
    const cartTotal = useMemo(
        () => cart.reduce((s, i) => s + i.price * i.quantity, 0),
        [cart]
    );

    const addToCart = useCallback(
        (
            product: {
                id: number;
                name: string;
                price: number | string;
                stock: number;
                image?: string | null;
            },
            quantity = 1
        ) => {
            const price = parseFloat(String(product.price));
            const qty = Math.min(Math.max(1, quantity), product.stock);
            setCart((prev) => {
                const existing = prev.find((i) => i.product_id === product.id);
                if (existing) {
                    const newQty = Math.min(existing.quantity + qty, product.stock);
                    return prev.map((i) =>
                        i.product_id === product.id ? { ...i, quantity: newQty, stock: product.stock } : i
                    );
                }
                return [
                    ...prev,
                    {
                        product_id: product.id,
                        name: product.name,
                        price,
                        stock: product.stock,
                        quantity: qty,
                        image: product.image,
                    },
                ];
            });
        },
        []
    );

    const updateCartQty = useCallback((productId: number, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.product_id !== productId) return item;
                    const newQty = item.quantity + delta;
                    if (newQty < 1) return null;
                    if (newQty > item.stock) return item;
                    return { ...item, quantity: newQty };
                })
                .filter(Boolean) as SalonCartItem[]
        );
    }, []);

    const removeFromCart = useCallback((productId: number) => {
        setCart((prev) => prev.filter((i) => i.product_id !== productId));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
        clearSalonCart();
    }, []);

    const toggleFavorite = useCallback(
        async (productId: number, quantity = 1) => {
            if (favoriteIds.has(productId)) {
                await favoritesApi.remove(productId);
            } else {
                await favoritesApi.add(productId, quantity);
            }
            await refreshFavorites();
        },
        [favoriteIds, refreshFavorites]
    );

    const addFavoriteToCart = useCallback(
        (item: FavoriteItem) => {
            addToCart(
                {
                    id: item.product_id,
                    name: item.name,
                    price: item.price,
                    stock: item.stock,
                    image: item.image,
                },
                item.quantity
            );
        },
        [addToCart]
    );

    const addAllFavoritesToCart = useCallback(() => {
        favorites.forEach((f) => {
            if (f.stock > 0) addFavoriteToCart(f);
        });
        setIsCartOpen(true);
    }, [favorites, addFavoriteToCart]);

    const value: SalonShopContextValue = {
        cart,
        cartCount,
        cartTotal,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        isCartOpen,
        openCart: () => {
            setIsWishlistOpen(false);
            setIsCartOpen(true);
        },
        closeCart: () => setIsCartOpen(false),
        favorites,
        favoriteIds,
        wishlistCount: favorites.length,
        toggleFavorite,
        refreshFavorites,
        addFavoriteToCart,
        addAllFavoritesToCart,
        isWishlistOpen,
        openWishlist: () => {
            setIsCartOpen(false);
            setIsWishlistOpen(true);
        },
        closeWishlist: () => setIsWishlistOpen(false),
        showFavoritesOnly,
        setShowFavoritesOnly,
    };

    return <SalonShopContext.Provider value={value}>{children}</SalonShopContext.Provider>;
}

export function useSalonShop() {
    const ctx = useContext(SalonShopContext);
    if (!ctx) {
        throw new Error('useSalonShop must be used within SalonShopProvider');
    }
    return ctx;
}

export function useSalonShopOptional() {
    return useContext(SalonShopContext);
}
