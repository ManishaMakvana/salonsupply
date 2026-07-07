const express = require('express');
const {
    getPaymentSummary,
    getPayments,
    getUnpaidOrders,
    recordPayment,
} = require('../controllers/paymentController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', verifyToken, getPaymentSummary);
router.get('/', verifyToken, getPayments);
router.get('/unpaid-orders', verifyToken, authorizeRoles('distributor', 'super_admin', 'salesman'), getUnpaidOrders);
router.post('/', verifyToken, authorizeRoles('distributor', 'super_admin', 'salesman'), recordPayment);

module.exports = router;
