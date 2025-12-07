const { DataTypes } = require('sequelize');
const { sequelize } = require('../models');

const addMessageEncryptionColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('Messages');

  // Add encrypted column
  if (!table.encrypted) {
    await queryInterface.addColumn('Messages', 'encrypted', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    console.log('encrypted column added to Messages');
  }

  // Add encryptionMetadata column
  if (!table.encryptionMetadata) {
    await queryInterface.addColumn('Messages', 'encryptionMetadata', {
      type: DataTypes.JSON,
      allowNull: true
    });
    console.log('encryptionMetadata column added to Messages');
  }
};

module.exports = addMessageEncryptionColumns;
