const db = require('../config/db');
const { calculateSalonOutstanding, getOrLinkSalonForUser } = require('../utils/accessHelper');

const getSalons = async (req, res) => {
    try {
        let query = `SELECT s.*,
            COALESCE((
                SELECT SUM(GREATEST(o.total_amount - COALESCE((
                    SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id
                ), 0), 0))
                FROM orders o
                WHERE o.salon_id = s.id
                  AND o.payment_status IN ('pending', 'partial')
                  AND o.status NOT IN ('rejected', 'pending')
            ), 0) AS outstanding
            FROM salons s`;
        const params = [];

        if (req.user.role === 'distributor') {
            query += ' WHERE s.distributor_id = ?';
            params.push(req.user.distributor_id);
        }

        query += ' ORDER BY s.salon_name ASC';
        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createSalon = async (req, res) => {
    const { salon_name, owner_name, phone, address, credit_limit } = req.body;
    const distributor_id = req.user.distributor_id;

    try {
        const [result] = await db.execute(
            'INSERT INTO salons (distributor_id, salon_name, owner_name, phone, address, credit_limit) VALUES (?, ?, ?, ?, ?, ?)',
            [
                distributor_id,
                salon_name,
                owner_name,
                phone,
                address,
                credit_limit ?? 50000,
            ]
        );
        res.status(201).json({ message: 'Salon created', salonId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getMySalon = async (req, res) => {
    try {
        if (req.user.role !== 'salon') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const linked = await getOrLinkSalonForUser(req.user);
        if (!linked) {
            return res.status(404).json({ error: 'Salon profile not linked. Contact your distributor.' });
        }

        const [rows] = await db.execute('SELECT * FROM salons WHERE id = ?', [linked.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Salon profile not found.' });
        }

        const salon = rows[0];
        const outstanding = await calculateSalonOutstanding(salon.id);
        const creditLimit = parseFloat(salon.credit_limit ?? 50000);
        const availableCredit = Math.max(0, creditLimit - outstanding);

        res.json({
            ...salon,
            credit_limit: creditLimit,
            outstanding,
            available_credit: availableCredit,
            credit_used_percent: creditLimit > 0 ? Math.min(100, (outstanding / creditLimit) * 100) : 0,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateSalon = async (req, res) => {
    const { id } = req.params;
    const { salon_name, owner_name, phone, address, credit_limit } = req.body;

    try {
        const [existing] = await db.execute('SELECT * FROM salons WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Salon not found' });

        if (req.user.role === 'distributor' && existing[0].distributor_id !== req.user.distributor_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await db.execute(
            `UPDATE salons SET salon_name = COALESCE(?, salon_name),
             owner_name = COALESCE(?, owner_name),
             phone = COALESCE(?, phone),
             address = COALESCE(?, address),
             credit_limit = COALESCE(?, credit_limit)
             WHERE id = ?`,
            [salon_name, owner_name, phone, address, credit_limit, id]
        );
        res.json({ message: 'Salon updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getSalons, createSalon, getMySalon, updateSalon };
