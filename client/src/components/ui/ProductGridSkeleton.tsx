export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-pulse"
                >
                    <div className="aspect-square bg-zinc-200 dark:bg-zinc-800" />
                    <div className="p-5 space-y-3">
                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2" />
                        <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    );
}
