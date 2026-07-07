const db = require('../config/db');
const { getOrLinkSalonForUser } = require('../utils/accessHelper');
const { parsePagination, executePaginated } = require('../utils/pagination');

const getProducts = async (req, res) => {
    try {
        const { page, limit, offset, wantsPagination } = parsePagination(req.query, {
            defaultLimit: 12,
            maxLimit: 48,
        });

        let baseFrom =
            'FROM products p LEFT JOIN brands b ON p.brand_id = b.id LEFT JOIN categories c ON p.category_id = c.id';
        const params = [];
        const conditions = [];

        if (req.user.role === 'distributor') {
            conditions.push('p.distributor_id = ?');
            params.push(req.user.distributor_id);
        } else if (req.user.role === 'salon') {
            const salon = await getOrLinkSalonForUser(req.user);
            const distributorId = salon?.distributor_id ?? req.user.distributor_id;
            if (!distributorId) {
                return res.status(400).json({
                    error: 'Salon profile not linked. Contact your distributor.',
                });
            }
            conditions.push('p.distributor_id = ?');
            params.push(distributorId);

            if (req.query.favorite_only === '1' && salon?.id) {
                conditions.push(
                    'p.id IN (SELECT product_id FROM salon_favorites WHERE salon_id = ?)'
                );
                params.push(salon.id);
            }
        }

        if (req.query.search) {
            const term = `%${req.query.search}%`;
            conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
            params.push(term, term);
        }

        const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

        if (!wantsPagination) {
            const [rows] = await db.execute(
                `SELECT p.*, b.name as brand_name, c.name as category_name ${baseFrom}${whereClause} ORDER BY p.name ASC`,
                params
            );
            return res.json(rows);
        }

        const result = await executePaginated(db, {
            dataSql: `SELECT p.*, b.name as brand_name, c.name as category_name ${baseFrom}${whereClause} ORDER BY p.name ASC`,
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

const getLowStock = async (req, res) => {
    try {
        let query = `SELECT p.*, b.name AS brand_name
                     FROM products p
                     LEFT JOIN brands b ON p.brand_id = b.id
                     WHERE p.stock <= COALESCE(p.low_stock_threshold, 10)`;
        const params = [];

        if (req.user.role === 'distributor') {
            query += ' AND p.distributor_id = ?';
            params.push(req.user.distributor_id);
        } else if (req.user.role === 'super_admin' && req.query.distributor_id) {
            query += ' AND p.distributor_id = ?';
            params.push(req.query.distributor_id);
        }

        query += ' ORDER BY p.stock ASC';
        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT p.*, b.name as brand_name, c.name as category_name FROM products p LEFT JOIN brands b ON p.brand_id = b.id LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createProduct = async (req, res) => {
    const { name, description, price, stock, brand_id, category_id, sku, image, low_stock_threshold } =
        req.body;
    let distributor_id = req.user.distributor_id;

    try {
        if (!distributor_id && req.user.role === 'super_admin') {
            const [distributors] = await db.execute('SELECT id FROM distributors ORDER BY id LIMIT 1');
            if (distributors.length === 0) {
                return res.status(400).json({ error: 'No distributor found. Create a distributor first.' });
            }
            distributor_id = distributors[0].id;
        }
        if (!distributor_id) {
            return res.status(400).json({ error: 'Distributor account required to create products' });
        }
        const [result] = await db.execute(
            `INSERT INTO products (name, description, price, stock, brand_id, category_id, sku, image, distributor_id, low_stock_threshold)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                description,
                price,
                stock,
                brand_id || null,
                category_id || null,
                sku || null,
                image || null,
                distributor_id,
                low_stock_threshold ?? 10,
            ]
        );
        res.status(201).json({ message: 'Product created', productId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateProduct = async (req, res) => {
    const { name, description, price, stock, brand_id, category_id, sku, image, low_stock_threshold } =
        req.body;
    const { id } = req.params;

    try {
        if (req.user.role === 'distributor') {
            const [rows] = await db.execute('SELECT distributor_id FROM products WHERE id = ?', [id]);
            if (rows.length === 0 || rows[0].distributor_id !== req.user.distributor_id) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        await db.execute(
            `UPDATE products SET name=?, description=?, price=?, stock=?, brand_id=?, category_id=?, sku=?, image=?,
             low_stock_threshold = COALESCE(?, low_stock_threshold) WHERE id=?`,
            [
                name,
                description,
                price,
                stock,
                brand_id || null,
                category_id || null,
                sku || null,
                image || null,
                low_stock_threshold,
                id,
            ]
        );
        res.json({ message: 'Product updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

        const { id } = req.params;
        if (req.user.role === 'distributor') {
            const [rows] = await db.execute('SELECT distributor_id FROM products WHERE id = ?', [id]);
            if (rows.length === 0 || rows[0].distributor_id !== req.user.distributor_id) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const imageUrl = `/uploads/products/${req.file.filename}`;
        await db.execute('UPDATE products SET image = ? WHERE id = ?', [imageUrl, id]);
        res.json({ message: 'Image uploaded', image: imageUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        if (req.user.role === 'distributor') {
            const [rows] = await db.execute('SELECT distributor_id FROM products WHERE id = ?', [id]);
            if (rows.length === 0 || rows[0].distributor_id !== req.user.distributor_id) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }
        await db.execute('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getProducts,
    getLowStock,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadImage,
};
