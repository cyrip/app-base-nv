const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fromUserId: {
        type: DataTypes.INTEGER,
        allowNull: false
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
    }
}, {
    timestamps: true
});

module.exports = Message;
