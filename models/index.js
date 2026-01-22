const sequelize = require('../config/database');
const User = require('./User');
const GameSettings = require('./GameSettings');
const GameHistory = require('./GameHistory');
const DepositRequest = require('./DepositRequest');

// Define associations
User.hasMany(GameHistory, { foreignKey: 'userId', as: 'gameHistory' });
GameHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(DepositRequest, { foreignKey: 'userId', as: 'deposits' });
DepositRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });
DepositRequest.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier' });

module.exports = {
    sequelize,
    User,
    GameSettings,
    GameHistory,
    DepositRequest
};
