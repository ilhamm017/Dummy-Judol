const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GameSettings = sequelize.define('GameSettings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    settingKey: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    settingValue: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = GameSettings;
