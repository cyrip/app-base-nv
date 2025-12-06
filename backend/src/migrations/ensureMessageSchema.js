const { DataTypes } = require('sequelize');
const { sequelize } = require('../models');

const ensureMessageSchema = async () => {
    const qi = sequelize.getQueryInterface();
    const table = await qi.describeTable('Messages');

    if (!table.channelId) {
        await qi.addColumn('Messages', 'channelId', {
            type: DataTypes.INTEGER,
            allowNull: true
        });
        console.log('Added channelId to Messages');
    }

    if (table.toUserId && table.toUserId.allowNull === false) {
        await qi.changeColumn('Messages', 'toUserId', {
            type: DataTypes.INTEGER,
            allowNull: true
        });
        console.log('Updated toUserId to allow null in Messages');
    }
};

module.exports = ensureMessageSchema;
