const encryptionService = require('../services/encryptionService');

class EncryptionController {
  /**
   * POST /api/users/keys
   * Upload user's public key
   */
  async uploadPublicKey(req, res) {
    try {
      const userId = req.userId; // From auth middleware
      const { publicKey, fingerprint, algorithm } = req.body;

      if (!publicKey || !fingerprint) {
        return res.status(400).json({
          error: 'publicKey and fingerprint are required'
        });
      }

      const result = await encryptionService.storePublicKey(
        userId,
        publicKey,
        fingerprint,
        algorithm || 'RSA-4096'
      );

      res.status(201).json(result);
    } catch (error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  /**
   * GET /api/users/:userId/public-key
   * Get a user's public key (public endpoint)
   */
  async getPublicKey(req, res) {
    try {
      const { userId } = req.params;

      const publicKey = await encryptionService.getPublicKey(parseInt(userId));

      if (!publicKey) {
        return res.status(404).json({
          error: 'Public key not found for this user'
        });
      }

      res.json(publicKey);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/users/me/encryption/status
   * Get current user's encryption status
   */
  async getEncryptionStatus(req, res) {
    try {
      const userId = req.userId;

      const publicKey = await encryptionService.getPublicKey(userId);

      if (!publicKey) {
        return res.json({
          hasKeys: false,
          publicKeyFingerprint: null,
          keyCreatedAt: null
        });
      }

      res.json({
        hasKeys: true,
        publicKeyFingerprint: publicKey.fingerprint,
        keyCreatedAt: publicKey.createdAt,
        keyType: publicKey.keyType
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/channels/:channelId/encryption/enable
   * Enable encryption for a channel
   */
  async enableEncryption(req, res) {
    try {
      const userId = req.userId;
      const { channelId } = req.params;
      const { confirm } = req.body;

      if (!confirm) {
        return res.status(400).json({
          error: 'Confirmation required to enable encryption'
        });
      }

      const result = await encryptionService.enableChannelEncryption(
        parseInt(channelId),
        userId
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('already enabled')) {
        res.status(409).json({ error: error.message });
      } else if (error.message.includes('do not have encryption keys')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * GET /api/channels/:channelId/encryption/status
   * Get encryption status for a channel
   */
  async getChannelEncryptionStatus(req, res) {
    try {
      const { channelId } = req.params;

      const status = await encryptionService.getChannelEncryptionStatus(
        parseInt(channelId)
      );

      res.json(status);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * GET /api/channels/:channelId/participants/keys
   * Get public keys for all channel participants
   */
  async getParticipantKeys(req, res) {
    try {
      const { channelId } = req.params;

      // Get channel participants
      const { ChannelParticipant } = require('../models');
      const participants = await ChannelParticipant.findAll({
        where: { channelId: parseInt(channelId) },
        attributes: ['userId']
      });

      const participantIds = participants.map(p => p.userId);

      // Get public keys for all participants
      const publicKeys = await encryptionService.getPublicKeys(participantIds);

      res.json(publicKeys);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/channels/:channelId/session-keys
   * Store encrypted session key for current user
   */
  async storeSessionKey(req, res) {
    try {
      const userId = req.userId; // From auth middleware
      const { channelId } = req.params;
      const { encryptedKey, version } = req.body;

      if (!encryptedKey) {
        return res.status(400).json({
          error: 'encryptedKey is required'
        });
      }

      const result = await encryptionService.storeSessionKey(
        parseInt(channelId),
        userId,
        encryptedKey,
        version || 1
      );

      res.status(201).json(result);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('not a participant')) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * GET /api/channels/:channelId/session-keys/me
   * Get current user's encrypted session key for a channel
   */
  async getMySessionKey(req, res) {
    try {
      const userId = req.userId;
      const { channelId } = req.params;

      const sessionKey = await encryptionService.getSessionKey(
        parseInt(channelId),
        userId
      );

      if (!sessionKey) {
        return res.status(404).json({
          error: 'Session key not found'
        });
      }

      res.json(sessionKey);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/channels/:channelId/participants/:userId/session-key
   * Add encrypted session key for a new participant
   */
  async addParticipantSessionKey(req, res) {
    try {
      const { channelId, userId } = req.params;
      const { encryptedSessionKey } = req.body;

      if (!encryptedSessionKey) {
        return res.status(400).json({ error: 'encryptedSessionKey is required' });
      }

      const result = await encryptionService.addSessionKeyForParticipant(
        parseInt(channelId),
        parseInt(userId),
        encryptedSessionKey
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/channels/:channelId/session-keys/rotate
   * Rotate session key for a channel (when participant leaves)
   */
  async rotateSessionKey(req, res) {
    try {
      const { channelId } = req.params;
      const { encryptedSessionKeys } = req.body;

      if (!encryptedSessionKeys || !Array.isArray(encryptedSessionKeys)) {
        return res.status(400).json({ 
          error: 'encryptedSessionKeys array is required' 
        });
      }

      const result = await encryptionService.rotateSessionKey(
        parseInt(channelId),
        encryptedSessionKeys
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new EncryptionController();
