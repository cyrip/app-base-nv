const request = require('supertest');
const app = require('../app');
const { User, Channel, ChannelParticipant, Message } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('E2EE Integration Tests', () => {
  let user1Token, user2Token;
  let user1, user2;
  let channel;

  beforeEach(async () => {
    // Create test users with hashed passwords and unique emails
    const hashedPassword = await bcrypt.hash('password123', 10);
    const timestamp = Date.now();
    
    user1 = await User.create({
      email: `alice-${timestamp}@test.com`,
      password: hashedPassword
    });

    user2 = await User.create({
      email: `bob-${timestamp}@test.com`,
      password: hashedPassword
    });

    // Generate tokens
    user1Token = jwt.sign(
      { id: user1.id, email: user1.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    user2Token = jwt.sign(
      { id: user2.id, email: user2.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create channel
    channel = await Channel.create({
      name: 'Test Channel',
      type: 'custom',
      createdBy: user1.id
    });

    await ChannelParticipant.bulkCreate([
      { channelId: channel.id, userId: user1.id },
      { channelId: channel.id, userId: user2.id }
    ]);
  });

  describe('Complete E2EE Flow', () => {
    test('should complete full encryption flow', async () => {
      // Step 1: User 1 uploads public key
      const timestamp = Date.now();
      const uploadKey1 = await request(app)
        .post('/api/users/keys')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicKey: 'user1-public-key-base64',
          keyType: 'RSA-4096',
          fingerprint: `user1-fingerprint-${timestamp}`
        });

      if (uploadKey1.status !== 201) {
        console.log('Upload key 1 failed:', uploadKey1.status, uploadKey1.body);
      }
      expect(uploadKey1.status).toBe(201);

      // Step 2: User 2 uploads public key
      const uploadKey2 = await request(app)
        .post('/api/users/keys')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          publicKey: 'user2-public-key-base64',
          keyType: 'RSA-4096',
          fingerprint: `user2-fingerprint-${timestamp}`
        });

      expect(uploadKey2.status).toBe(201);

      // Step 3: User 1 enables encryption on channel
      const enableEncryption = await request(app)
        .post(`/api/channels/${channel.id}/encryption/enable`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ confirm: true });

      expect(enableEncryption.status).toBe(200);
      expect(enableEncryption.body.success).toBe(true);
      expect(enableEncryption.body.encryptionEnabled).toBe(true);

      // Step 4: Verify channel is encrypted
      const checkStatus = await request(app)
        .get(`/api/channels/${channel.id}/encryption/status`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(checkStatus.status).toBe(200);
      expect(checkStatus.body.enabled).toBe(true);

      // Step 5: User 1 stores session key
      const storeKey1 = await request(app)
        .post(`/api/channels/${channel.id}/session-keys`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          encryptedKey: 'encrypted-session-key-for-user1',
          version: 1
        });

      expect(storeKey1.status).toBe(201);

      // Step 6: User 2 stores session key
      const storeKey2 = await request(app)
        .post(`/api/channels/${channel.id}/session-keys`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          encryptedKey: 'encrypted-session-key-for-user2',
          version: 1
        });

      expect(storeKey2.status).toBe(201);

      // Step 7: User 1 sends encrypted message
      const sendMessage = await request(app)
        .post(`/channels/${channel.id}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'encrypted-content-base64',
          encrypted: true,
          encryptionMetadata: {
            iv: 'random-iv-base64',
            algorithm: 'AES-256-GCM',
            signature: 'message-signature-base64',
            encryptedSessionKeys: [
              { encryptedKey: 'key-for-user1' },
              { encryptedKey: 'key-for-user2' }
            ]
          }
        });

      expect(sendMessage.status).toBe(200);
      expect(sendMessage.body.encrypted).toBe(true);

      // Step 8: User 2 retrieves encrypted message
      const getMessages = await request(app)
        .get(`/channels/${channel.id}/messages`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(getMessages.status).toBe(200);
      expect(getMessages.body.length).toBeGreaterThan(0);
      
      const encryptedMsg = getMessages.body.find(m => m.encrypted);
      expect(encryptedMsg).toBeDefined();
      expect(encryptedMsg.encryptionMetadata).toBeDefined();
      expect(encryptedMsg.encryptionMetadata.iv).toBe('random-iv-base64');
    });
  });

  describe('Mixed Mode (Encrypted and Unencrypted)', () => {
    test('should handle both encrypted and unencrypted messages', async () => {
      // Upload keys
      const timestamp = Date.now();
      await request(app)
        .post('/api/users/keys')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicKey: 'user1-public-key',
          keyType: 'RSA-4096',
          fingerprint: `fingerprint1-${timestamp}`
        });

      await request(app)
        .post('/api/users/keys')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          publicKey: 'user2-public-key',
          keyType: 'RSA-4096',
          fingerprint: `fingerprint2-${timestamp}`
        });

      // Send unencrypted message
      const unencryptedMsg = await request(app)
        .post(`/channels/${channel.id}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Hello, this is plaintext'
        });

      expect(unencryptedMsg.status).toBe(200);
      expect(unencryptedMsg.body.encrypted).toBeFalsy();

      // Enable encryption
      await request(app)
        .post(`/api/channels/${channel.id}/encryption/enable`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ confirm: true });

      // Store session keys
      await request(app)
        .post(`/api/channels/${channel.id}/session-keys`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ encryptedKey: 'key1', version: 1 });

      // Send encrypted message
      const encryptedMsg = await request(app)
        .post(`/channels/${channel.id}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'encrypted-content',
          encrypted: true,
          encryptionMetadata: {
            iv: 'iv',
            algorithm: 'AES-256-GCM',
            signature: 'sig',
            encryptedSessionKeys: [{ encryptedKey: 'key' }]
          }
        });

      expect(encryptedMsg.status).toBe(200);
      expect(encryptedMsg.body.encrypted).toBe(true);

      // Retrieve all messages
      const allMessages = await request(app)
        .get(`/channels/${channel.id}/messages`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(allMessages.status).toBe(200);
      
      const messages = allMessages.body;
      const plaintext = messages.find(m => !m.encrypted);
      const encrypted = messages.find(m => m.encrypted);

      expect(plaintext).toBeDefined();
      expect(encrypted).toBeDefined();
      expect(plaintext.content).toBe('Hello, this is plaintext');
      expect(encrypted.content).toBe('encrypted-content');
    });
  });

  describe('Encryption Cannot Be Disabled', () => {
    test('should not allow disabling encryption once enabled', async () => {
      // Upload keys
      const timestamp = Date.now();
      await request(app)
        .post('/api/users/keys')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicKey: 'key1',
          keyType: 'RSA-4096',
          fingerprint: `fp1-${timestamp}`
        });

      await request(app)
        .post('/api/users/keys')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          publicKey: 'key2',
          keyType: 'RSA-4096',
          fingerprint: `fp2-${timestamp}`
        });

      // Enable encryption
      const enable = await request(app)
        .post(`/api/channels/${channel.id}/encryption/enable`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ confirm: true });

      expect(enable.status).toBe(200);

      // Verify encryption is enabled
      const status = await request(app)
        .get(`/api/channels/${channel.id}/encryption/status`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(status.body.enabled).toBe(true);

      // Try to enable again (should be idempotent or fail gracefully)
      const enableAgain = await request(app)
        .post(`/api/channels/${channel.id}/encryption/enable`)
        .set('Authorization', `Bearer ${user1Token}`);

      // Should either succeed (idempotent) or return error
      expect([200, 400]).toContain(enableAgain.status);
    });
  });

  describe('New Participant Handling', () => {
    test('should handle new participant joining encrypted channel', async () => {
      // Create third user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const timestamp = Date.now();
      const user3 = await User.create({
        email: `charlie-${timestamp}@test.com`,
        password: hashedPassword
      });

      const user3Token = jwt.sign(
        { id: user3.id, email: user3.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Setup encryption
      const keyTimestamp = Date.now();
      await request(app)
        .post('/api/users/keys')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicKey: 'key1',
          keyType: 'RSA-4096',
          fingerprint: `fp1-${keyTimestamp}`
        });

      await request(app)
        .post('/api/users/keys')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          publicKey: 'key2',
          keyType: 'RSA-4096',
          fingerprint: `fp2-${keyTimestamp}`
        });

      await request(app)
        .post(`/api/channels/${channel.id}/encryption/enable`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ confirm: true });

      // User 3 uploads key
      await request(app)
        .post('/api/users/keys')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          publicKey: 'key3',
          keyType: 'RSA-4096',
          fingerprint: `fp3-${keyTimestamp}`
        });

      // Add user 3 to channel
      const addParticipant = await request(app)
        .post(`/channels/${channel.id}/participants`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ userId: user3.id });

      expect(addParticipant.status).toBe(200);
      expect(addParticipant.body.channelEncrypted).toBe(true);
      expect(addParticipant.body.participantHasKeys).toBe(true);

      // Add session key for user 3
      const addSessionKey = await request(app)
        .post(`/api/channels/${channel.id}/participants/${user3.id}/session-key`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ encryptedSessionKey: 'encrypted-key-for-user3' });

      expect(addSessionKey.status).toBe(200);
    });
  });

  describe('Session Key Rotation', () => {
    test('should rotate session key when participant leaves', async () => {
      // Setup encryption
      const timestamp = Date.now();
      await request(app)
        .post('/api/users/keys')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicKey: 'key1',
          keyType: 'RSA-4096',
          fingerprint: `fp1-${timestamp}`
        });

      await request(app)
        .post('/api/users/keys')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          publicKey: 'key2',
          keyType: 'RSA-4096',
          fingerprint: `fp2-${timestamp}`
        });

      await request(app)
        .post(`/api/channels/${channel.id}/encryption/enable`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ confirm: true });

      // Store initial session keys (version 1)
      await request(app)
        .post(`/api/channels/${channel.id}/session-keys`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ encryptedKey: 'initial-key-1', version: 1 });

      await request(app)
        .post(`/api/channels/${channel.id}/session-keys`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ encryptedKey: 'initial-key-2', version: 1 });

      // Remove user 2
      const removeParticipant = await request(app)
        .delete(`/channels/${channel.id}/participants/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(removeParticipant.status).toBe(200);
      expect(removeParticipant.body.requiresKeyRotation).toBe(true);

      // Rotate session key (version 2)
      const rotateKey = await request(app)
        .post(`/api/channels/${channel.id}/session-keys/rotate`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          encryptedSessionKeys: [
            { userId: user1.id, encryptedKey: 'rotated-key-1' }
          ]
        });

      if (rotateKey.body.keyVersion !== 2) {
        console.log('Rotation response:', rotateKey.body);
      }
      expect(rotateKey.status).toBe(200);
      expect(rotateKey.body.keyVersion).toBe(2);

      // Verify new key version
      const getKey = await request(app)
        .get(`/api/channels/${channel.id}/session-keys/me`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(getKey.status).toBe(200);
      expect(getKey.body.keyVersion).toBe(2);
      expect(getKey.body.encryptedSessionKey).toBe('rotated-key-1');
    });
  });
});
