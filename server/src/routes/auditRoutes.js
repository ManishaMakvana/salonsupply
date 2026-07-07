const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const { getAuditLogs } = require('../controllers/auditController');

const router = express.Router();
router.get('/', verifyToken, authorizeRoles('distributor', 'super_admin'), getAuditLogs);

module.exports = router;
