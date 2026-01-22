const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    updateUser,
    deleteUser,
    getSettings,
    updateSettings,
    getAllDeposits,
    approveDeposit,
    rejectDeposit,
    getStatistics
} = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// User management
router.get('/users', authMiddleware, adminMiddleware, getAllUsers);
router.put('/users/:id', authMiddleware, adminMiddleware, updateUser);
router.delete('/users/:id', authMiddleware, adminMiddleware, deleteUser);

// Settings
router.get('/settings', authMiddleware, adminMiddleware, getSettings);
router.put('/settings', authMiddleware, adminMiddleware, updateSettings);

// Deposits
router.get('/deposits', authMiddleware, adminMiddleware, getAllDeposits);
router.put('/deposits/:id/approve', authMiddleware, adminMiddleware, approveDeposit);
router.put('/deposits/:id/reject', authMiddleware, adminMiddleware, rejectDeposit);

// Statistics
router.get('/statistics', authMiddleware, adminMiddleware, getStatistics);

module.exports = router;
