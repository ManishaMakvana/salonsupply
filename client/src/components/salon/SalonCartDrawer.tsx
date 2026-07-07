'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Loader2, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { orders as ordersApi } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { useSalonShop } from '@/context/SalonShopContext';

export function SalonCartDrawer() {
    const router = useRouter();
    const {
        cart,
        cartCount,
        cartTotal,
        isCartOpen,
        closeCart,
        updateCartQty,
        removeFromCart,
        clearCart,
    } = useSalonShop();
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const placeOrder = async () => {
        if (cart.length === 0) return;
        setPlacing(true);
        setError(null);
        try {
            const result = await ordersApi.create({
                items: cart.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price,
                })),
            });
            clearCart();
            closeCart();
            router.push(`/dashboard/orders?placed=${result.orderNumber || ''}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to place order');
        } finally {
            setPlacing(false);
        }
    };

    return (
        <AnimatePresence>
            {isCartOpen && (
                <div className="fixed inset-0 z-[110] flex justify-end">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCart}
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
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Your Cart</h2>
                                <p className="text-xs text-zinc-500">{cartCount} item(s) — saved on this device</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeCart}
                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-12 space-y-3">
                                    <ShoppingBag className="w-12 h-12 mx-auto text-zinc-300" />
                                    <p className="text-zinc-500">Your cart is empty</p>
                                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                                        Add products from the Products page. Placed orders appear under Orders, not
                                        in the cart.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            closeCart();
                                            router.push('/dashboard/products');
                                        }}
                                        className="text-sm font-bold text-primary hover:underline"
                                    >
                                        Browse products →
                                    </button>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div
                                        key={item.product_id}
                                        className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-zinc-900 dark:text-white truncate">
                                                {item.name}
                                            </p>
                                            <p className="text-sm text-zinc-500 tabular-nums">
                                                {formatINR(item.price)} × {item.quantity}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => updateCartQty(item.product_id, -1)}
                                                className="p-2 bg-white dark:bg-zinc-900 rounded-lg border"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-6 text-center font-bold">{item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => updateCartQty(item.product_id, 1)}
                                                className="p-2 bg-white dark:bg-zinc-900 rounded-lg border"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.product_id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                                {error && (
                                    <p className="text-sm text-red-500 font-medium text-center">{error}</p>
                                )}
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span className="text-primary tabular-nums">{formatINR(cartTotal)}</span>
                                </div>
                                <button
                                    type="button"
                                    disabled={placing}
                                    onClick={placeOrder}
                                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {placing ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'Place Order'
                                    )}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
