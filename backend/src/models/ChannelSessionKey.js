const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChannelSessionKey = sequelize.define('ChannelSessionKey', {
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
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  encryptedSessionKey: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  keyVersion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  timestamps: true,
  createdAt: true,
  updatedAt: false
});

module.exports = ChannelSessionKey;
