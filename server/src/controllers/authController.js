const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const register = async (req, res) => {
    const { name, email, password, role, distributor_id, phone } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, role, distributor_id, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, role, distributor_id || null, phone || null]
        );

        res.status(201).json({ 
            message: 'User registered successfully', 
            userId: result.insertId 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, distributor_id: user.distributor_id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                distributor_id: user.distributor_id,
                phone: user.phone
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const me = async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, email, role, distributor_id, phone FROM users WHERE id = ?',
            [req.user.id]
        );
        const user = rows[0];
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { register, login, me };
