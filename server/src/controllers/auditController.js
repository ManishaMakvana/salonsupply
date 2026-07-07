const db = require('../config/db');
const { parsePagination, executePaginated } = require('../utils/pagination');

const getAuditLogs = async (req, res) => {
    try {
        const baseFrom = 'FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id';
        const params = [];
        let whereClause = '';

        if (req.user.role === 'distributor') {
            whereClause = ` WHERE JSON_EXTRACT(a.details, '$.distributor_id') = ? OR a.user_id IN (
                SELECT id FROM users WHERE distributor_id = ?
            )`;
            params.push(req.user.distributor_id, req.user.distributor_id);
        }

        const orderBy = ' ORDER BY a.created_at DESC';
        const { page, limit, offset, wantsPagination } = parsePagination(req.query, {
            defaultLimit: 20,
            maxLimit: 50,
        });

        if (!wantsPagination) {
            const [rows] = await db.execute(
                `SELECT a.*, u.name AS user_name, u.email AS user_email ${baseFrom}${whereClause}${orderBy} LIMIT 100`,
                params
            );
            return res.json(rows);
        }

        const result = await executePaginated(db, {
            dataSql: `SELECT a.*, u.name AS user_name, u.email AS user_email ${baseFrom}${whereClause}${orderBy}`,
            countSql: `SELECT COUNT(*) AS total ${baseFrom}${whereClause}`,
            params,
            page,
            limit,
            offset,
        });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAuditLogs };
