'use client';

import { Heart, ShoppingCart } from 'lucide-react';
import { useSalonShop } from '@/context/SalonShopContext';

export function SalonHeaderShopButtons() {
    const { cartCount, wishlistCount, openCart, openWishlist } = useSalonShop();

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={openWishlist}
                className="relative p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400"
                title="Wishlist"
            >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                )}
            </button>
            <button
                type="button"
                onClick={openCart}
                className="relative flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-sm font-bold transition-all"
                title="Your Cart"
            >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {cartCount}
                    </span>
                )}
            </button>
        </div>
    );
}
