const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const { getReports } = require('../controllers/reportController');

const router = express.Router();
router.get('/', verifyToken, authorizeRoles('distributor', 'super_admin', 'salesman'), getReports);

module.exports = router;
