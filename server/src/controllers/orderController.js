const db = require('../config/db');
const { logAudit } = require('../services/auditService');
const { parsePagination, executePaginated } = require('../utils/pagination');
const { notifySalonUsers, notifyDistributorUsers } = require('../services/notificationService');
const { generateGstInvoicePdf } = require('../services/invoiceService');
const {
    getSalonIdForUser,
    getOrLinkSalonForUser,
    getSalesmanIdForUser,
    getAssignedSalonIds,
    salesmanSalonFilterClause,
    canAccessOrder,
} = require('../utils/accessHelper');

async function checkLowStockAndNotify(conn, distributorId, productId) {
    const [rows] = await conn.execute(
        'SELECT name, stock, low_stock_threshold FROM products WHERE id = ?',
        [productId]
    );
    if (!rows.length) return;
    const p = rows[0];
    if (p.stock <= (p.low_stock_threshold ?? 10)) {
        await notifyDistributorUsers(distributorId, {
            title: 'Low stock alert',
            message: `${p.name} has only ${p.stock} units left (threshold: ${p.low_stock_threshold})`,
            type: 'low_stock',
            meta: { product_id: productId, stock: p.stock },
        });
    }
}

const createOrder = async (req, res) => {
    let { salon_id, items, salesman_id } = req.body;

    if (!items?.length) {
        return res.status(400).json({ error: 'Order must include at least one item' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        if (req.user.role === 'salon') {
            const linkedSalon = await getOrLinkSalonForUser(req.user);
            if (!linkedSalon) {
                throw new Error('Salon profile not linked. Contact your distributor.');
            }
            salon_id = linkedSalon.id;
        } else if (req.user.role === 'distributor') {
            if (!salon_id) throw new Error('salon_id is required when placing an order for a salon');
            const [check] = await conn.execute(
                'SELECT id FROM salons WHERE id = ? AND distributor_id = ?',
                [salon_id, req.user.distributor_id]
            );
            if (check.length === 0) throw new Error('Salon not found or not linked to your account');
        } else if (req.user.role === 'salesman') {
            const sm = await getSalesmanIdForUser(req.user.id);
            if (!sm) throw new Error('Salesman profile not linked. Contact your distributor.');
            salesman_id = sm.id;
            if (!salon_id) throw new Error('salon_id is required when placing an order for a salon');
            const assigned = await getAssignedSalonIds(sm.id);
            if (assigned.length > 0 && !assigned.includes(Number(salon_id))) {
                throw new Error('Salon is not in your assigned territory');
            }
            const [check] = await conn.execute(
                'SELECT id FROM salons WHERE id = ? AND distributor_id = ?',
                [salon_id, sm.distributor_id]
            );
            if (check.length === 0) throw new Error('Salon not found or not in your territory');
        } else if (req.user.role === 'super_admin' && !salon_id) {
            throw new Error('salon_id is required');
        }

        if (!salon_id) throw new Error('Salon is required');

        const [salonRows] = await conn.execute(
            'SELECT distributor_id, credit_limit, salon_name FROM salons WHERE id = ?',
            [salon_id]
        );
        if (salonRows.length === 0) throw new Error('Salon not found');
        const distributor_id = salonRows[0].distributor_id;

        const pricedItems = [];
        let totalAmount = 0;
        for (const item of items) {
            const [productRows] = await conn.execute(
                'SELECT stock, name, price FROM products WHERE id = ? AND distributor_id = ?',
                [item.product_id, distributor_id]
            );
            if (productRows.length === 0) throw new Error('Product not found');
            const qty = parseInt(item.quantity, 10);
            if (qty < 1) throw new Error('Invalid quantity');
            if (productRows[0].stock < qty) {
                throw new Error(`Not enough stock for ${productRows[0].name}`);
            }
            const unitPrice = parseFloat(productRows[0].price);
            pricedItems.push({
                product_id: item.product_id,
                quantity: qty,
                price: unitPrice,
            });
            totalAmount += unitPrice * qty;
        }

        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const [orderResult] = await conn.execute(
            'INSERT INTO orders (distributor_id, salon_id, salesman_id, order_number, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)',
            [distributor_id, salon_id, salesman_id || null, orderNumber, totalAmount, 'pending']
        );

        const orderId = orderResult.insertId;

        for (const item of pricedItems) {
            await conn.execute(
                'INSERT INTO order_items (order_id, product_id, quantity, price, total) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price, item.price * item.quantity]
            );
            await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [
                item.quantity,
                item.product_id,
            ]);
            await conn.execute(
                'INSERT INTO inventory_logs (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)',
                [item.product_id, 'out', item.quantity, `Order ${orderNumber}`]
            );
            await checkLowStockAndNotify(conn, distributor_id, item.product_id);
        }

        await conn.commit();

        await logAudit({
            user: req.user,
            action: 'order_created',
            entityType: 'order',
            entityId: orderId,
            details: { order_number: orderNumber, salon_id, distributor_id, total_amount: totalAmount },
        });

        await notifySalonUsers(salon_id, {
            title: 'Order placed',
            message: `Order ${orderNumber} placed successfully. Waiting for approval.`,
            type: 'order_placed',
            meta: { order_id: orderId },
        });
        await notifyDistributorUsers(distributor_id, {
            title: 'New order',
            message: `New order ${orderNumber} from ${salonRows[0].salon_name} — ₹${totalAmount.toFixed(2)}`,
            type: 'order_placed',
            meta: { order_id: orderId },
        });

        res.status(201).json({ message: 'Order placed successfully', orderId, orderNumber });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};

const getOrders = async (req, res) => {
    try {
        const selectCols = `SELECT o.*, s.salon_name,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0) AS paid_amount`;
        const fromClause = 'FROM orders o JOIN salons s ON o.salon_id = s.id';
        const params = [];
        const conditions = [];

        if (req.user.role === 'distributor') {
            conditions.push('o.distributor_id = ?');
            params.push(req.user.distributor_id);
        } else if (req.user.role === 'salon') {
            const salon = await getOrLinkSalonForUser(req.user);
            if (salon) {
                conditions.push('o.salon_id = ?');
                params.push(salon.id);
            } else if (req.user.distributor_id) {
                conditions.push('o.salon_id IN (SELECT id FROM salons WHERE distributor_id = ?)');
                params.push(req.user.distributor_id);
            } else {
                return res.json([]);
            }
        } else if (req.user.role === 'salesman') {
            const sm = await getSalesmanIdForUser(req.user.id);
            if (!sm) return res.json([]);
            const filter = await salesmanSalonFilterClause(sm.id, sm.distributor_id, 'o');
            conditions.push(filter.clause.replace(/^ AND /, ''));
            params.push(...filter.params);
        }

        if (req.query.salon_id) {
            conditions.push('o.salon_id = ?');
            params.push(req.query.salon_id);
        }
        if (req.query.status) {
            conditions.push('o.status = ?');
            params.push(req.query.status);
        }
        if (req.query.payment_status) {
            conditions.push('o.payment_status = ?');
            params.push(req.query.payment_status);
        }
        if (req.query.search) {
            conditions.push('(o.order_number LIKE ? OR s.salon_name LIKE ?)');
            const term = `%${req.query.search}%`;
            params.push(term, term);
        }

        const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
        const orderBy = ' ORDER BY o.created_at DESC';

        const { page, limit, offset, wantsPagination } = parsePagination(req.query, {
            defaultLimit: 15,
            maxLimit: 50,
        });

        if (!wantsPagination) {
            const [rows] = await db.execute(
                `${selectCols} ${fromClause}${whereClause}${orderBy}`,
                params
            );
            return res.json(rows);
        }

        const result = await executePaginated(db, {
            dataSql: `${selectCols} ${fromClause}${whereClause}${orderBy}`,
            countSql: `SELECT COUNT(*) AS total ${fromClause}${whereClause}`,
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

const getOrderById = async (req, res) => {
    try {
        const [orderRows] = await db.execute(
            'SELECT o.*, s.salon_name, s.address as salon_address, s.phone as salon_phone FROM orders o JOIN salons s ON o.salon_id = s.id WHERE o.id = ?',
            [req.params.id]
        );
        if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found' });

        const order = orderRows[0];
        if (!(await canAccessOrder(req, order))) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [itemRows] = await db.execute(
            'SELECT oi.*, p.name as product_name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
            [req.params.id]
        );
        const [paymentRows] = await db.execute(
            'SELECT id, amount, payment_method, payment_date, notes FROM payments WHERE order_id = ? ORDER BY payment_date ASC',
            [req.params.id]
        );
        const paidAmount = paymentRows.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        res.json({
            ...order,
            paid_amount: paidAmount,
            balance_due: Math.max(0, parseFloat(order.total_amount) - paidAmount),
            items: itemRows,
            payments: paymentRows,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const STATUS_NOTIFY = {
    approved: { title: 'Order approved', type: 'order_approved' },
    processing: { title: 'Out for delivery', type: 'order_processing' },
    delivered: { title: 'Order delivered', type: 'order_delivered' },
    rejected: { title: 'Order rejected', type: 'order_rejected' },
};

const updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    const allowed = ['pending', 'approved', 'rejected', 'processing', 'delivered'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const [orderRows] = await db.execute('SELECT * FROM orders WHERE id = ?', [id]);
        if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found' });
        const order = orderRows[0];

        if (req.user.role === 'distributor' && order.distributor_id !== req.user.distributor_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const prev = order.status;
        await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

        await logAudit({
            user: req.user,
            action: 'order_status_updated',
            entityType: 'order',
            entityId: parseInt(id, 10),
            details: {
                distributor_id: order.distributor_id,
                from: prev,
                to: status,
                order_number: order.order_number,
            },
        });

        const cfg = STATUS_NOTIFY[status];
        if (cfg) {
            await notifySalonUsers(order.salon_id, {
                title: cfg.title,
                message: `Order ${order.order_number} is now ${status}.`,
                type: cfg.type,
                meta: { order_id: id, status },
            });
        }

        if (status === 'delivered' && order.payment_status !== 'paid') {
            await notifySalonUsers(order.salon_id, {
                title: 'Payment due',
                message: `Order ${order.order_number} delivered. Please complete payment to your distributor.`,
                type: 'payment_due',
                meta: { order_id: id },
            });
        }

        res.json({ message: 'Order status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getOrderInvoice = async (req, res) => {
    try {
        const [orderRows] = await db.execute(
            `SELECT o.*, s.salon_name, s.address, s.phone, d.business_name, d.gst_number, d.address AS dist_address
             FROM orders o
             JOIN salons s ON o.salon_id = s.id
             JOIN distributors d ON d.id = o.distributor_id
             WHERE o.id = ?`,
            [req.params.id]
        );
        if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found' });
        const order = orderRows[0];
        if (!(await canAccessOrder(req, order))) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [items] = await db.execute(
            `SELECT oi.*, p.name AS product_name FROM order_items oi
             JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
            [req.params.id]
        );
        const [payments] = await db.execute('SELECT * FROM payments WHERE order_id = ?', [req.params.id]);

        const pdf = await generateGstInvoicePdf({
            order,
            items,
            distributor: {
                business_name: order.business_name,
                gst_number: order.gst_number,
                address: order.dist_address,
            },
            salon: { salon_name: order.salon_name, address: order.address, phone: order.phone },
            payments,
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.order_number}.pdf"`);
        res.send(pdf);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const cancelOrder = async (req, res) => {
    const { id } = req.params;
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [orderRows] = await conn.execute('SELECT o.* FROM orders o WHERE o.id = ?', [id]);
        if (orderRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = orderRows[0];

        if (!(await canAccessOrder(req, order))) {
            await conn.rollback();
            return res.status(403).json({ error: 'Access denied' });
        }

        if (order.status !== 'pending') {
            await conn.rollback();
            return res.status(400).json({ error: 'Only pending orders can be cancelled' });
        }

        const [items] = await conn.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [
            id,
        ]);

        for (const item of items) {
            await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [
                item.quantity,
                item.product_id,
            ]);
            await conn.execute(
                'INSERT INTO inventory_logs (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)',
                [item.product_id, 'in', item.quantity, `Cancelled order ${order.order_number}`]
            );
        }

        await conn.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
        await conn.execute('DELETE FROM orders WHERE id = ?', [id]);

        await conn.commit();

        await logAudit({
            user: req.user,
            action: 'order_cancelled',
            entityType: 'order',
            entityId: parseInt(id, 10),
            details: { order_number: order.order_number, distributor_id: order.distributor_id },
        });

        res.json({ message: 'Order cancelled and removed' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    getOrderInvoice,
};
