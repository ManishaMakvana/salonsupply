'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { salesmen as salesmenApi, salons as salonsApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { formatINR } from '@/lib/format';
import { UserCircle, Plus, Phone, Map, MapPin, X, Loader2, Award, Eye } from 'lucide-react';

export default function SalesmenPage() {
    const router = useRouter();
    const [salesmen, setSalesmen] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [routesModal, setRoutesModal] = useState<{
        salesman: { id: number; name: string; phone: string };
        salons: { id: number; salon_name: string; address?: string; phone?: string; order_count: number; last_order_at?: string }[];
    } | null>(null);
    const [routesLoading, setRoutesLoading] = useState(false);
    const [routesError, setRoutesError] = useState<string | null>(null);
    const [assignModal, setAssignModal] = useState<{ salesman: { id: number; name: string } } | null>(null);
    const [allSalons, setAllSalons] = useState<any[]>([]);
    const [selectedSalonIds, setSelectedSalonIds] = useState<number[]>([]);
    const [assignSaving, setAssignSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: ''
    });

    useEffect(() => {
        loadSalesmen();
    }, []);

    const loadSalesmen = async () => {
        try {
            const data = await salesmenApi.getAll();
            setSalesmen(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openAssign = async (salesman: { id: number; name: string }) => {
        setAssignModal({ salesman });
        try {
            const [salonList, assignments] = await Promise.all([
                salonsApi.getAll(),
                salesmenApi.getAssignments(salesman.id),
            ]);
            setAllSalons(salonList);
            setSelectedSalonIds(assignments.salon_ids || []);
        } catch (err) {
            console.error(err);
        }
    };

    const saveAssignments = async () => {
        if (!assignModal) return;
        setAssignSaving(true);
        try {
            await salesmenApi.assignSalons(assignModal.salesman.id, selectedSalonIds);
            setAssignModal(null);
            await loadSalesmen();
        } catch (err) {
            console.error(err);
        } finally {
            setAssignSaving(false);
        }
    };

    const openRoutes = async (salesman: { id: number; name: string }) => {
        setRoutesLoading(true);
        setRoutesError(null);
        setRoutesModal({ salesman: { id: salesman.id, name: salesman.name, phone: '' }, salons: [] });
        try {
            const data = await salesmenApi.getRoutes(salesman.id);
            setRoutesModal({
                salesman: data.salesman,
                salons: data.salons ?? [],
            });
        } catch (err) {
            setRoutesError(err instanceof Error ? err.message : 'Failed to load routes');
        } finally {
            setRoutesLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        try {
            await salesmenApi.create(formData);
            await loadSalesmen();
            setIsAddModalOpen(false);
            setFormData({ name: '', phone: '' });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Salesmen</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Track and manage your field sales team.</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Add Salesman
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : salesmen.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                    <UserCircle className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                    <p className="font-bold text-zinc-900 dark:text-white">No salesmen yet</p>
                    <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
                        Add field reps with &quot;Add Salesman&quot;. If Mike Salesman was only a login user, register him here too.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {salesmen.map((salesman) => (
                        <motion.div 
                            key={salesman.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow relative"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Award className="w-20 h-20" />
                            </div>
                            
                            <div className="flex items-center gap-4 mb-6 relative z-10">
                                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-xl">
                                    {salesman.name[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white text-lg">{salesman.name}</h3>
                                    <p className="text-sm text-zinc-500">
                                        {salesman.assigned_salon_count
                                            ? `${salesman.assigned_salon_count} salons assigned`
                                            : 'All distributor salons (no territory set)'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8 relative z-10">
                                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                                    <Phone className="w-4 h-4 text-primary" />
                                    <span className="font-medium">{salesman.phone}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Target</p>
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">{formatINR(500000)}</p>
                                    </div>
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Achieved</p>
                                        <p className="text-sm font-bold text-primary tabular-nums">{formatINR(320000)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 relative z-10">
                                <button
                                    type="button"
                                    onClick={() => openAssign(salesman)}
                                    className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 text-sm font-bold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                >
                                    Assign salons
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openRoutes(salesman)}
                                    className="flex-1 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Map className="w-4 h-4" />
                                    Routes
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Add New Salesman</h2>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Full Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                                        placeholder="e.g. Robert Smith"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Phone Number</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                                        placeholder="+91 XXXXX XXXXX"
                                    />
                                </div>
                                <div className="pt-2 flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Salesman'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {routesModal && (
                    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setRoutesModal(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden max-h-[85vh] flex flex-col"
                        >
                            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                        Route plan — {routesModal.salesman.name}
                                    </h2>
                                    <p className="text-sm text-zinc-500 mt-1">Salons in this salesman&apos;s territory</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRoutesModal(null)}
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1">
                                {routesLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : routesError ? (
                                    <p className="text-sm text-red-500 text-center py-8">{routesError}</p>
                                ) : routesModal.salons.length === 0 ? (
                                    <p className="text-sm text-zinc-500 text-center py-8">No salons on this route yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {routesModal.salons.map((salon) => (
                                            <div
                                                key={salon.id}
                                                className="flex items-center justify-between gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800"
                                            >
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                                            {salon.salon_name}
                                                        </p>
                                                        {salon.address && (
                                                            <p className="text-xs text-zinc-500 truncate">{salon.address}</p>
                                                        )}
                                                        <p className="text-xs text-zinc-400 mt-1">
                                                            {salon.order_count} order{salon.order_count === 1 ? '' : 's'}
                                                            {salon.last_order_at
                                                                ? ` · Last: ${new Date(salon.last_order_at).toLocaleDateString('en-IN')}`
                                                                : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRoutesModal(null);
                                                        router.push(`/dashboard/orders?salon_id=${salon.id}`);
                                                    }}
                                                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:opacity-90"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Orders
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {assignModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setAssignModal(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 p-6 max-h-[80vh] overflow-y-auto"
                        >
                            <h2 className="text-xl font-bold mb-2">Assign salons — {assignModal.salesman.name}</h2>
                            <p className="text-sm text-zinc-500 mb-4">
                                Select salons this rep covers. Empty = all distributor salons (legacy).
                            </p>
                            <div className="space-y-2 mb-6">
                                {allSalons.map((s) => (
                                    <label
                                        key={s.id}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedSalonIds.includes(s.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedSalonIds((prev) => [...prev, s.id]);
                                                } else {
                                                    setSelectedSalonIds((prev) =>
                                                        prev.filter((id) => id !== s.id)
                                                    );
                                                }
                                            }}
                                        />
                                        <span className="text-sm font-medium">{s.salon_name}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAssignModal(null)}
                                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 font-bold rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={assignSaving}
                                    onClick={saveAssignments}
                                    className="flex-1 py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
                                >
                                    {assignSaving ? 'Saving…' : 'Save territory'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
