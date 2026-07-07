const db = require('../config/db');

async function getSalonIdForUser(userId) {
    const [rows] = await db.execute('SELECT id, distributor_id FROM salons WHERE user_id = ?', [userId]);
    return rows[0] || null;
}

/**
 * Resolve salon row for a salon login; auto-link when distributor created salon without user_id.
 */
async function getOrLinkSalonForUser(user) {
    let salon = await getSalonIdForUser(user.id);
    if (salon) return salon;

    const distributorId = user.distributor_id;
    if (!distributorId) return null;

    if (user.name) {
        const [byName] = await db.execute(
            `SELECT id, distributor_id FROM salons
             WHERE distributor_id = ? AND salon_name = ? LIMIT 1`,
            [distributorId, user.name]
        );
        if (byName.length) {
            await db.execute('UPDATE salons SET user_id = ? WHERE id = ? AND (user_id IS NULL OR user_id = ?)', [
                user.id,
                byName[0].id,
                user.id,
            ]);
            return { id: byName[0].id, distributor_id: byName[0].distributor_id };
        }
    }

    const [orphans] = await db.execute(
        `SELECT id, distributor_id FROM salons
         WHERE distributor_id = ? AND user_id IS NULL
         ORDER BY id ASC LIMIT 2`,
        [distributorId]
    );
    if (orphans.length === 1) {
        await db.execute('UPDATE salons SET user_id = ? WHERE id = ?', [user.id, orphans[0].id]);
        return { id: orphans[0].id, distributor_id: orphans[0].distributor_id };
    }

    return null;
}

async function getSalesmanIdForUser(userId) {
    const [rows] = await db.execute('SELECT id, distributor_id FROM salesmen WHERE user_id = ?', [userId]);
    return rows[0] || null;
}

async function getAssignedSalonIds(salesmanId) {
    const [rows] = await db.execute(
        'SELECT salon_id FROM salesman_salons WHERE salesman_id = ?',
        [salesmanId]
    );
    return rows.map((r) => r.salon_id);
}

/** Salesman sees only assigned salons when assignments exist; else all distributor salons (legacy). */
async function salesmanSalonFilterClause(salesmanId, distributorId, alias = 'o') {
    const assigned = await getAssignedSalonIds(salesmanId);
    if (assigned.length === 0) {
        return { clause: ` AND ${alias}.distributor_id = ?`, params: [distributorId] };
    }
    const placeholders = assigned.map(() => '?').join(',');
    return {
        clause: ` AND ${alias}.distributor_id = ? AND ${alias}.salon_id IN (${placeholders})`,
        params: [distributorId, ...assigned],
    };
}

async function canAccessOrder(req, order) {
    if (req.user.role === 'super_admin') return true;
    if (req.user.role === 'distributor') {
        return order.distributor_id === req.user.distributor_id;
    }
    if (req.user.role === 'salon') {
        const salon = await getSalonIdForUser(req.user.id);
        return salon && order.salon_id === salon.id;
    }
    if (req.user.role === 'salesman') {
        const sm = await getSalesmanIdForUser(req.user.id);
        if (!sm || order.distributor_id !== sm.distributor_id) return false;
        const assigned = await getAssignedSalonIds(sm.id);
        if (assigned.length === 0) return true;
        return assigned.includes(order.salon_id);
    }
    return false;
}

async function calculateSalonOutstanding(salonId) {
    const [rows] = await db.execute(
        `SELECT COALESCE(SUM(
            GREATEST(o.total_amount - COALESCE((
                SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id
            ), 0), 0)
        ), 0) AS outstanding
         FROM orders o
         WHERE o.salon_id = ?
           AND o.payment_status IN ('pending', 'partial')
           AND o.status NOT IN ('rejected', 'pending')`,
        [salonId]
    );
    return parseFloat(rows[0].outstanding);
}

module.exports = {
    getSalonIdForUser,
    getOrLinkSalonForUser,
    getSalesmanIdForUser,
    getAssignedSalonIds,
    salesmanSalonFilterClause,
    canAccessOrder,
    calculateSalonOutstanding,
};
