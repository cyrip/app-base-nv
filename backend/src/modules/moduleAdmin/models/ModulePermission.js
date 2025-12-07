const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const ModulePermission = sequelize.define('ModulePermission', {
    moduleId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    permissionId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = ModulePermission;
