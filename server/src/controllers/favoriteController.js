const db = require('../config/db');
const { getOrLinkSalonForUser } = require('../utils/accessHelper');

async function resolveSalonId(req) {
    if (req.user.role === 'salon') {
        const salon = await getOrLinkSalonForUser(req.user);
        return salon?.id ?? null;
    }
    return req.query.salon_id ? parseInt(req.query.salon_id, 10) : null;
}

const getFavorites = async (req, res) => {
    try {
        const salonId = await resolveSalonId(req);
        if (!salonId) return res.status(400).json({ error: 'Salon not found' });

        const [rows] = await db.execute(
            `SELECT f.id, f.product_id, f.quantity, p.name, p.price, p.stock, p.image, p.sku,
                    b.name AS brand_name, c.name AS category_name
             FROM salon_favorites f
             JOIN products p ON p.id = f.product_id
             LEFT JOIN brands b ON p.brand_id = b.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE f.salon_id = ?
             ORDER BY f.created_at DESC`,
            [salonId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const addFavorite = async (req, res) => {
    const { product_id, quantity = 1 } = req.body;
    try {
        const salonId = await resolveSalonId(req);
        if (!salonId) return res.status(400).json({ error: 'Salon not found' });

        await db.execute(
            `INSERT INTO salon_favorites (salon_id, product_id, quantity)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
            [salonId, product_id, quantity]
        );
        res.status(201).json({ message: 'Added to favorites' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const removeFavorite = async (req, res) => {
    try {
        const salonId = await resolveSalonId(req);
        if (!salonId) return res.status(400).json({ error: 'Salon not found' });

        await db.execute('DELETE FROM salon_favorites WHERE salon_id = ? AND product_id = ?', [
            salonId,
            req.params.productId,
        ]);
        res.json({ message: 'Removed from favorites' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/** Build cart items from last delivered order */
const getReorderSuggestion = async (req, res) => {
    try {
        const salonId = await resolveSalonId(req);
        if (!salonId) return res.status(400).json({ error: 'Salon not found' });

        const [orders] = await db.execute(
            `SELECT id FROM orders WHERE salon_id = ? AND status = 'delivered'
             ORDER BY created_at DESC LIMIT 1`,
            [salonId]
        );
        if (orders.length === 0) {
            return res.json({ source: 'none', items: [] });
        }

        const [items] = await db.execute(
            `SELECT oi.product_id, oi.quantity, p.name, p.price, p.stock, p.image
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ?`,
            [orders[0].id]
        );
        res.json({ source: 'last_order', order_id: orders[0].id, items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getFavorites, addFavorite, removeFavorite, getReorderSuggestion };
