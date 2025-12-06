const { DataTypes } = require('sequelize');
const { sequelize } = require('../models');

const ensureLanguageColumn = async () => {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('Users');

    if (!table.languageId) {
        await queryInterface.addColumn('Users', 'languageId', {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Languages',
                key: 'id'
            }
        });
        console.log('languageId column added to Users');
    }
};

module.exports = ensureLanguageColumn;
