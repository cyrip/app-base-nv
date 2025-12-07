const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fromUserId: {
        type: DataTypes.INTEGER,
        allowNull: true // Allow null for system messages
    },
    toUserId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    channelId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: false
    },
    encrypted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    encryptionMetadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = Message;
