const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserPublicKey = sequelize.define('UserPublicKey', {
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
    }
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
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: true,
  updatedAt: false
});

module.exports = UserPublicKey;
