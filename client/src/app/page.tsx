'use client';

import { motion } from 'framer-motion';
import { Scissors, Package, Truck, CreditCard, ChevronRight, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 glass-morphism border-b border-zinc-200 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary p-1.5 rounded-lg text-white">
                            <Scissors className="w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">SalonSupply</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-primary dark:text-zinc-400">Features</a>
                        <a href="#solutions" className="text-sm font-medium text-zinc-600 hover:text-primary dark:text-zinc-400">Solutions</a>
                        <a href="#pricing" className="text-sm font-medium text-zinc-600 hover:text-primary dark:text-zinc-400">Pricing</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-semibold text-zinc-900 dark:text-white hover:text-primary">
                            Sign In
                        </Link>
                        <Link href="/login" className="bg-primary text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute top-0 right-0 -z-10 opacity-10 dark:opacity-20 pointer-events-none">
                    <div className="w-[800px] h-[800px] bg-primary rounded-full blur-[120px]" />
                </div>

                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold"
                        >
                            <Star className="w-4 h-4 fill-primary" />
                            The #1 Supply Chain OS for Salons
                        </motion.div>
                        
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-white max-w-4xl mx-auto leading-[1.1]"
                        >
                            Digitize Your <span className="premium-text-gradient">Salon Supply Chain</span> Operations
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto"
                        >
                            Connect Salons, Distributors, and Salesmen on a single platform. 
                            Automate orders, inventory, and payments with ease.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        >
                            <Link href="/login" className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-xl shadow-primary/25 hover:scale-105 transition-transform flex items-center justify-center gap-2">
                                Start Free Trial <ArrowRight className="w-5 h-5" />
                            </Link>
                            <a href="#" className="w-full sm:w-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                Book a Demo
                            </a>
                        </motion.div>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="mt-20 relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-950 via-transparent to-transparent z-10" />
                        <div className="glass-morphism rounded-3xl p-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 aspect-video md:aspect-[21/9] overflow-hidden">
                            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                <div className="text-center">
                                    <Package className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                                    <p className="text-zinc-400 dark:text-zinc-600 font-medium italic">Interactive Dashboard Preview coming soon...</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Package,
                                title: "Smart Inventory",
                                desc: "Track stock levels in real-time. Auto-notifications for low stock and expiration dates."
                            },
                            {
                                icon: Truck,
                                title: "Order Workflow",
                                desc: "Seamless order collection from salons to distributors. Status updates at every step."
                            },
                            {
                                icon: CreditCard,
                                title: "Payment Tracking",
                                desc: "Manage credit limits, partial payments, and digital invoices in one central dashboard."
                            }
                        ].map((feature, i) => (
                            <motion.div 
                                key={i}
                                whileHover={{ y: -5 }}
                                className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
                            >
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">{feature.title}</h3>
                                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-4">
                <div className="max-w-5xl mx-auto premium-gradient rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 relative z-10">Ready to transform your beauty supply business?</h2>
                    <p className="text-white/80 text-lg mb-12 max-w-2xl mx-auto relative z-10">Join 500+ distributors and salons already using SalonSupply to grow their operations.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                        <Link href="/login" className="bg-white text-primary px-10 py-4 rounded-2xl text-lg font-bold shadow-xl hover:scale-105 transition-transform">
                            Get Started Now
                        </Link>
                        <a href="#" className="text-white font-bold flex items-center gap-2 hover:underline">
                            Contact Sales <ChevronRight className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </section>

            <footer className="py-12 border-t border-zinc-200 dark:border-zinc-800 text-center">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">© 2026 SalonSupply SaaS Platform. All rights reserved.</p>
            </footer>
        </div>
    );
}
