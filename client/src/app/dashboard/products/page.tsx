'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { products as productsApi, salons as salonsApi, catalog as catalogApi, favorites as favoritesApi } from '@/lib/api';
import { isPaginated, type PaginationMeta } from '@/lib/pagination';
import { LazyImage } from '@/components/ui/LazyImage';
import { Pagination } from '@/components/ui/Pagination';
import { ProductGridSkeleton } from '@/components/ui/ProductGridSkeleton';
import { useSalonShopOptional } from '@/context/SalonShopContext';
import { formatINR } from '@/lib/format';
import { ProductBrandCategoryLine } from '@/lib/productMeta';
import DistributorProductModal, { ProductFormData } from '@/components/DistributorProductModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Package, Edit, Trash2, X, Loader2, ShoppingCart, Minus, AlertCircle, Heart, RotateCcw } from 'lucide-react';

const emptyProductForm = (): ProductFormData => ({
    name: '',
    description: '',
    price: '',
    stock: '',
    sku: '',
    brand_id: '',
    category_id: '',
    image: '',
    low_stock_threshold: '10',
});

export default function ProductsPage() {
    const router = useRouter();
    const shop = useSalonShopOptional();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [listLoading, setListLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [searchDebounced, setSearchDebounced] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [saving, setSaving] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState<any>(null);
    const [salonProfile, setSalonProfile] = useState<any>(null);
    const [salonError, setSalonError] = useState<string | null>(null);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [orderProduct, setOrderProduct] = useState<any | null>(null);
    const [orderQty, setOrderQty] = useState(1);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [formData, setFormData] = useState<ProductFormData>(emptyProductForm());

    const isDistributor = user?.role === 'distributor' || user?.role === 'super_admin';
    const isSalon = user?.role === 'salon';
    const favoriteIds = shop?.favoriteIds ?? new Set<number>();
    const showFavoritesOnly = shop?.showFavoritesOnly ?? false;

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;
        setUser(JSON.parse(storedUser));
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(searchTerm.trim()), 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        setPage(1);
    }, [searchDebounced, showFavoritesOnly]);

    const loadProducts = useCallback(
        async (pageNum: number, opts?: { initial?: boolean }) => {
            const token = localStorage.getItem('token');
            if (!token) {
                setProductsError('Please sign in again.');
                setLoading(false);
                return;
            }
            if (opts?.initial) setLoading(true);
            else setListLoading(true);
            setProductsError(null);
            try {
                const res = await productsApi.getAll({
                    page: pageNum,
                    limit: 12,
                    search: searchDebounced || undefined,
                    favorite_only: isSalon && showFavoritesOnly,
                });
                if (isPaginated(res)) {
                    setProducts(res.data);
                    setPagination(res.pagination);
                } else {
                    setProducts(res as any[]);
                    setPagination(null);
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Failed to load products';
                setProductsError(msg);
            } finally {
                setLoading(false);
                setListLoading(false);
            }
        },
        [searchDebounced, isSalon, showFavoritesOnly]
    );

    useEffect(() => {
        if (!user) return;
        loadProducts(page, { initial: products.length === 0 && page === 1 });
    }, [user, page, loadProducts]);

    useEffect(() => {
        if (!isSalon) return;
        setSalonError(null);
        salonsApi
            .getMe()
            .then(setSalonProfile)
            .catch((err: Error) => {
                const msg = err.message;
                if (msg !== 'Unauthorized' && msg !== 'Session expired. Please sign in again.') {
                    setSalonError(msg);
                }
            });
        shop?.refreshFavorites();
    }, [isSalon, shop]);

    useEffect(() => {
        if (!isDistributor) return;
        catalogApi.getBrands().then(setBrands).catch(console.error);
        catalogApi.getCategories().then(setCategories).catch(console.error);
    }, [isDistributor]);

    const buildProductPayload = (data: ProductFormData) => ({
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        stock: parseInt(data.stock, 10),
        sku: data.sku || null,
        brand_id: data.brand_id ? parseInt(data.brand_id, 10) : null,
        category_id: data.category_id ? parseInt(data.category_id, 10) : null,
        image: data.image || null,
        low_stock_threshold: parseInt(data.low_stock_threshold || '10', 10),
    });

    const closeProductModal = () => {
        setIsAddModalOpen(false);
        setEditingProduct(null);
        setFormData(emptyProductForm());
        setImageFile(null);
        setProductError(null);
    };

    const openEditProduct = (product: any) => {
        setEditingProduct(product);
        setImageFile(null);
        setFormData({
            name: product.name,
            description: product.description || '',
            price: String(product.price),
            stock: String(product.stock),
            sku: product.sku || '',
            brand_id: product.brand_id ? String(product.brand_id) : '',
            category_id: product.category_id ? String(product.category_id) : '',
            image: product.image || '',
            low_stock_threshold: String(product.low_stock_threshold ?? 10),
        });
    };

    const handleSaveProduct = async (data: ProductFormData) => {
        setSaving(true);
        setProductError(null);
        try {
            const payload = buildProductPayload(data);
            let productId = editingProduct?.id;
            if (editingProduct) {
                await productsApi.update(String(editingProduct.id), payload);
            } else {
                const res = await productsApi.create(payload);
                productId = res.productId;
            }
            if (imageFile && productId) {
                const up = await productsApi.uploadImage(String(productId), imageFile);
                payload.image = up.image;
            }
            await loadProducts(page);
            closeProductModal();
        } catch (err: unknown) {
            setProductError(err instanceof Error ? err.message : 'Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProduct = async (product: any) => {
        if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
        setProductError(null);
        try {
            await productsApi.delete(String(product.id));
            await loadProducts(page);
        } catch (err: unknown) {
            setProductError(err instanceof Error ? err.message : 'Failed to delete product');
        }
    };

    const handleAddToCartFromModal = () => {
        if (!orderProduct || !shop) return;
        shop.addToCart(orderProduct, orderQty);
        setOrderProduct(null);
        setOrderQty(1);
        shop.openCart();
    };

    const handleReorderLast = async () => {
        if (!shop) return;
        try {
            const { items } = await favoritesApi.getReorder();
            if (!items?.length) {
                setOrderError('No previous order to reorder');
                return;
            }
            for (const item of items) {
                const p = products.find((x) => x.id === item.product_id);
                if (p) shop.addToCart(p, item.quantity);
            }
            shop.openCart();
            setOrderError(null);
        } catch (err: unknown) {
            setOrderError(err instanceof Error ? err.message : 'Reorder failed');
        }
    };

    return (
        <motion.div layout className="space-y-8 pb-28">
            <motion.div layout className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                        {isSalon ? 'Order Supplies' : 'Products'}
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        {isSalon
                            ? 'Browse products from your distributor and place orders.'
                            : 'Manage your inventory and product catalog.'}
                    </p>
                    {isSalon && salonProfile && (
                        <p className="text-sm text-primary font-medium mt-1">
                            Ordering for: {salonProfile.salon_name}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {isSalon && shop && (
                        <>
                            <button
                                type="button"
                                onClick={() => shop.setShowFavoritesOnly(!showFavoritesOnly)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold border ${
                                    showFavoritesOnly
                                        ? 'bg-red-50 border-red-200 text-red-600'
                                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                                }`}
                            >
                                <Heart
                                    className={`w-5 h-5 ${showFavoritesOnly ? 'fill-red-500' : ''}`}
                                />
                                Wishlist only
                            </button>
                            <button
                                type="button"
                                onClick={handleReorderLast}
                                className="flex items-center gap-2 px-5 py-3 border border-primary text-primary rounded-2xl font-bold hover:bg-primary/5"
                            >
                                <RotateCcw className="w-5 h-5" />
                                Reorder last
                            </button>
                        </>
                    )}
                    {isDistributor && (
                        <button
                            type="button"
                            onClick={() => {
                                setFormData(emptyProductForm());
                                setIsAddModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Add Product
                        </button>
                    )}
                </div>
            </motion.div>

            {productsError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">
                        {productsError}
                        {(productsError === 'Unauthorized' ||
                            productsError.includes('Session expired')) && (
                            <span>
                                {' '}
                                <a href="/login" className="underline font-bold">
                                    Sign in again
                                </a>
                            </span>
                        )}
                    </p>
                </div>
            )}

            {salonError && isSalon && !productsError && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-200">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{salonError}</p>
                </div>
            )}

            {productError && isDistributor && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
                    {productError}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
                <motion.div layout className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search products by name or SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                    />
                </motion.div>
                {!isSalon && (
                    <button className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-700 dark:text-zinc-300 font-medium">
                        <Filter className="w-5 h-5" />
                        Filters
                    </button>
                )}
            </div>

            {loading ? (
                <ProductGridSkeleton count={8} />
            ) : products.length === 0 ? (
                <div className="text-center py-20 text-zinc-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-40" />
                    <p className="font-medium">No products found</p>
                    {isSalon && (
                        <p className="text-sm mt-2">Your distributor has not listed products yet.</p>
                    )}
                </div>
            ) : (
                <>
                <div className={`relative ${listLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <motion.div
                            layout
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden group"
                        >
                            <motion.div layout className="aspect-square bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                                <LazyImage
                                    src={productsApi.imageUrl(product.image)}
                                    alt={product.name}
                                />
                                {isSalon && (
                                    <button
                                        type="button"
                                        onClick={() => shop?.toggleFavorite(product.id)}
                                        className="absolute top-3 right-3 p-2 bg-white/95 dark:bg-zinc-900/95 rounded-xl shadow-lg"
                                    >
                                        <Heart
                                            className={`w-5 h-5 ${favoriteIds.has(product.id) ? 'fill-red-500 text-red-500' : 'text-zinc-400'}`}
                                        />
                                    </button>
                                )}
                                {isDistributor && (
                                    <motion.div layout className="absolute top-3 right-3 flex gap-2">
                                        <button
                                            type="button"
                                            title="Edit product"
                                            onClick={() => openEditProduct(product)}
                                            className="p-2 bg-white/95 dark:bg-zinc-900/95 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 hover:text-primary"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Delete product"
                                            onClick={() => handleDeleteProduct(product)}
                                            className="p-2 bg-white/95 dark:bg-zinc-900/95 rounded-xl shadow-lg border border-red-200 text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </motion.div>
                                )}
                            </motion.div>
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-2">
                                    <motion.div layout>
                                        <ProductBrandCategoryLine
                                            brandName={product.brand_name}
                                            categoryName={product.category_name}
                                        />
                                        <h3 className="font-bold text-zinc-900 dark:text-white truncate max-w-[150px]">
                                            {product.name}
                                        </h3>
                                    </motion.div>
                                    <p className="font-bold text-zinc-900 dark:text-white tabular-nums">
                                        {formatINR(product.price)}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <p className="text-zinc-500 dark:text-zinc-400">
                                        Stock:{' '}
                                        <span
                                            className={
                                                product.stock < 10
                                                    ? 'text-red-500 font-bold'
                                                    : 'text-zinc-900 dark:text-white font-medium'
                                            }
                                        >
                                            {product.stock}
                                        </span>
                                    </p>
                                    <p className="text-zinc-400 text-xs">SKU: {product.sku || 'N/A'}</p>
                                </div>
                                {isSalon && (
                                    <button
                                        type="button"
                                        disabled={product.stock < 1 || !!salonError}
                                        onClick={() => {
                                            setOrderProduct(product);
                                            setOrderQty(1);
                                            setOrderError(null);
                                        }}
                                        className="w-full mt-4 py-2.5 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        {product.stock < 1 ? 'Out of Stock' : 'Order Now'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
                {listLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}
                </div>
                {pagination && (
                    <Pagination pagination={pagination} onPageChange={setPage} />
                )}
                </>
            )}

            {/* Quick order modal (salon) */}
            <AnimatePresence>
                {orderProduct && isSalon && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOrderProduct(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <motion.div layout className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Add to Order</h2>
                                <button
                                    onClick={() => setOrderProduct(null)}
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </motion.div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <p className="font-bold text-zinc-900 dark:text-white">{orderProduct.name}</p>
                                    <p className="text-primary font-bold text-lg mt-1 tabular-nums">
                                        {formatINR(orderProduct.price)} each
                                    </p>
                                    <p className="text-sm text-zinc-500 mt-1">{orderProduct.stock} available</p>
                                </div>
                                <div className="flex items-center justify-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setOrderQty((q) => Math.max(1, q - 1))}
                                        className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl"
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="text-2xl font-bold w-12 text-center">{orderQty}</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOrderQty((q) => Math.min(orderProduct.stock, q + 1))
                                        }
                                        className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-center text-sm text-zinc-500 tabular-nums">
                                    Subtotal: {formatINR(parseFloat(orderProduct.price) * orderQty)}
                                </p>
                                {orderError && (
                                    <p className="text-sm text-red-500 text-center font-medium">{orderError}</p>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setOrderProduct(null)}
                                        className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 font-bold rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAddToCartFromModal}
                                        className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20"
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {(isAddModalOpen || editingProduct) && isDistributor && (
                    <DistributorProductModal
                        title={editingProduct ? 'Edit Product' : 'Add New Product'}
                        formData={formData}
                        setFormData={setFormData}
                        brands={brands}
                        categories={categories}
                        onBrandsChange={setBrands}
                        onCategoriesChange={setCategories}
                        saving={saving}
                        onClose={closeProductModal}
                        onSubmit={handleSaveProduct}
                        onImageFile={setImageFile}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
