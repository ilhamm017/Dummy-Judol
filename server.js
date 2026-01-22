const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { sequelize, User, GameSettings } = require('./models');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const publicPath = path.join(__dirname, 'public');

function getTokenFromRequest(req) {
    const headerToken = req.headers.authorization?.split(' ')[1];
    const cookieToken = req.cookies?.auth_token;
    return headerToken || cookieToken || null;
}

function requirePageAuth(role) {
    return (req, res, next) => {
        const token = getTokenFromRequest(req);
        if (!token) {
            return res.redirect('/index.html');
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (role && decoded.role !== role) {
                return res.redirect('/index.html');
            }
            req.user = decoded;
            return next();
        } catch (error) {
            return res.redirect('/index.html');
        }
    };
}

app.get('/admin.html', requirePageAuth('admin'), (req, res) => {
    res.sendFile(path.join(publicPath, 'admin.html'));
});

app.get('/game.html', requirePageAuth(), (req, res) => {
    res.sendFile(path.join(publicPath, 'game.html'));
});

app.get('/deposit.html', requirePageAuth(), (req, res) => {
    res.sendFile(path.join(publicPath, 'deposit.html'));
});

app.get('/slot.html', requirePageAuth(), (req, res) => {
    res.sendFile(path.join(publicPath, 'slot.html'));
});

app.use(express.static('public'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/game', require('./routes/gameRoutes'));
app.use('/api/slot', require('./routes/slotRoutes'));
app.use('/api/deposit', require('./routes/depositRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function initializeDatabase() {
    try {
        const shouldAlter = process.env.DB_SYNC_ALTER === 'true';
        await sequelize.sync(shouldAlter ? { alter: true } : undefined);
        console.log(`✓ Database synchronized${shouldAlter ? ' (alter)' : ''}`);

        // Create default admin user
        const adminExists = await User.findOne({ where: { role: 'admin' } });
        if (!adminExists) {
            await User.create({
                username: 'admin',
                email: 'admin@roulette.com',
                password: 'admin123',
                role: 'admin',
                balance: 1000000
            });
            console.log('✓ Default admin user created (username: admin, password: admin123)');
        }

        // Create default game settings
        const defaultWinRate = await GameSettings.findOne({ where: { settingKey: 'default_win_rate' } });
        if (!defaultWinRate) {
            await GameSettings.create({
                settingKey: 'default_win_rate',
                settingValue: '45',
                description: 'Default win rate percentage for all users'
            });
            console.log('✓ Default win rate set to 45%');
        }

        const rouletteWinRate = await GameSettings.findOne({ where: { settingKey: 'roulette_win_rate' } });
        if (!rouletteWinRate) {
            await GameSettings.create({
                settingKey: 'roulette_win_rate',
                settingValue: '45',
                description: 'Roulette win rate percentage'
            });
            console.log('✓ Roulette win rate set to 45%');
        }

        const slotWinRate = await GameSettings.findOne({ where: { settingKey: 'slot_win_rate' } });
        if (!slotWinRate) {
            await GameSettings.create({
                settingKey: 'slot_win_rate',
                settingValue: '45',
                description: 'Slot win rate percentage'
            });
            console.log('✓ Slot win rate set to 45%');
        }

        const rouletteOrganic = await GameSettings.findOne({ where: { settingKey: 'roulette_use_organic' } });
        if (!rouletteOrganic) {
            await GameSettings.create({
                settingKey: 'roulette_use_organic',
                settingValue: 'false',
                description: 'Use organic roulette odds without admin manipulation'
            });
            console.log('✓ Roulette organic mode disabled');
        }

        const slotOrganic = await GameSettings.findOne({ where: { settingKey: 'slot_use_organic' } });
        if (!slotOrganic) {
            await GameSettings.create({
                settingKey: 'slot_use_organic',
                settingValue: 'false',
                description: 'Use organic slot odds without admin manipulation'
            });
            console.log('✓ Slot organic mode disabled');
        }

        const houseEdge = await GameSettings.findOne({ where: { settingKey: 'house_edge' } });
        if (!houseEdge) {
            await GameSettings.create({
                settingKey: 'house_edge',
                settingValue: '2.7',
                description: 'House edge percentage'
            });
            console.log('✓ House edge set to 2.7%');
        }

        if (process.env.SEED_DUMMY_USERS === 'true') {
            await seedDummyUsers();
        }
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

async function seedDummyUsers() {
    const dummyUsers = [
        { username: 'ilhamm017', email: 'ilhamm017@mail.com', balance: 15000, winRate: null },
        { username: 'joko', email: 'joko@mail.com', balance: 250000, winRate: 50 },
        { username: 'sari', email: 'sari@mail.com', balance: 125000, winRate: null },
        { username: 'budi', email: 'budi@mail.com', balance: 980000, winRate: 42.5 },
        { username: 'dinda', email: 'dinda@mail.com', balance: 54000, winRate: null },
        { username: 'fajar', email: 'fajar@mail.com', balance: 870000, winRate: 38 },
        { username: 'nisa', email: 'nisa@mail.com', balance: 320000, winRate: null },
        { username: 'rudi', email: 'rudi@mail.com', balance: 76000, winRate: 47.5 },
        { username: 'tina', email: 'tina@mail.com', balance: 410000, winRate: null },
        { username: 'arya', email: 'arya@mail.com', balance: 600000, winRate: 44 },
        { username: 'intan', email: 'intan@mail.com', balance: 93000, winRate: null },
        { username: 'ferdi', email: 'ferdi@mail.com', balance: 1200000, winRate: 52 },
        { username: 'tiara', email: 'tiara@mail.com', balance: 215000, winRate: null },
        { username: 'rizky', email: 'rizky@mail.com', balance: 350000, winRate: 41 },
        { username: 'amel', email: 'amel@mail.com', balance: 9800, winRate: null },
        { username: 'yusuf', email: 'yusuf@mail.com', balance: 480000, winRate: 49 },
        { username: 'laila', email: 'laila@mail.com', balance: 67000, winRate: null },
        { username: 'raka', email: 'raka@mail.com', balance: 540000, winRate: 45 },
        { username: 'mega', email: 'mega@mail.com', balance: 275000, winRate: null },
        { username: 'zaki', email: 'zaki@mail.com', balance: 760000, winRate: 46 }
    ];

    for (const user of dummyUsers) {
        const existing = await User.findOne({ where: { username: user.username } });
        if (existing) {
            continue;
        }

        await User.create({
            username: user.username,
            email: user.email,
            password: 'member123',
            role: 'member',
            balance: user.balance,
            winRate: user.winRate
        });
    }

    console.log('✓ Dummy users seeded');
}

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🎰 Roulette Server running on http://localhost:${PORT}`);
        console.log(`📁 Upload directory: ${path.join(__dirname, 'public/uploads')}`);
    });
});

module.exports = app;
