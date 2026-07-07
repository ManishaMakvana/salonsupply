/** Brand + category line for product cards (avoids broken "Â·" encoding). */
export function ProductBrandCategoryLine({
    brandName,
    categoryName,
}: {
    brandName?: string | null;
    categoryName?: string | null;
}) {
    const brand = brandName?.trim() || 'No brand';
    const category = categoryName?.trim() || 'Uncategorized';

    return (
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-1.5 flex-wrap">
            <span>{brand}</span>
            <span className="text-zinc-400 dark:text-zinc-500 font-normal normal-case select-none" aria-hidden>
                {'\u00B7'}
            </span>
            <span>{category}</span>
        </p>
    );
}
