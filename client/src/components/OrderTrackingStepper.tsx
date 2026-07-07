'use client';

import { ORDER_TRACK_STEPS, getTrackStepIndex, type OrderStatus, type PaymentStatus } from '@/lib/orderTracking';
import { Check } from 'lucide-react';

export function OrderTrackingStepper({
    status,
    paymentStatus,
    compact = false,
}: {
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    compact?: boolean;
}) {
    if (status === 'rejected') {
        return <p className="text-xs font-bold text-red-600 uppercase">Order rejected</p>;
    }

    const activeIndex = getTrackStepIndex(status, paymentStatus);

    return (
        <div>
            {!compact && (
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Track order</p>
            )}
            <div className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-1 sm:grid-cols-5 gap-3'}>
                {ORDER_TRACK_STEPS.map((step, index) => {
                    const done = index <= activeIndex;
                    const current = index === activeIndex;
                    return (
                        <div
                            key={step.key}
                            className={`flex items-center gap-2 ${compact ? '' : 'flex-col text-center'}`}
                        >
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border-2 ${
                                    done
                                        ? 'bg-primary border-primary text-white'
                                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'
                                } ${current ? 'ring-4 ring-primary/20' : ''}`}
                            >
                                {done ? <Check className="w-4 h-4" /> : index + 1}
                            </div>
                            <span
                                className={`text-xs font-medium leading-tight ${
                                    done ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'
                                }`}
                            >
                                {compact ? step.label.split(' ').slice(0, 2).join(' ') : step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
