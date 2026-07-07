const express = require('express');
const {
    getBrands,
    createBrand,
    getCategories,
    createCategory,
} = require('../controllers/catalogController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/brands', verifyToken, getBrands);
router.post('/brands', verifyToken, authorizeRoles('distributor', 'super_admin'), createBrand);
router.get('/categories', verifyToken, getCategories);
router.post('/categories', verifyToken, authorizeRoles('distributor', 'super_admin'), createCategory);

module.exports = router;
