/** Stable date for SSR + client (en-IN). */
export function formatDate(value: string | Date): string {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN');
}

/** Format amount as Indian Rupees (uses Intl — never paste rupee symbol in source files). */
export function formatINR(amount: number | string): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (Number.isNaN(value)) return 'Rs.\u00a00';
    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);
    } catch {
        return `Rs.\u00a0${value.toLocaleString('en-IN')}`;
    }
}
