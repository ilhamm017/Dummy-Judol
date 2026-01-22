const { User, GameHistory, GameSettings } = require('../models');

const MIN_BET = 1000;

const SYMBOLS = [
    { key: '7', label: '7', weight: 1, multiplier: 10 },
    { key: 'BAR', label: 'BAR', weight: 2, multiplier: 6 },
    { key: 'CHERRY', label: 'CHERRY', weight: 4, multiplier: 4 },
    { key: 'LEMON', label: 'LEMON', weight: 8, multiplier: 3 },
    { key: 'ORANGE', label: 'ORANGE', weight: 10, multiplier: 2 },
    { key: 'GRAPE', label: 'GRAPE', weight: 12, multiplier: 1 }
];

const totalWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);

const pickSymbol = () => {
    let roll = Math.random() * totalWeight;
    for (const symbol of SYMBOLS) {
        if (roll < symbol.weight) {
            return symbol;
        }
        roll -= symbol.weight;
    }
    return SYMBOLS[SYMBOLS.length - 1];
};

const spinReels = () => [pickSymbol(), pickSymbol(), pickSymbol()];

const getUserWinRate = async (user) => {
    if (user && user.slotWinRate !== null && user.slotWinRate !== undefined) {
        return parseFloat(user.slotWinRate);
    }

    // Backward compatibility: use generic win rate if set
    if (user && user.winRate !== null && user.winRate !== undefined) {
        return parseFloat(user.winRate);
    }

    const slotSetting = await GameSettings.findOne({
        where: { settingKey: 'slot_win_rate' }
    });

    if (slotSetting) {
        return parseFloat(slotSetting.settingValue);
    }

    const defaultSetting = await GameSettings.findOne({
        where: { settingKey: 'default_win_rate' }
    });

    return defaultSetting ? parseFloat(defaultSetting.settingValue) : 45;
};

const isSlotOrganic = async (user) => {
    if (user && user.slotUseOrganic !== null && user.slotUseOrganic !== undefined) {
        return user.slotUseOrganic;
    }

    const setting = await GameSettings.findOne({
        where: { settingKey: 'slot_use_organic' }
    });

    return setting ? setting.settingValue === 'true' : false;
};

const shouldWin = async (user) => {
    const winRate = await getUserWinRate(user);
    return Math.random() * 100 < winRate;
};

const generateWinningReels = () => {
    const symbol = pickSymbol();
    return [symbol, symbol, symbol];
};

const generateLosingReels = () => {
    let reels = spinReels();
    if (reels[0].key === reels[1].key && reels[1].key === reels[2].key) {
        const alternatives = SYMBOLS.filter((symbol) => symbol.key !== reels[0].key);
        reels[2] = alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    return reels;
};

const evaluateReels = (reels) => {
    const [first, second, third] = reels;
    if (first.key === second.key && second.key === third.key) {
        return first.multiplier;
    }
    return 0;
};

const spin = async (req, res) => {
    try {
        const betAmount = parseFloat(req.body.betAmount);
        const userId = req.user.id;

        if (!betAmount || Number.isNaN(betAmount) || betAmount < MIN_BET) {
            return res.status(400).json({ message: `Minimal taruhan Rp ${MIN_BET.toLocaleString('id-ID')}` });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const currentBalance = parseFloat(user.balance);
        if (currentBalance < betAmount) {
            return res.status(400).json({
                message: `Saldo tidak cukup. Saldo Anda: Rp ${currentBalance.toLocaleString('id-ID')}`,
                balance: currentBalance,
                required: betAmount
            });
        }

        const useOrganic = await isSlotOrganic(user);
        const winRequested = useOrganic ? null : await shouldWin(user);
        const reels = useOrganic ? spinReels() : (winRequested ? generateWinningReels() : generateLosingReels());
        const multiplier = evaluateReels(reels);
        const isWin = multiplier > 0;

        let winAmount = 0;
        let newBalance = currentBalance - betAmount;
        if (isWin) {
            winAmount = betAmount * multiplier;
            newBalance = currentBalance + winAmount;
        }

        await user.update({ balance: newBalance });

        await GameHistory.create({
            userId,
            betAmount,
            betType: 'slot',
            betValue: reels.map((symbol) => symbol.key).join('|'),
            result: multiplier,
            resultColor: 'slot',
            isWin,
            winAmount,
            balanceAfter: newBalance
        });

        res.json({
            reels: reels.map((symbol) => symbol.key),
            isWin,
            multiplier,
            winAmount,
            balance: newBalance,
            message: isWin ? `Selamat! Menang x${multiplier}` : 'Belum beruntung, coba lagi!'
        });
    } catch (error) {
        console.error('Slot spin error:', error);
        res.status(500).json({ message: 'Slot spin failed', error: error.message });
    }
};

const getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit, 10) || 20;

        const history = await GameHistory.findAll({
            where: { userId, betType: 'slot' },
            order: [['createdAt', 'DESC']],
            limit
        });

        const formatted = history.map((entry) => ({
            id: entry.id,
            betAmount: entry.betAmount,
            reels: entry.betValue ? entry.betValue.split('|') : [],
            isWin: entry.isWin,
            winAmount: entry.winAmount,
            multiplier: entry.result,
            createdAt: entry.createdAt
        }));

        res.json({ history: formatted });
    } catch (error) {
        console.error('Slot history error:', error);
        res.status(500).json({ message: 'Failed to get slot history', error: error.message });
    }
};

const getBalance = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['balance']
        });

        res.json({ balance: user.balance });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ message: 'Failed to get balance', error: error.message });
    }
};

module.exports = { spin, getHistory, getBalance };
