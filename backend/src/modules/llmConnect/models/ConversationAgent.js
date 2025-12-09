const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const ConversationAgent = sequelize.define('ConversationAgent', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    agentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = ConversationAgent;
