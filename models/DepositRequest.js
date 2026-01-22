const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DepositRequest = sequelize.define('DepositRequest', {
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
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    gopayNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'User GoPay number used for transfer'
    },
    proofImage: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Path to transfer proof image'
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
    },
    adminNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Admin notes for approval/rejection'
    },
    verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    verifiedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    }
}, {
    timestamps: true
});

module.exports = DepositRequest;
