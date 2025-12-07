const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const ChannelParticipant = sequelize.define('ChannelParticipant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    role: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = ChannelParticipant;
