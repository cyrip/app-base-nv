const { DataTypes } = require('sequelize');
const { sequelize } = require('../models');

const createChannelSessionKeysTable = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  // Check if table already exists
  const tables = await queryInterface.showAllTables();
  if (tables.includes('ChannelSessionKeys')) {
    console.log('ChannelSessionKeys table already exists');
    return;
  }

  // Create ChannelSessionKeys table
  await queryInterface.createTable('ChannelSessionKeys', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    channelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Channels',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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
    encryptedSessionKey: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    keyVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  console.log('ChannelSessionKeys table created');

  // Create composite index for channelId and userId
  await queryInterface.addIndex('ChannelSessionKeys', ['channelId', 'userId'], {
    name: 'idx_channel_session_keys_channel_user'
  });

  // Add unique constraint for channelId, userId, and keyVersion combination
  await queryInterface.addConstraint('ChannelSessionKeys', {
    fields: ['channelId', 'userId', 'keyVersion'],
    type: 'unique',
    name: 'unique_channel_user_version'
  });

  console.log('ChannelSessionKeys indexes created');
};

module.exports = createChannelSessionKeysTable;
