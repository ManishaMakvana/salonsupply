const express = require('express');
const {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    getOrderInvoice,
} = require('../controllers/orderController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', verifyToken, authorizeRoles('salon', 'salesman', 'distributor', 'super_admin'), createOrder);
router.get('/', verifyToken, getOrders);
router.get('/:id/invoice', verifyToken, getOrderInvoice);
router.get('/:id', verifyToken, getOrderById);
router.put('/:id/status', verifyToken, authorizeRoles('distributor', 'super_admin'), updateOrderStatus);
router.delete('/:id', verifyToken, authorizeRoles('salon', 'distributor', 'super_admin'), cancelOrder);

module.exports = router;
