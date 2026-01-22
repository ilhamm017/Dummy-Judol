const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GameHistory = sequelize.define('GameHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    betAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    betType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'number, red, black, odd, even, etc.'
    },
    betValue: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Specific number or value bet on'
    },
    result: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'The winning number from the spin'
    },
    resultColor: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'red, black, or green'
    },
    isWin: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    winAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    balanceAfter: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = GameHistory;
