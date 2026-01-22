const multer = require('multer');
const path = require('path');
const { DepositRequest, User } = require('../models');

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'deposit-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
}).single('proofImage');

const createDepositRequest = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            const { amount, gopayNumber } = req.body;
            const userId = req.user.id;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'Invalid amount' });
            }

            if (!req.file) {
                return res.status(400).json({ message: 'Transfer proof image is required' });
            }

            const depositRequest = await DepositRequest.create({
                userId,
                amount,
                gopayNumber,
                proofImage: req.file.filename,
                status: 'pending'
            });

            res.status(201).json({
                message: 'Deposit request submitted successfully',
                depositRequest: {
                    id: depositRequest.id,
                    amount: depositRequest.amount,
                    status: depositRequest.status,
                    createdAt: depositRequest.createdAt
                }
            });
        } catch (error) {
            console.error('Deposit request error:', error);
            res.status(500).json({ message: 'Failed to create deposit request', error: error.message });
        }
    });
};

const getDepositHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const deposits = await DepositRequest.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['proofImage'] }
        });

        res.json({ deposits });
    } catch (error) {
        console.error('Get deposit history error:', error);
        res.status(500).json({ message: 'Failed to get deposit history', error: error.message });
    }
};

const getDepositStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const deposit = await DepositRequest.findOne({
            where: { id, userId }
        });

        if (!deposit) {
            return res.status(404).json({ message: 'Deposit request not found' });
        }

        res.json({ deposit });
    } catch (error) {
        console.error('Get deposit status error:', error);
        res.status(500).json({ message: 'Failed to get deposit status', error: error.message });
    }
};

module.exports = { createDepositRequest, getDepositHistory, getDepositStatus };
