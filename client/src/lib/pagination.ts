export type PaginationMeta = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export type PaginatedResponse<T> = {
    data: T[];
    pagination: PaginationMeta;
};

export function isPaginated<T>(res: T[] | PaginatedResponse<T>): res is PaginatedResponse<T> {
    return (
        res !== null &&
        typeof res === 'object' &&
        !Array.isArray(res) &&
        'data' in res &&
        'pagination' in res
    );
}

export function buildPageQuery(
    params: Record<string, string | number | boolean | undefined | null>
): string {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            q.set(key, String(value));
        }
    });
    const s = q.toString();
    return s ? `?${s}` : '';
}
