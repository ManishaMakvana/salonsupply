export type OrderStatus = 'pending' | 'approved' | 'processing' | 'delivered' | 'rejected';
export type PaymentStatus = 'pending' | 'partial' | 'paid';

export const ORDER_TRACK_STEPS = [
    { key: 'placed', label: 'Order placed', statuses: ['pending', 'approved', 'processing', 'delivered', 'rejected'] },
    { key: 'approved', label: 'Confirmed', statuses: ['approved', 'processing', 'delivered'] },
    { key: 'processing', label: 'Out for delivery', statuses: ['processing', 'delivered'] },
    { key: 'delivered', label: 'Delivered', statuses: ['delivered'] },
    { key: 'paid', label: 'Payment collected', statuses: [] as string[] },
] as const;

export function getTrackStepIndex(status: OrderStatus, paymentStatus: PaymentStatus): number {
    if (status === 'rejected') return -1;
    if (paymentStatus === 'paid') return 4;
    if (status === 'delivered') return 3;
    if (status === 'processing') return 2;
    if (status === 'approved') return 1;
    return 0;
}

export function getPaymentLabel(paymentStatus: PaymentStatus, paidAmount?: number, totalAmount?: number) {
    if (paymentStatus === 'paid') return 'Paid';
    if (paymentStatus === 'partial') return `Partial${paidAmount != null && totalAmount ? ` (${Math.round((paidAmount / totalAmount) * 100)}%)` : ''}`;
    return 'Unpaid';
}
