export function TableRowsSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                    {Array.from({ length: cols }).map((__, j) => (
                        <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full max-w-[120px]" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}
