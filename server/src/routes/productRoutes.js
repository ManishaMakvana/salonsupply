const express = require('express');
const {
    getProducts,
    getLowStock,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadImage,
} = require('../controllers/productController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadProductImage } = require('../middleware/upload');

const router = express.Router();

router.get('/', verifyToken, getProducts);
router.get('/alerts/low-stock', verifyToken, authorizeRoles('distributor', 'super_admin'), getLowStock);
router.get('/:id', verifyToken, getProductById);
router.post('/', verifyToken, authorizeRoles('distributor', 'super_admin'), createProduct);
router.put('/:id', verifyToken, authorizeRoles('distributor', 'super_admin'), updateProduct);
router.post(
    '/:id/upload',
    verifyToken,
    authorizeRoles('distributor', 'super_admin'),
    uploadProductImage,
    uploadImage
);
router.delete('/:id', verifyToken, authorizeRoles('distributor', 'super_admin'), deleteProduct);

module.exports = router;
