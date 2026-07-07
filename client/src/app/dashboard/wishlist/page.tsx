'use client';

import { useEffect } from 'react';
import { Heart, ShoppingCart, Package, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatINR } from '@/lib/format';
import { products as productsApi } from '@/lib/api';
import { useSalonShop } from '@/context/SalonShopContext';
import { LazyImage } from '@/components/ui/LazyImage';

export default function WishlistPage() {
    const router = useRouter();
    const {
        favorites,
        refreshFavorites,
        addFavoriteToCart,
        addAllFavoritesToCart,
        toggleFavorite,
        openCart,
    } = useSalonShop();

    useEffect(() => {
        refreshFavorites();
    }, [refreshFavorites]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Heart className="w-8 h-8 text-red-500 fill-red-500" />
                        Wishlist
                    </h1>
                    <p className="text-zinc-500">Saved products for quick reorder</p>
                </div>
                {favorites.length > 0 && (
                    <button
                        type="button"
                        onClick={() => {
                            addAllFavoritesToCart();
                            openCart();
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        Add all to cart
                    </button>
                )}
            </div>

            {favorites.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                    <Heart className="w-14 h-14 mx-auto text-zinc-300 mb-4" />
                    <p className="font-bold text-zinc-900 dark:text-white">Your wishlist is empty</p>
                    <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
                        On the Products page, tap the heart icon on items you order often.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard/products')}
                        className="mt-6 text-primary font-bold hover:underline"
                    >
                        Go to Products →
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm"
                        >
                            <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-4 relative overflow-hidden">
                                <LazyImage
                                    src={productsApi.imageUrl(item.image)}
                                    alt={item.name}
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                />
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-white">{item.name}</h3>
                            <p className="text-primary font-bold mt-1 tabular-nums">{formatINR(item.price)}</p>
                            <p className="text-sm text-zinc-500 mt-1">Stock: {item.stock}</p>
                            <div className="flex gap-2 mt-4">
                                <button
                                    type="button"
                                    disabled={item.stock < 1}
                                    onClick={() => {
                                        addFavoriteToCart(item);
                                        openCart();
                                    }}
                                    className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    <ShoppingCart className="w-4 h-4" />
                                    Add to cart
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleFavorite(item.product_id)}
                                    className="px-4 py-2.5 border border-red-200 text-red-600 text-sm font-bold rounded-xl"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
