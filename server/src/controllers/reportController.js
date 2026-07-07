const db = require('../config/db');

async function getDistributorId(req) {
    if (req.user.role === 'distributor') return req.user.distributor_id;
    if (req.user.role === 'salesman') {
        const [rows] = await db.execute('SELECT distributor_id FROM salesmen WHERE user_id = ?', [
            req.user.id,
        ]);
        return rows[0]?.distributor_id;
    }
    if (req.user.role === 'super_admin' && req.query.distributor_id) {
        return parseInt(req.query.distributor_id, 10);
    }
    if (req.user.role === 'super_admin') {
        const [d] = await db.execute('SELECT id FROM distributors ORDER BY id LIMIT 1');
        return d[0]?.id;
    }
    return null;
}

const getReports = async (req, res) => {
    try {
        const distributorId = await getDistributorId(req);
        if (!distributorId && req.user.role !== 'super_admin') {
            return res.status(400).json({ error: 'Distributor scope required' });
        }

        const distWhere = distributorId ? 'WHERE o.distributor_id = ?' : '';
        const params = distributorId ? [distributorId] : [];

        const [bySalon] = await db.execute(
            `SELECT s.id, s.salon_name,
                COUNT(o.id) AS order_count,
                COALESCE(SUM(o.total_amount), 0) AS total_sales,
                COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) AS paid_sales
             FROM salons s
             LEFT JOIN orders o ON o.salon_id = s.id AND o.status != 'rejected'
             ${distributorId ? 'WHERE s.distributor_id = ?' : ''}
             GROUP BY s.id, s.salon_name
             ORDER BY total_sales DESC`,
            distributorId ? [distributorId] : []
        );

        const [bySalesman] = await db.execute(
            `SELECT sm.id, sm.name,
                COUNT(DISTINCT o.id) AS order_count,
                COALESCE(SUM(o.total_amount), 0) AS total_sales
             FROM salesmen sm
             LEFT JOIN orders o ON o.salesman_id = sm.id AND o.status != 'rejected'
             ${distributorId ? 'WHERE sm.distributor_id = ?' : ''}
             GROUP BY sm.id, sm.name
             ORDER BY total_sales DESC`,
            distributorId ? [distributorId] : []
        );

        const [collections] = await db.execute(
            `SELECT COALESCE(SUM(p.amount), 0) AS total_collected
             FROM payments p
             JOIN orders o ON p.order_id = o.id
             ${distWhere}`,
            params
        );

        const [pending] = await db.execute(
            `SELECT COALESCE(SUM(
                GREATEST(o.total_amount - COALESCE((SELECT SUM(p2.amount) FROM payments p2 WHERE p2.order_id = o.id), 0), 0)
            ), 0) AS pending_amount
             FROM orders o
             ${distWhere ? distWhere + " AND o.payment_status IN ('pending','partial') AND o.status NOT IN ('rejected','pending')" : "WHERE o.payment_status IN ('pending','partial') AND o.status NOT IN ('rejected','pending')"}`,
            params
        );

        const [topSkus] = await db.execute(
            `SELECT p.id, p.name, p.sku, SUM(oi.quantity) AS units_sold,
                COALESCE(SUM(oi.total), 0) AS revenue
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             JOIN orders o ON o.id = oi.order_id AND o.status != 'rejected'
             ${distWhere}
             GROUP BY p.id, p.name, p.sku
             ORDER BY units_sold DESC
             LIMIT 10`,
            params
        );

        res.json({
            summary: {
                total_collected: parseFloat(collections[0].total_collected),
                pending_amount: parseFloat(pending[0].pending_amount),
            },
            sales_by_salon: bySalon,
            sales_by_salesman: bySalesman,
            top_products: topSkus,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getReports };
