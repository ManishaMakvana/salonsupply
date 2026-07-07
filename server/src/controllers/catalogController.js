const db = require('../config/db');

const getBrands = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, name, logo, created_at FROM brands ORDER BY name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createBrand = async (req, res) => {
    const { name, logo } = req.body;
    if (!name?.trim()) {
        return res.status(400).json({ error: 'Brand name is required' });
    }
    const trimmed = name.trim();
    try {
        const [existing] = await db.execute(
            'SELECT id FROM brands WHERE LOWER(name) = LOWER(?)',
            [trimmed]
        );
        if (existing.length > 0) {
            return res.status(200).json({
                message: 'Brand already exists',
                brandId: existing[0].id,
                existing: true,
            });
        }

        const [result] = await db.execute('INSERT INTO brands (name, logo) VALUES (?, ?)', [
            trimmed,
            logo || null,
        ]);
        res.status(201).json({ message: 'Brand created', brandId: result.insertId, existing: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getCategories = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, name, created_at FROM categories ORDER BY name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const createCategory = async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) {
        return res.status(400).json({ error: 'Category name is required' });
    }
    const trimmed = name.trim();
    try {
        const [existing] = await db.execute(
            'SELECT id FROM categories WHERE LOWER(name) = LOWER(?)',
            [trimmed]
        );
        if (existing.length > 0) {
            return res.status(200).json({
                message: 'Category already exists',
                categoryId: existing[0].id,
                existing: true,
            });
        }

        const [result] = await db.execute('INSERT INTO categories (name) VALUES (?)', [trimmed]);
        res.status(201).json({
            message: 'Category created',
            categoryId: result.insertId,
            existing: false,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getBrands, createBrand, getCategories, createCategory };
