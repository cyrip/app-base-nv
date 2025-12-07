const { User, UserPublicKey, Channel, ChannelSessionKey, ChannelParticipant } = require('../models');

class EncryptionService {
  /**
   * Store a user's public key
   */
  async storePublicKey(userId, publicKey, fingerprint, algorithm = 'RSA-4096') {
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if fingerprint already exists
    const existing = await UserPublicKey.findOne({
      where: { fingerprint }
    });

    if (existing) {
      throw new Error('Public key with this fingerprint already exists');
    }

    // Create new public key record
    const userPublicKey = await UserPublicKey.create({
      userId,
      publicKey,
      keyType: algorithm,
      fingerprint
    });

    return {
      id: userPublicKey.id,
      userId: userPublicKey.userId,
      fingerprint: userPublicKey.fingerprint,
      keyType: userPublicKey.keyType,
      createdAt: userPublicKey.createdAt
    };
  }

  /**
   * Get a user's public key
   */
  async getPublicKey(userId) {
    const publicKey = await UserPublicKey.findOne({
      where: {
        userId,
        revokedAt: null
      },
      order: [['createdAt', 'DESC']]
    });

    if (!publicKey) {
      return null;
    }

    return {
      id: publicKey.id,
      userId: publicKey.userId,
      publicKey: publicKey.publicKey,
      keyType: publicKey.keyType,
      fingerprint: publicKey.fingerprint,
      createdAt: publicKey.createdAt
    };
  }

  /**
   * Get public keys for multiple users
   */
  async getPublicKeys(userIds) {
    const publicKeys = await UserPublicKey.findAll({
      where: {
        userId: userIds,
        revokedAt: null
      },
      order: [['userId', 'ASC'], ['createdAt', 'DESC']]
    });

    // Get the latest key for each user
    const keyMap = new Map();
    publicKeys.forEach(key => {
      if (!keyMap.has(key.userId)) {
        keyMap.set(key.userId, {
          id: key.id,
          userId: key.userId,
          publicKey: key.publicKey,
          keyType: key.keyType,
          fingerprint: key.fingerprint,
          createdAt: key.createdAt
        });
      }
    });

    return Array.from(keyMap.values());
  }

  /**
   * Check which users have public keys
   */
  async getUsersWithKeys(userIds) {
    const publicKeys = await UserPublicKey.findAll({
      where: {
        userId: userIds,
        revokedAt: null
      },
      attributes: ['userId'],
      group: ['userId']
    });

    return publicKeys.map(pk => pk.userId);
  }

  /**
   * Enable encryption for a channel
   */
  async enableChannelEncryption(channelId, userId) {
    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    if (channel.encryptionEnabled) {
      throw new Error('Encryption already enabled for this channel');
    }

    // Get all participants
    const participants = await ChannelParticipant.findAll({
      where: { channelId },
      attributes: ['userId']
    });

    const participantIds = participants.map(p => p.userId);

    // Check if all participants have keys
    const usersWithKeys = await this.getUsersWithKeys(participantIds);
    const missingKeys = participantIds.filter(id => !usersWithKeys.includes(id));

    if (missingKeys.length > 0) {
      throw new Error(`Some participants do not have encryption keys: ${missingKeys.join(', ')}`);
    }

    // Enable encryption
    channel.encryptionEnabled = true;
    channel.encryptionEnabledAt = new Date();
    channel.encryptionEnabledBy = userId;
    await channel.save();

    // System message creation commented out for now - database constraint issue
    // TODO: Re-enable after fixing Message model to allow null fromUserId
    // const { Message, User } = require('../models');
    // const enabledByUser = await User.findByPk(userId, { attributes: ['email'] });
    // await Message.create({
    //   channelId,
    //   fromUserId: null,
    //   toUserId: null,
    //   content: `🔒 End-to-end encryption enabled by ${enabledByUser?.email || 'user'}. All future messages will be encrypted.`,
    //   encrypted: false,
    //   encryptionMetadata: null
    // });

    return {
      channelId: channel.id,
      encryptionEnabled: true,
      encryptionEnabledAt: channel.encryptionEnabledAt,
      encryptionEnabledBy: channel.encryptionEnabledBy
    };
  }

  /**
   * Check if a channel has encryption enabled
   */
  async isChannelEncrypted(channelId) {
    const channel = await Channel.findByPk(channelId, {
      attributes: ['encryptionEnabled']
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    return channel.encryptionEnabled || false;
  }

  /**
   * Get encryption status for a channel
   */
  async getChannelEncryptionStatus(channelId) {
    const channel = await Channel.findByPk(channelId, {
      attributes: ['id', 'encryptionEnabled', 'encryptionEnabledAt', 'encryptionEnabledBy']
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    // Get all participants
    const participants = await ChannelParticipant.findAll({
      where: { channelId },
      attributes: ['userId']
    });

    const participantIds = participants.map(p => p.userId);

    // Check which participants have keys
    const usersWithKeys = await this.getUsersWithKeys(participantIds);
    const usersMissingKeys = participantIds.filter(id => !usersWithKeys.includes(id));

    return {
      enabled: channel.encryptionEnabled || false,
      enabledAt: channel.encryptionEnabledAt,
      enabledBy: channel.encryptionEnabledBy,
      participantsWithKeys: usersWithKeys,
      participantsMissingKeys: usersMissingKeys
    };
  }

  /**
   * Store an encrypted session key for a user in a channel
   */
  async storeSessionKey(channelId, userId, encryptedKey, version = 1) {
    // Check if channel exists
    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check if user is a participant
    const participant = await ChannelParticipant.findOne({
      where: { channelId, userId }
    });

    if (!participant) {
      throw new Error('User is not a participant of this channel');
    }

    // Store or update session key
    const [sessionKey, created] = await ChannelSessionKey.upsert({
      channelId,
      userId,
      encryptedSessionKey: encryptedKey,
      keyVersion: version
    }, {
      returning: true
    });

    return {
      id: sessionKey.id,
      channelId: sessionKey.channelId,
      userId: sessionKey.userId,
      keyVersion: sessionKey.keyVersion,
      createdAt: sessionKey.createdAt
    };
  }

  /**
   * Get encrypted session key for a user in a channel
   */
  async getSessionKey(channelId, userId, version = null) {
    const where = {
      channelId,
      userId
    };

    if (version !== null) {
      where.keyVersion = version;
    }

    const sessionKey = await ChannelSessionKey.findOne({
      where,
      order: [['keyVersion', 'DESC']]
    });

    if (!sessionKey) {
      return null;
    }

    return {
      id: sessionKey.id,
      channelId: sessionKey.channelId,
      userId: sessionKey.userId,
      encryptedSessionKey: sessionKey.encryptedSessionKey,
      keyVersion: sessionKey.keyVersion,
      createdAt: sessionKey.createdAt
    };
  }

  /**
   * Get all session keys for a channel (for all participants)
   */
  async getChannelSessionKeys(channelId, version = null) {
    const where = { channelId };

    if (version !== null) {
      where.keyVersion = version;
    }

    const sessionKeys = await ChannelSessionKey.findAll({
      where,
      order: [['userId', 'ASC']]
    });

    return sessionKeys.map(sk => ({
      id: sk.id,
      channelId: sk.channelId,
      userId: sk.userId,
      encryptedSessionKey: sk.encryptedSessionKey,
      keyVersion: sk.keyVersion,
      createdAt: sk.createdAt
    }));
  }

  /**
   * Add encrypted session key for a new participant in an encrypted channel
   * This is called when a new user joins an encrypted channel
   */
  async addSessionKeyForParticipant(channelId, userId, encryptedSessionKey) {
    // Check if channel is encrypted
    const channel = await Channel.findByPk(channelId);
    if (!channel || !channel.encryptionEnabled) {
      throw new Error('Channel is not encrypted');
    }

    // Check if user has public key
    const publicKey = await this.getPublicKey(userId);
    if (!publicKey) {
      throw new Error('User does not have encryption keys');
    }

    // Get current key version for this channel
    const latestKey = await ChannelSessionKey.findOne({
      where: { channelId },
      order: [['keyVersion', 'DESC']]
    });

    const version = latestKey ? latestKey.keyVersion : 1;

    // Store the encrypted session key
    const sessionKey = await ChannelSessionKey.create({
      channelId,
      userId,
      encryptedSessionKey,
      keyVersion: version
    });

    return {
      id: sessionKey.id,
      channelId: sessionKey.channelId,
      userId: sessionKey.userId,
      keyVersion: sessionKey.keyVersion,
      createdAt: sessionKey.createdAt
    };
  }

  /**
   * Rotate session key for a channel
   * This is called when a participant leaves an encrypted channel
   * Returns the new key version that clients should use
   */
  async rotateSessionKey(channelId, encryptedSessionKeys) {
    // Check if channel is encrypted
    const channel = await Channel.findByPk(channelId);
    if (!channel || !channel.encryptionEnabled) {
      throw new Error('Channel is not encrypted');
    }

    // Get current key version
    const latestKey = await ChannelSessionKey.findOne({
      where: { channelId },
      order: [['keyVersion', 'DESC']]
    });

    const newVersion = latestKey ? latestKey.keyVersion + 1 : 1;

    // Get current participants
    const participants = await ChannelParticipant.findAll({
      where: { channelId },
      attributes: ['userId']
    });

    const participantIds = participants.map(p => p.userId);

    // Validate that we have encrypted keys for all current participants
    const providedUserIds = encryptedSessionKeys.map(k => k.userId);
    const missingKeys = participantIds.filter(id => !providedUserIds.includes(id));

    if (missingKeys.length > 0) {
      throw new Error(`Missing encrypted session keys for users: ${missingKeys.join(', ')}`);
    }

    // Store new encrypted session keys for all participants
    const sessionKeyRecords = encryptedSessionKeys.map(({ userId, encryptedKey }) => ({
      channelId,
      userId,
      encryptedSessionKey: encryptedKey,
      keyVersion: newVersion
    }));

    await ChannelSessionKey.bulkCreate(sessionKeyRecords);

    return {
      channelId,
      keyVersion: newVersion,
      participantCount: participantIds.length,
      message: 'Session key rotated successfully'
    };
  }
}

module.exports = new EncryptionService();
