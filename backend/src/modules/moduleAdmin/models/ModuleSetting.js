const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const ModuleSetting = sequelize.define('ModuleSetting', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    moduleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
});

module.exports = ModuleSetting;
