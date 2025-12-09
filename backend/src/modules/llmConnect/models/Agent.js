const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Agent = sequelize.define('Agent', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false
    },
    instructions: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    provider: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'chatgpt'
    },
    apiKey: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = Agent;
