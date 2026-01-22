const { User, GameHistory, GameSettings, DepositRequest } = require('../models');
const { Op } = require('sequelize');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Failed to get users', error: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { balance, winRate, rouletteWinRate, slotWinRate, rouletteUseOrganic, slotUseOrganic, role } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updates = {};
        if (balance !== undefined) updates.balance = balance;
        if (winRate !== undefined) updates.winRate = winRate;
        if (rouletteWinRate !== undefined) updates.rouletteWinRate = rouletteWinRate;
        if (slotWinRate !== undefined) updates.slotWinRate = slotWinRate;
        if (rouletteUseOrganic !== undefined) updates.rouletteUseOrganic = rouletteUseOrganic;
        if (slotUseOrganic !== undefined) updates.slotUseOrganic = slotUseOrganic;
        if (role !== undefined) updates.role = role;

        await user.update(updates);

        res.json({
            message: 'User updated successfully',
            user: {
                id: user.id,
                username: user.username,
                balance: user.balance,
                winRate: user.winRate,
                rouletteWinRate: user.rouletteWinRate,
                slotWinRate: user.slotWinRate,
                rouletteUseOrganic: user.rouletteUseOrganic,
                slotUseOrganic: user.slotUseOrganic,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from deleting themselves
        if (user.id === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        await user.destroy();

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Failed to delete user', error: error.message });
    }
};

const getSettings = async (req, res) => {
    try {
        const settings = await GameSettings.findAll();

        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.settingKey] = setting.settingValue;
        });

        res.json({ settings: settingsObj });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ message: 'Failed to get settings', error: error.message });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { default_win_rate, roulette_win_rate, slot_win_rate, roulette_use_organic, slot_use_organic, house_edge } = req.body;

        if (default_win_rate !== undefined) {
            await GameSettings.upsert({
                settingKey: 'default_win_rate',
                settingValue: default_win_rate.toString(),
                description: 'Default win rate percentage for all users'
            });
        }

        if (roulette_win_rate !== undefined) {
            await GameSettings.upsert({
                settingKey: 'roulette_win_rate',
                settingValue: roulette_win_rate.toString(),
                description: 'Roulette win rate percentage'
            });
        }

        if (slot_win_rate !== undefined) {
            await GameSettings.upsert({
                settingKey: 'slot_win_rate',
                settingValue: slot_win_rate.toString(),
                description: 'Slot win rate percentage'
            });
        }

        if (roulette_use_organic !== undefined) {
            await GameSettings.upsert({
                settingKey: 'roulette_use_organic',
                settingValue: roulette_use_organic ? 'true' : 'false',
                description: 'Use organic roulette odds without admin manipulation'
            });
        }

        if (slot_use_organic !== undefined) {
            await GameSettings.upsert({
                settingKey: 'slot_use_organic',
                settingValue: slot_use_organic ? 'true' : 'false',
                description: 'Use organic slot odds without admin manipulation'
            });
        }

        if (house_edge !== undefined) {
            await GameSettings.upsert({
                settingKey: 'house_edge',
                settingValue: house_edge.toString(),
                description: 'House edge percentage'
            });
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ message: 'Failed to update settings', error: error.message });
    }
};

const getAllDeposits = async (req, res) => {
    try {
        const deposits = await DepositRequest.findAll({
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ deposits });
    } catch (error) {
        console.error('Get deposits error:', error);
        res.status(500).json({ message: 'Failed to get deposits', error: error.message });
    }
};

const approveDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;

        const deposit = await DepositRequest.findByPk(id);
        if (!deposit) {
            return res.status(404).json({ message: 'Deposit request not found' });
        }

        if (deposit.status !== 'pending') {
            return res.status(400).json({ message: 'Deposit already processed' });
        }

        // Update user balance
        const user = await User.findByPk(deposit.userId);
        const newBalance = parseFloat(user.balance) + parseFloat(deposit.amount);
        await user.update({ balance: newBalance });

        // Update deposit status
        await deposit.update({
            status: 'approved',
            adminNotes,
            verifiedAt: new Date(),
            verifiedBy: req.user.id
        });

        res.json({
            message: 'Deposit approved successfully',
            newBalance
        });
    } catch (error) {
        console.error('Approve deposit error:', error);
        res.status(500).json({ message: 'Failed to approve deposit', error: error.message });
    }
};

const rejectDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;

        const deposit = await DepositRequest.findByPk(id);
        if (!deposit) {
            return res.status(404).json({ message: 'Deposit request not found' });
        }

        if (deposit.status !== 'pending') {
            return res.status(400).json({ message: 'Deposit already processed' });
        }

        await deposit.update({
            status: 'rejected',
            adminNotes: adminNotes || 'Deposit rejected',
            verifiedAt: new Date(),
            verifiedBy: req.user.id
        });

        res.json({ message: 'Deposit rejected successfully' });
    } catch (error) {
        console.error('Reject deposit error:', error);
        res.status(500).json({ message: 'Failed to reject deposit', error: error.message });
    }
};

const getStatistics = async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalGames = await GameHistory.count();
        const pendingDeposits = await DepositRequest.count({ where: { status: 'pending' } });

        const totalBets = await GameHistory.sum('betAmount') || 0;
        const totalWinnings = await GameHistory.sum('winAmount') || 0;
        const houseProfit = totalBets - totalWinnings;

        // Recent activity
        const recentGames = await GameHistory.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']],
            include: [{
                model: User,
                as: 'user',
                attributes: ['username']
            }]
        });

        res.json({
            statistics: {
                totalUsers,
                totalGames,
                pendingDeposits,
                totalBets,
                totalWinnings,
                houseProfit
            },
            recentGames
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ message: 'Failed to get statistics', error: error.message });
    }
};

module.exports = {
    getAllUsers,
    updateUser,
    deleteUser,
    getSettings,
    updateSettings,
    getAllDeposits,
    approveDeposit,
    rejectDeposit,
    getStatistics
};
