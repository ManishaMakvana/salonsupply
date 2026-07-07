const db = require('../config/db');
const { logAudit } = require('../services/auditService');
const { notifySalonUsers } = require('../services/notificationService');
const {
    getSalonIdForUser,
    getSalesmanIdForUser,
    getAssignedSalonIds,
    canAccessOrder,
} = require('../utils/accessHelper');

async function resolveDistributorScope(req) {
    if (req.user.role === 'distributor') {
        return req.user.distributor_id;
    }
    if (req.user.role === 'salesman') {
        const sm = await getSalesmanIdForUser(req.user.id);
        return sm?.distributor_id ?? req.user.distributor_id ?? null;
    }
    return null;
}

/** Build AND ... conditions for orders scope (distributor / salesman / salon). */
async function buildOrderScopeConditions(req, alias = 'o') {
    const conditions = [];
    const params = [];

    if (req.user.role === 'distributor') {
        if (!req.user.distributor_id) return null;
        conditions.push(`${alias}.distributor_id = ?`);
        params.push(req.user.distributor_id);
    } else if (req.user.role === 'salesman') {
        const sm = await getSalesmanIdForUser(req.user.id);
        if (!sm) return null;
        conditions.push(`${alias}.distributor_id = ?`);
        params.push(sm.distributor_id);
        const assigned = await getAssignedSalonIds(sm.id);
        if (assigned.length > 0) {
            conditions.push(
                `${alias}.salon_id IN (${assigned.map(() => '?').join(',')})`
            );
            params.push(...assigned);
        }
    } else if (req.user.role === 'salon') {
        const salon = await getSalonIdForUser(req.user.id);
        if (!salon) return null;
        conditions.push(`${alias}.salon_id = ?`);
        params.push(salon.id);
    }

    return { conditions, params };
}

function scopeAndClause(conditions) {
    return conditions.length ? ` AND ${conditions.join(' AND ')}` : '';
}

function scopeWhereClause(conditions) {
    return conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
}

const getPaymentSummary = async (req, res) => {
    try {
        const scope =
            req.user.role === 'super_admin'
                ? { conditions: [], params: [] }
                : await buildOrderScopeConditions(req);

        if (scope === null) {
            return res.json({ total_collected: 0, pending_amount: 0, order_count: 0 });
        }

        const { conditions, params } = scope;
        const scopeAnd = scopeAndClause(conditions);
        const scopeWhere = scopeWhereClause(conditions);

        const [collectedRows] = await db.execute(
            `SELECT COALESCE(SUM(p.amount), 0) AS total
             FROM payments p
             JOIN orders o ON p.order_id = o.id
             ${scopeWhere}`,
            params
        );

        const [pendingRows] = await db.execute(
            `SELECT COALESCE(SUM(
                GREATEST(o.total_amount - COALESCE((
                    SELECT SUM(p2.amount) FROM payments p2 WHERE p2.order_id = o.id
                ), 0), 0)
            ), 0) AS total
             FROM orders o
             WHERE o.payment_status IN ('pending', 'partial')
             AND o.status NOT IN ('rejected', 'pending')${scopeAnd}`,
            params
        );

        const [orderCountRows] = await db.execute(
            `SELECT COUNT(*) AS cnt FROM orders o${scopeWhere}`,
            params
        );

        res.json({
            total_collected: parseFloat(collectedRows[0].total),
            pending_amount: Math.max(0, parseFloat(pendingRows[0].total)),
            order_count: orderCountRows[0].cnt,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getPayments = async (req, res) => {
    try {
        let query = `
            SELECT p.*, o.order_number, o.salon_id, s.salon_name, o.total_amount AS order_total
            FROM payments p
            JOIN orders o ON p.order_id = o.id
            JOIN salons s ON o.salon_id = s.id
        `;
        let params = [];

        if (req.user.role !== 'super_admin') {
            const scope = await buildOrderScopeConditions(req);
            if (scope === null) return res.json([]);
            query += scopeWhereClause(scope.conditions);
            params = scope.params;
        }

        query += ' ORDER BY p.payment_date DESC LIMIT 100';
        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const unpaidOrderSelect = `
    SELECT o.id, o.order_number, o.total_amount, o.payment_status, o.status, o.created_at, s.salon_name,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0) AS paid_amount
    FROM orders o
    JOIN salons s ON o.salon_id = s.id
`;

const getUnpaidOrders = async (req, res) => {
    try {
        let scopeAnd = '';
        let params = [];

        if (req.user.role !== 'super_admin') {
            const scope = await buildOrderScopeConditions(req);
            if (scope === null) {
                return res.json({ ready_to_collect: [], awaiting_approval: [] });
            }
            scopeAnd = scopeAndClause(scope.conditions);
            params = scope.params;
        }

        const readyQuery = `${unpaidOrderSelect}
            WHERE o.payment_status IN ('pending', 'partial')
            AND o.status IN ('approved', 'processing', 'delivered')${scopeAnd}
            ORDER BY o.created_at DESC`;
        const awaitingQuery = `${unpaidOrderSelect}
            WHERE o.payment_status IN ('pending', 'partial')
            AND o.status = 'pending'${scopeAnd}
            ORDER BY o.created_at DESC`;

        const [readyRows] = await db.execute(readyQuery, params);
        const [awaitingRows] = await db.execute(awaitingQuery, params);

        res.json({
            ready_to_collect: readyRows,
            awaiting_approval: awaitingRows,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const recordPayment = async (req, res) => {
    const { order_id, amount, payment_method, notes, reference } = req.body;

    if (!order_id || !amount || !payment_method) {
        return res.status(400).json({ error: 'order_id, amount, and payment_method are required' });
    }

    const allowedMethods = ['cash', 'upi', 'bank_transfer'];
    if (!allowedMethods.includes(payment_method)) {
        return res.status(400).json({ error: 'payment_method must be cash, upi, or bank_transfer' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [orderRows] = await conn.execute('SELECT * FROM orders WHERE id = ?', [order_id]);
        if (orderRows.length === 0) {
            throw new Error('Order not found');
        }
        const order = orderRows[0];

        if (!(await canAccessOrder(req, order))) {
            throw new Error('Access denied');
        }

        if (order.status === 'pending') {
            throw new Error('Approve the order before recording payment (order is still pending approval).');
        }
        if (order.status === 'rejected') {
            throw new Error('Cannot record payment on a rejected order.');
        }

        const payAmount = parseFloat(amount);
        if (payAmount <= 0) {
            throw new Error('Amount must be greater than zero');
        }

        const [paidRows] = await conn.execute(
            'SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE order_id = ?',
            [order_id]
        );
        const alreadyPaid = parseFloat(paidRows[0].paid);
        const orderTotal = parseFloat(order.total_amount);
        const due = orderTotal - alreadyPaid;

        if (due <= 0.01) {
            throw new Error('This order is already fully paid');
        }

        if (payAmount > due + 0.01) {
            throw new Error(`Payment exceeds balance due (${due.toFixed(2)})`);
        }

        const noteParts = [];
        if (reference) noteParts.push(`Ref: ${reference}`);
        if (notes) noteParts.push(notes);
        noteParts.push(`Recorded by ${req.user.role} (user #${req.user.id})`);
        const combinedNotes = noteParts.join(' · ') || null;

        await conn.execute(
            'INSERT INTO payments (order_id, amount, payment_method, notes) VALUES (?, ?, ?, ?)',
            [order_id, payAmount, payment_method, combinedNotes]
        );

        const newPaid = alreadyPaid + payAmount;
        let paymentStatus = 'partial';
        if (newPaid >= orderTotal - 0.01) paymentStatus = 'paid';

        await conn.execute('UPDATE orders SET payment_status = ? WHERE id = ?', [paymentStatus, order_id]);

        await conn.commit();

        await logAudit({
            user: req.user,
            action: 'payment_recorded',
            entityType: 'payment',
            entityId: order_id,
            details: {
                distributor_id: order.distributor_id,
                amount: payAmount,
                payment_method,
                payment_status: paymentStatus,
                order_number: order.order_number,
            },
        });

        if (paymentStatus === 'paid') {
            await notifySalonUsers(order.salon_id, {
                title: 'Payment recorded',
                message: `Payment for order ${order.order_number} marked as collected.`,
                type: 'payment_paid',
                meta: { order_id },
            });
        } else {
            await notifySalonUsers(order.salon_id, {
                title: 'Partial payment',
                message: `₹${payAmount.toFixed(2)} recorded on ${order.order_number}. Balance remaining.`,
                type: 'payment_partial',
                meta: { order_id },
            });
        }

        res.status(201).json({
            message: 'Payment recorded successfully',
            payment_status: paymentStatus,
            amount_recorded: payAmount,
            balance_remaining: Math.max(0, orderTotal - newPaid),
        });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};

module.exports = { getPaymentSummary, getPayments, getUnpaidOrders, recordPayment, resolveDistributorScope };
