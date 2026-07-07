'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShoppingCart, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatINR } from '@/lib/format';
import { products as productsApi } from '@/lib/api';
import { LazyImage } from '@/components/ui/LazyImage';
import { useSalonShop } from '@/context/SalonShopContext';

export function SalonWishlistDrawer() {
    const router = useRouter();
    const {
        favorites,
        isWishlistOpen,
        closeWishlist,
        addFavoriteToCart,
        addAllFavoritesToCart,
        toggleFavorite,
        openCart,
    } = useSalonShop();

    return (
        <AnimatePresence>
            {isWishlistOpen && (
                <div className="fixed inset-0 z-[110] flex justify-end">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeWishlist}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="bg-white dark:bg-zinc-900 w-full max-w-md h-full relative z-10 flex flex-col shadow-2xl"
                    >
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                                    Wishlist
                                </h2>
                                <p className="text-xs text-zinc-500">{favorites.length} saved product(s)</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeWishlist}
                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {favorites.length === 0 ? (
                                <div className="text-center py-12 space-y-3">
                                    <Heart className="w-12 h-12 mx-auto text-zinc-300" />
                                    <p className="text-zinc-500">No items in your wishlist yet</p>
                                    <p className="text-xs text-zinc-400">
                                        Tap the heart on any product to save it here for quick reorder.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            closeWishlist();
                                            router.push('/dashboard/products');
                                        }}
                                        className="text-sm font-bold text-primary hover:underline"
                                    >
                                        Browse products →
                                    </button>
                                </div>
                            ) : (
                                favorites.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl"
                                    >
                                        <div className="w-16 h-16 rounded-xl bg-zinc-200 dark:bg-zinc-700 overflow-hidden shrink-0 relative">
                                            <LazyImage
                                                src={productsApi.imageUrl(item.image)}
                                                alt={item.name}
                                                sizes="64px"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-zinc-900 dark:text-white truncate">
                                                {item.name}
                                            </p>
                                            <p className="text-sm text-primary font-bold tabular-nums">
                                                {formatINR(item.price)}
                                            </p>
                                            <p className="text-xs text-zinc-500">Stock: {item.stock}</p>
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    type="button"
                                                    disabled={item.stock < 1}
                                                    onClick={() => {
                                                        addFavoriteToCart(item);
                                                        openCart();
                                                    }}
                                                    className="flex-1 py-2 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-1"
                                                >
                                                    <ShoppingCart className="w-3.5 h-3.5" />
                                                    Add to cart
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleFavorite(item.product_id)}
                                                    className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-red-500"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {favorites.length > 0 && (
                            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        addAllFavoritesToCart();
                                        closeWishlist();
                                    }}
                                    className="w-full py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary hover:text-white transition-all"
                                >
                                    Add all to cart
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
