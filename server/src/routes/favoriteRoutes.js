const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const {
    getFavorites,
    addFavorite,
    removeFavorite,
    getReorderSuggestion,
} = require('../controllers/favoriteController');

const router = express.Router();
router.get('/', verifyToken, authorizeRoles('salon'), getFavorites);
router.get('/reorder', verifyToken, authorizeRoles('salon'), getReorderSuggestion);
router.post('/', verifyToken, authorizeRoles('salon'), addFavorite);
router.delete('/:productId', verifyToken, authorizeRoles('salon'), removeFavorite);

module.exports = router;
