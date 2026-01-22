const express = require('express');
const router = express.Router();
const { spin, getHistory, getBalance } = require('../controllers/gameController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/spin', authMiddleware, spin);
router.get('/history', authMiddleware, getHistory);
router.get('/balance', authMiddleware, getBalance);

module.exports = router;
