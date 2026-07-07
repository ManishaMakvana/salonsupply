const express = require('express');
const {
    getSalesmen,
    createSalesman,
    getSalesmanRoutes,
    assignSalons,
    getSalesmanAssignments,
} = require('../controllers/salesmanController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', verifyToken, getSalesmen);
router.get('/:id/routes', verifyToken, authorizeRoles('distributor', 'super_admin', 'salesman'), getSalesmanRoutes);
router.get('/:id/assignments', verifyToken, authorizeRoles('distributor', 'super_admin'), getSalesmanAssignments);
router.put('/:id/assignments', verifyToken, authorizeRoles('distributor', 'super_admin'), assignSalons);
router.post('/', verifyToken, authorizeRoles('distributor', 'super_admin'), createSalesman);

module.exports = router;
