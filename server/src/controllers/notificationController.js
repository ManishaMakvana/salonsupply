const db = require('../config/db');

const getNotifications = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
            [req.user.id]
        );
        const [unread] = await db.execute(
            `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = FALSE`,
            [req.user.id]
        );
        res.json({ notifications: rows, unread_count: unread[0].cnt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const markRead = async (req, res) => {
    try {
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const markAllRead = async (req, res) => {
    try {
        await db.execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'All marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getNotifications, markRead, markAllRead };
