const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    role: {
        type: DataTypes.ENUM('admin', 'member'),
        defaultValue: 'member'
    },
    winRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Custom win rate percentage for this user (overrides global setting)'
    },
    rouletteWinRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Custom win rate percentage for roulette (overrides roulette setting)'
    },
    slotWinRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Custom win rate percentage for slot (overrides slot setting)'
    },
    rouletteUseOrganic: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        comment: 'Override organic mode for roulette (null = follow global)'
    },
    slotUseOrganic: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        comment: 'Override organic mode for slot (null = follow global)'
    }
}, {
    timestamps: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

User.prototype.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = User;
