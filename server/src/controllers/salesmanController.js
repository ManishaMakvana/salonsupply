const db = require('../config/db');
const { getAssignedSalonIds } = require('../utils/accessHelper');

const getSalesmen = async (req, res) => {
    try {
        let query = `SELECT sm.*,
            (SELECT COUNT(*) FROM salesman_salons ss WHERE ss.salesman_id = sm.id) AS assigned_salon_count
            FROM salesmen sm`;
        const params = [];

        if (req.user.role === 'distributor') {
            query += ' WHERE sm.distributor_id = ?';
            params.push(req.user.distributor_id);
        }

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createSalesman = async (req, res) => {
    const { name, phone } = req.body;
    const distributor_id = req.user.distributor_id;

    try {
        const [result] = await db.execute(
            'INSERT INTO salesmen (distributor_id, name, phone) VALUES (?, ?, ?)',
            [distributor_id, name, phone]
        );
        res.status(201).json({ message: 'Salesman created', salesmanId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getSalesmanRoutes = async (req, res) => {
    const salesmanId = req.params.id;

    try {
        const [salesmanRows] = await db.execute('SELECT * FROM salesmen WHERE id = ?', [salesmanId]);
        if (salesmanRows.length === 0) {
            return res.status(404).json({ error: 'Salesman not found' });
        }

        const salesman = salesmanRows[0];

        if (req.user.role === 'distributor' && salesman.distributor_id !== req.user.distributor_id) {
            return res.status(403).json({ error: "Not allowed to view this salesman's routes" });
        }
        if (req.user.role === 'salesman') {
            const [sm] = await db.execute('SELECT id FROM salesmen WHERE user_id = ?', [req.user.id]);
            if (!sm.length || sm[0].id !== parseInt(salesmanId, 10)) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const assigned = await getAssignedSalonIds(salesmanId);
        let salonRows;

        if (assigned.length > 0) {
            const placeholders = assigned.map(() => '?').join(',');
            [salonRows] = await db.execute(
                `SELECT s.id, s.salon_name, s.owner_name, s.phone, s.address,
                    (SELECT COUNT(*) FROM orders o WHERE o.salon_id = s.id) AS order_count,
                    (SELECT MAX(o.created_at) FROM orders o WHERE o.salon_id = s.id) AS last_order_at
                 FROM salons s
                 WHERE s.id IN (${placeholders})
                 ORDER BY s.salon_name ASC`,
                assigned
            );
        } else {
            [salonRows] = await db.execute(
                `SELECT s.id, s.salon_name, s.owner_name, s.phone, s.address,
                    (SELECT COUNT(*) FROM orders o WHERE o.salon_id = s.id) AS order_count,
                    (SELECT MAX(o.created_at) FROM orders o WHERE o.salon_id = s.id) AS last_order_at
                 FROM salons s
                 WHERE s.distributor_id = ?
                 ORDER BY s.salon_name ASC`,
                [salesman.distributor_id]
            );
        }

        res.json({
            salesman: {
                id: salesman.id,
                name: salesman.name,
                phone: salesman.phone,
                distributor_id: salesman.distributor_id,
            },
            assigned_only: assigned.length > 0,
            salons: salonRows,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const assignSalons = async (req, res) => {
    const salesmanId = req.params.id;
    const { salon_ids } = req.body;

    if (!Array.isArray(salon_ids)) {
        return res.status(400).json({ error: 'salon_ids array required' });
    }

    try {
        const [salesmanRows] = await db.execute('SELECT * FROM salesmen WHERE id = ?', [salesmanId]);
        if (salesmanRows.length === 0) return res.status(404).json({ error: 'Salesman not found' });
        const salesman = salesmanRows[0];

        if (req.user.role === 'distributor' && salesman.distributor_id !== req.user.distributor_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await db.execute('DELETE FROM salesman_salons WHERE salesman_id = ?', [salesmanId]);

        for (const salonId of salon_ids) {
            const [check] = await db.execute(
                'SELECT id FROM salons WHERE id = ? AND distributor_id = ?',
                [salonId, salesman.distributor_id]
            );
            if (check.length) {
                await db.execute('INSERT INTO salesman_salons (salesman_id, salon_id) VALUES (?, ?)', [
                    salesmanId,
                    salonId,
                ]);
            }
        }

        res.json({ message: 'Salons assigned', count: salon_ids.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getSalesmanAssignments = async (req, res) => {
    const salesmanId = req.params.id;
    try {
        const assigned = await getAssignedSalonIds(salesmanId);
        res.json({ salon_ids: assigned });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getSalesmen,
    createSalesman,
    getSalesmanRoutes,
    assignSalons,
    getSalesmanAssignments,
};
