'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Plus } from 'lucide-react';
import { catalog as catalogApi } from '@/lib/api';

export type ProductFormData = {
    name: string;
    description: string;
    price: string;
    stock: string;
    sku: string;
    brand_id: string;
    category_id: string;
    image: string;
    low_stock_threshold: string;
};

type Props = {
    title: string;
    formData: ProductFormData;
    setFormData: (data: ProductFormData) => void;
    brands: { id: number; name: string }[];
    categories: { id: number; name: string }[];
    onBrandsChange: (brands: { id: number; name: string }[]) => void;
    onCategoriesChange: (categories: { id: number; name: string }[]) => void;
    saving: boolean;
    onClose: () => void;
    onSubmit: (data: ProductFormData) => void | Promise<void>;
    onImageFile?: (file: File | null) => void;
};

export default function DistributorProductModal({
    title,
    formData,
    setFormData,
    brands,
    categories,
    onBrandsChange,
    onCategoriesChange,
    saving,
    onClose,
    onSubmit,
    onImageFile,
}: Props) {
    const [newBrand, setNewBrand] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [catalogSuccess, setCatalogSuccess] = useState<string | null>(null);

    const resolveBrandId = async (draft: ProductFormData): Promise<string> => {
        const typed = newBrand.trim();
        if (typed) {
            const existing = brands.find((b) => b.name.toLowerCase() === typed.toLowerCase());
            if (existing) return String(existing.id);
            const res = await catalogApi.createBrand({ name: typed });
            const list = await catalogApi.getBrands();
            onBrandsChange(list);
            setNewBrand('');
            return String(res.brandId);
        }
        return draft.brand_id;
    };

    const resolveCategoryId = async (draft: ProductFormData): Promise<string> => {
        const typed = newCategory.trim();
        if (typed) {
            const existing = categories.find((c) => c.name.toLowerCase() === typed.toLowerCase());
            if (existing) return String(existing.id);
            const res = await catalogApi.createCategory({ name: typed });
            const list = await catalogApi.getCategories();
            onCategoriesChange(list);
            setNewCategory('');
            return String(res.categoryId);
        }
        return draft.category_id;
    };

    const addBrand = async () => {
        if (!newBrand.trim()) {
            setCatalogError('Type a brand name first, then click Add.');
            return;
        }
        setCatalogError(null);
        setCatalogSuccess(null);
        try {
            const label = newBrand.trim();
            const brandId = await resolveBrandId(formData);
            setFormData({ ...formData, brand_id: brandId });
            setCatalogSuccess(`Brand "${label}" added and selected.`);
        } catch (err) {
            setCatalogError(err instanceof Error ? err.message : 'Could not add brand');
        }
    };

    const addCategory = async () => {
        if (!newCategory.trim()) {
            setCatalogError('Type a category name first, then click Add.');
            return;
        }
        setCatalogError(null);
        setCatalogSuccess(null);
        try {
            const label = newCategory.trim();
            const categoryId = await resolveCategoryId(formData);
            setFormData({ ...formData, category_id: categoryId });
            setCatalogSuccess(`Category "${label}" added and selected.`);
        } catch (err) {
            setCatalogError(err instanceof Error ? err.message : 'Could not add category');
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCatalogError(null);
        setCatalogSuccess(null);
        try {
            const brand_id = await resolveBrandId(formData);
            const category_id = await resolveCategoryId(formData);
            const merged: ProductFormData = { ...formData, brand_id, category_id };
            setFormData(merged);
            await onSubmit(merged);
        } catch (err) {
            setCatalogError(err instanceof Error ? err.message : 'Could not save product');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative z-10"
            >
                <motion.div layout className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{title}</h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl">
                        <X className="w-5 h-5" />
                    </button>
                </motion.div>
                <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                    {catalogError && (
                        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">{catalogError}</p>
                    )}
                    {catalogSuccess && (
                        <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">{catalogSuccess}</p>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Product Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-white"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <motion.div layout className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Brand</label>
                            <select
                                value={formData.brand_id}
                                onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-white"
                            >
                                <option value="">None</option>
                                {brands.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newBrand}
                                    onChange={(e) => setNewBrand(e.target.value)}
                                    placeholder="New brand"
                                    className="flex-1 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border rounded-lg dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={addBrand}
                                    className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold whitespace-nowrap flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </div>
                        </motion.div>
                        <motion.div layout className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Category</label>
                            <select
                                value={formData.category_id}
                                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-white"
                            >
                                <option value="">None</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder="New category"
                                    className="flex-1 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border rounded-lg dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={addCategory}
                                    className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold whitespace-nowrap flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </div>
                        </motion.div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Price</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Stock</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Low stock alert at</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.low_stock_threshold}
                                onChange={(e) =>
                                    setFormData({ ...formData, low_stock_threshold: e.target.value })
                                }
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">SKU</label>
                        <input
                            type="text"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Product image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => onImageFile?.(e.target.files?.[0] ?? null)}
                            className="w-full text-sm text-zinc-600"
                        />
                        <input
                            type="url"
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            placeholder="Or paste image URL"
                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-white"
                        />
                        {formData.image && (
                            <img src={formData.image.startsWith('/') ? `http://localhost:5000${formData.image}` : formData.image} alt="Preview" className="w-full h-32 object-cover rounded-xl border" />
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Description</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-white"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 font-bold rounded-xl">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
