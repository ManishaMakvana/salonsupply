function parsePagination(query, options = {}) {
    const defaultLimit = options.defaultLimit ?? 12;
    const maxLimit = options.maxLimit ?? 50;
    const wantsPagination = query.page != null || query.limit != null;
    const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
    const limit = Math.min(
        maxLimit,
        Math.max(1, parseInt(String(query.limit || defaultLimit), 10) || defaultLimit)
    );
    return {
        page,
        limit,
        offset: (page - 1) * limit,
        wantsPagination,
    };
}

async function executePaginated(db, { dataSql, countSql, params, page, limit, offset }) {
    const [countRows] = await db.execute(countSql, params);
    const total = Number(countRows[0]?.total ?? 0);
    const [rows] = await db.execute(`${dataSql} LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return {
        data: rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit) || 1),
        },
    };
}

function sendListOrPaginated(res, rows, paginationMeta) {
    if (paginationMeta) {
        return res.json({ data: rows, pagination: paginationMeta });
    }
    return res.json(rows);
}

module.exports = { parsePagination, executePaginated, sendListOrPaginated };
