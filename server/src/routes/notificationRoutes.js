const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { getNotifications, markRead, markAllRead } = require('../controllers/notificationController');

const router = express.Router();
router.get('/', verifyToken, getNotifications);
router.put('/read-all', verifyToken, markAllRead);
router.put('/:id/read', verifyToken, markRead);

module.exports = router;
