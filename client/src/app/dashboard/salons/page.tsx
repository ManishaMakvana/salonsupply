'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { salons as salonsApi, products as productsApi, orders as ordersApi } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { Users, Plus, X, Loader2, ShoppingCart } from 'lucide-react';

export default function SalonsPage() {
    const router = useRouter();
    const [salons, setSalons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [orderSalon, setOrderSalon] = useState<any | null>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [cart, setCart] = useState<{ product_id: number; name: string; price: number; quantity: number }[]>([]);
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({ salon_name: '', owner_name: '', phone: '', address: '' });

    useEffect(() => { loadSalons(); }, []);

    const loadSalons = async () => {
        try {
            const response = await salonsApi.getAll();
            setSalons(Array.isArray(response) ? response : response.data ?? []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await salonsApi.create(formData);
            await loadSalons();
            setIsAddModalOpen(false);
            setFormData({ salon_name: '', owner_name: '', phone: '', address: '' });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const openCreateOrder = async (salon: any) => {
        setOrderSalon(salon);
        setCart([]);
        setError(null);
        try {
            const response = await productsApi.getAll();
            setProducts(Array.isArray(response) ? response : response.data ?? []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load products');
        }
    };

    const addToCart = (product: any) => {
        setCart((prev) => {
            const ex = prev.find((i) => i.product_id === product.id);
            if (ex) return prev.map((i) => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { product_id: product.id, name: product.name, price: parseFloat(product.price), quantity: 1 }];
        });
    };

    const placeOrderForSalon = async () => {
        if (!orderSalon || !cart.length) return;
        setPlacing(true);
        try {
            await ordersApi.create({
                salon_id: orderSalon.id,
                items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })),
            });
            router.push(`/dashboard/orders?salon_id=${orderSalon.id}`);
            setOrderSalon(null);
        } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to place order'); }
        finally { setPlacing(false); }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Salons</h1>
                    <p className="text-zinc-500">Manage your connected beauty salons and customers.</p>
                </div>
                <button type="button" onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold">
                    <Plus className="w-5 h-5" /> Register Salon
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : salons.length === 0 ? (
                <p className="text-center text-zinc-500 py-12">No salons registered yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {salons.map((salon) => (
                        <div key={salon.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Users className="w-8 h-8 text-primary" />
                                <div>
                                    <h3 className="font-bold text-lg">{salon.salon_name}</h3>
                                    <p className="text-sm text-zinc-500">Owner: {salon.owner_name || '—'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => router.push(`/dashboard/orders?salon_id=${salon.id}`)} className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-sm font-bold rounded-xl">
                                    View History
                                </button>
                                <button type="button" onClick={() => openCreateOrder(salon)} className="flex-1 py-2.5 bg-primary/10 text-primary text-sm font-bold rounded-xl hover:bg-primary hover:text-white">
                                    Create Order
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-4">Register Salon</h2>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input className="w-full px-4 py-3 border rounded-xl dark:bg-zinc-800 dark:text-white" required placeholder="Salon name" value={formData.salon_name} onChange={(e) => setFormData({ ...formData, salon_name: e.target.value })} />
                            <input className="w-full px-4 py-3 border rounded-xl dark:bg-zinc-800 dark:text-white" required placeholder="Owner" value={formData.owner_name} onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })} />
                            <input className="w-full px-4 py-3 border rounded-xl dark:bg-zinc-800 dark:text-white" required placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                            <textarea className="w-full px-4 py-3 border rounded-xl dark:bg-zinc-800 dark:text-white" required placeholder="Address" rows={2} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                            <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-xl">Save</button>
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-full py-2 text-sm">Cancel</button>
                        </form>
                    </div>
                </div>
            )}

            {orderSalon && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-3xl p-6">
                        <div className="flex justify-between mb-4">
                            <h2 className="text-xl font-bold">Order: {orderSalon.salon_name}</h2>
                            <button type="button" onClick={() => setOrderSalon(null)}><X /></button>
                        </div>
                        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                        <p className="text-sm text-zinc-500 mb-2">Tap a product to add:</p>
                        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                            {products.map((p) => (
                                <button key={p.id} type="button" onClick={() => addToCart(p)} className="w-full flex justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm">
                                    <span>{p.name}</span><span>{formatINR(p.price)}</span>
                                </button>
                            ))}
                        </div>
                        {cart.length > 0 && (
                            <div>
                                {cart.map((i) => (
                                    <div key={i.product_id} className="flex justify-between text-sm py-1">
                                        <span>{i.name} x{i.quantity}</span><span>{formatINR(i.price * i.quantity)}</span>
                                    </div>
                                ))}
                                <button type="button" onClick={placeOrderForSalon} disabled={placing} className="w-full mt-3 py-3 bg-primary text-white font-bold rounded-xl flex justify-center gap-2">
                                    {placing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShoppingCart className="w-5 h-5" /> Place Order</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
