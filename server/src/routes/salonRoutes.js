const express = require('express');
const { getSalons, createSalon, getMySalon, updateSalon } = require('../controllers/salonController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/me', verifyToken, authorizeRoles('salon'), getMySalon);
router.get('/', verifyToken, getSalons);
router.post('/', verifyToken, authorizeRoles('distributor', 'super_admin'), createSalon);
router.put('/:id', verifyToken, authorizeRoles('distributor', 'super_admin'), updateSalon);

module.exports = router;
