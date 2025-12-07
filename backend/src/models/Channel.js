const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Channel = sequelize.define('Channel', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING, // direct | group | custom
        allowNull: false,
        defaultValue: 'custom'
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    encryptionEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    encryptionEnabledAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    encryptionEnabledBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = Channel;
