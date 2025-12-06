const { DataTypes } = require('sequelize');
const { sequelize } = require('../models');

const ensureUserSoftDelete = async () => {
    const qi = sequelize.getQueryInterface();
    const table = await qi.describeTable('Users');

    if (!table.isDeleted) {
        await qi.addColumn('Users', 'isDeleted', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
        console.log('Added isDeleted to Users');
    }
};

module.exports = ensureUserSoftDelete;
