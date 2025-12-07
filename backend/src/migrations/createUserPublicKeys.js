const { DataTypes } = require('sequelize');
const { sequelize } = require('../models');

const createUserPublicKeysTable = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  // Check if table already exists
  const tables = await queryInterface.showAllTables();
  if (tables.includes('UserPublicKeys')) {
    console.log('UserPublicKeys table already exists');
    return;
  }

  // Create UserPublicKeys table
  await queryInterface.createTable('UserPublicKeys', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    publicKey: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    keyType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'RSA-4096'
    },
    fingerprint: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });

  console.log('UserPublicKeys table created');

  // Create indexes
  await queryInterface.addIndex('UserPublicKeys', ['userId'], {
    name: 'idx_user_public_keys_user_id'
  });

  await queryInterface.addIndex('UserPublicKeys', ['fingerprint'], {
    name: 'idx_user_public_keys_fingerprint'
  });

  // Add unique constraint for userId and fingerprint combination
  await queryInterface.addConstraint('UserPublicKeys', {
    fields: ['userId', 'fingerprint'],
    type: 'unique',
    name: 'unique_user_fingerprint'
  });

  console.log('UserPublicKeys indexes created');
};

module.exports = createUserPublicKeysTable;
