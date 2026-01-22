const express = require('express');
const router = express.Router();
const {
    createDepositRequest,
    getDepositHistory,
    getDepositStatus
} = require('../controllers/depositController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/request', authMiddleware, createDepositRequest);
router.get('/history', authMiddleware, getDepositHistory);
router.get('/status/:id', authMiddleware, getDepositStatus);

module.exports = router;
