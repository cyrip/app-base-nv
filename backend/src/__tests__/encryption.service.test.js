const encryptionService = require('../services/encryptionService');
const { User, UserPublicKey, Channel, ChannelParticipant, ChannelSessionKey } = require('../models');
const bcrypt = require('bcryptjs');

describe('EncryptionService', () => {
  let testUser1, testUser2, testUser3;
  let testChannel;

  beforeEach(async () => {
    // Create test users with hashed passwords and unique emails
    const hashedPassword = await bcrypt.hash('password123', 10);
    const timestamp = Date.now();
    
    testUser1 = await User.create({
      email: `user1-${timestamp}@test.com`,
      password: hashedPassword
    });

    testUser2 = await User.create({
      email: `user2-${timestamp}@test.com`,
      password: hashedPassword
    });

    testUser3 = await User.create({
      email: `user3-${timestamp}@test.com`,
      password: hashedPassword
    });

    // Create test channel
    testChannel = await Channel.create({
      name: 'Test Channel',
      type: 'custom',
      createdBy: testUser1.id
    });

    // Add participants
    await ChannelParticipant.bulkCreate([
      { channelId: testChannel.id, userId: testUser1.id },
      { channelId: testChannel.id, userId: testUser2.id }
    ]);
  });

  describe('Public Key Management', () => {
    test('should store and retrieve public key', async () => {
      const publicKey = 'test-public-key-base64';
      const fingerprint = `fp-${Date.now()}`;
      const keyType = 'RSA-4096';

      await encryptionService.storePublicKey(
        testUser1.id,
        publicKey,
        fingerprint,
        keyType
      );

      const retrieved = await encryptionService.getPublicKey(testUser1.id);
      expect(retrieved.publicKey).toBe(publicKey);
      expect(retrieved.fingerprint).toBe(fingerprint);
      expect(retrieved.keyType).toBe(keyType);
    });

    test('should get multiple public keys', async () => {
      const timestamp = Date.now();
      
      await encryptionService.storePublicKey(
        testUser1.id,
        'key1',
        `fingerprint1-${timestamp}`,
        'RSA-4096'
      );

      await encryptionService.storePublicKey(
        testUser2.id,
        'key2',
        `fingerprint2-${timestamp}`,
        'RSA-4096'
      );

      const keys = await encryptionService.getPublicKeys([testUser1.id, testUser2.id]);
      expect(keys).toHaveLength(2);
      expect(keys[0].publicKey).toBe('key1');
      expect(keys[1].publicKey).toBe('key2');
    });

    test('should identify users with keys', async () => {
      await encryptionService.storePublicKey(
        testUser1.id,
        'key1',
        `fingerprint1-${Date.now()}`,
        'RSA-4096'
      );

      const usersWithKeys = await encryptionService.getUsersWithKeys([
        testUser1.id,
        testUser2.id
      ]);

      expect(usersWithKeys).toContain(testUser1.id);
      expect(usersWithKeys).not.toContain(testUser2.id);
    });
  });

  describe('Channel Encryption', () => {
    beforeEach(async () => {
      // Give both users keys with unique fingerprints
      const timestamp = Date.now();
      
      await encryptionService.storePublicKey(
        testUser1.id,
        'key1',
        `fingerprint1-${timestamp}`,
        'RSA-4096'
      );

      await encryptionService.storePublicKey(
        testUser2.id,
        'key2',
        `fingerprint2-${timestamp}`,
        'RSA-4096'
      );
    });

    test('should enable encryption on channel', async () => {
      const result = await encryptionService.enableChannelEncryption(
        testChannel.id,
        testUser1.id
      );

      expect(result.encryptionEnabled).toBe(true);
      expect(result.channelId).toBe(testChannel.id);

      const channel = await Channel.findByPk(testChannel.id);
      expect(channel.encryptionEnabled).toBe(true);
      expect(channel.encryptionEnabledBy).toBe(testUser1.id);
    });

    test('should fail to enable encryption if participants missing keys', async () => {
      // Add user without keys
      await ChannelParticipant.create({
        channelId: testChannel.id,
        userId: testUser3.id
      });

      await expect(
        encryptionService.enableChannelEncryption(testChannel.id, testUser1.id)
      ).rejects.toThrow('do not have encryption keys');
    });

    test('should check if channel is encrypted', async () => {
      await encryptionService.enableChannelEncryption(
        testChannel.id,
        testUser1.id
      );

      const isEncrypted = await encryptionService.isChannelEncrypted(testChannel.id);
      expect(isEncrypted).toBe(true);
    });

    test('should get channel encryption status', async () => {
      await encryptionService.enableChannelEncryption(
        testChannel.id,
        testUser1.id
      );

      const status = await encryptionService.getChannelEncryptionStatus(testChannel.id);
      expect(status.enabled).toBe(true);
      expect(status.enabledBy).toBe(testUser1.id);
      expect(status.participantsWithKeys).toHaveLength(2);
      expect(status.participantsMissingKeys).toHaveLength(0);
    });
  });

  describe('Session Key Management', () => {
    test('should store and retrieve session key', async () => {
      const encryptedKey = 'encrypted-session-key-base64';

      await encryptionService.storeSessionKey(
        testChannel.id,
        testUser1.id,
        encryptedKey,
        1
      );

      const retrieved = await encryptionService.getSessionKey(
        testChannel.id,
        testUser1.id
      );

      expect(retrieved.encryptedSessionKey).toBe(encryptedKey);
      expect(retrieved.keyVersion).toBe(1);
    });

    test('should get all session keys for channel', async () => {
      await encryptionService.storeSessionKey(
        testChannel.id,
        testUser1.id,
        'key1',
        1
      );

      await encryptionService.storeSessionKey(
        testChannel.id,
        testUser2.id,
        'key2',
        1
      );

      const keys = await encryptionService.getChannelSessionKeys(testChannel.id);
      expect(keys).toHaveLength(2);
    });

    test('should add session key for new participant', async () => {
      // Enable encryption first
      const timestamp = Date.now();
      
      await encryptionService.storePublicKey(
        testUser1.id,
        'key1',
        `fingerprint1-${timestamp}`,
        'RSA-4096'
      );

      await encryptionService.storePublicKey(
        testUser2.id,
        'key2',
        `fingerprint2-${timestamp}`,
        'RSA-4096'
      );

      await encryptionService.enableChannelEncryption(
        testChannel.id,
        testUser1.id
      );

      // Add session key for user3
      await encryptionService.storePublicKey(
        testUser3.id,
        'key3',
        `fingerprint3-${timestamp}`,
        'RSA-4096'
      );

      await ChannelParticipant.create({
        channelId: testChannel.id,
        userId: testUser3.id
      });

      const result = await encryptionService.addSessionKeyForParticipant(
        testChannel.id,
        testUser3.id,
        'encrypted-key-for-user3'
      );

      expect(result.userId).toBe(testUser3.id);
      expect(result.channelId).toBe(testChannel.id);
    });
  });

  describe('Session Key Rotation', () => {
    beforeEach(async () => {
      // Setup encrypted channel with unique fingerprints
      const timestamp = Date.now();
      
      await encryptionService.storePublicKey(
        testUser1.id,
        'key1',
        `fingerprint1-${timestamp}`,
        'RSA-4096'
      );

      await encryptionService.storePublicKey(
        testUser2.id,
        'key2',
        `fingerprint2-${timestamp}`,
        'RSA-4096'
      );

      await encryptionService.enableChannelEncryption(
        testChannel.id,
        testUser1.id
      );

      // Store initial session keys
      await encryptionService.storeSessionKey(
        testChannel.id,
        testUser1.id,
        'initial-key-1',
        1
      );

      await encryptionService.storeSessionKey(
        testChannel.id,
        testUser2.id,
        'initial-key-2',
        1
      );
    });

    test('should rotate session key and increment version', async () => {
      const newEncryptedKeys = [
        { userId: testUser1.id, encryptedKey: 'new-key-1' },
        { userId: testUser2.id, encryptedKey: 'new-key-2' }
      ];

      const result = await encryptionService.rotateSessionKey(
        testChannel.id,
        newEncryptedKeys
      );

      expect(result.keyVersion).toBe(2);
      expect(result.participantCount).toBe(2);

      // Verify new keys are stored
      const key1 = await encryptionService.getSessionKey(
        testChannel.id,
        testUser1.id
      );
      expect(key1.keyVersion).toBe(2);
      expect(key1.encryptedSessionKey).toBe('new-key-1');
    });

    test('should fail rotation if missing keys for participants', async () => {
      const incompleteKeys = [
        { userId: testUser1.id, encryptedKey: 'new-key-1' }
        // Missing testUser2
      ];

      await expect(
        encryptionService.rotateSessionKey(testChannel.id, incompleteKeys)
      ).rejects.toThrow('Missing encrypted session keys');
    });

    test('should fail rotation on non-encrypted channel', async () => {
      const nonEncryptedChannel = await Channel.create({
        name: 'Non-Encrypted',
        type: 'custom',
        createdBy: testUser1.id
      });

      await expect(
        encryptionService.rotateSessionKey(nonEncryptedChannel.id, [])
      ).rejects.toThrow('not encrypted');
    });
  });
});
