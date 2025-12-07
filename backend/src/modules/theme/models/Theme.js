const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Theme = sequelize.define('Theme', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    config: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
});

module.exports = Theme;
