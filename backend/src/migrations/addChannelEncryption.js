const { DataTypes } = require('sequelize');
const { sequelize } = require('../models');

const addChannelEncryptionColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('Channels');

  // Add encryptionEnabled column
  if (!table.encryptionEnabled) {
    await queryInterface.addColumn('Channels', 'encryptionEnabled', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    console.log('encryptionEnabled column added to Channels');
  }

  // Add encryptionEnabledAt column
  if (!table.encryptionEnabledAt) {
    await queryInterface.addColumn('Channels', 'encryptionEnabledAt', {
      type: DataTypes.DATE,
      allowNull: true
    });
    console.log('encryptionEnabledAt column added to Channels');
  }

  // Add encryptionEnabledBy column
  if (!table.encryptionEnabledBy) {
    await queryInterface.addColumn('Channels', 'encryptionEnabledBy', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    console.log('encryptionEnabledBy column added to Channels');
  }
};

module.exports = addChannelEncryptionColumns;
