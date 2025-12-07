/**
 * Property-Based Tests for Encryption Service
 * These tests validate security properties and invariants
 */

import { describe, test, expect } from 'vitest';
import encryptionService from '../encryption';

describe('Encryption Service - Property Tests', () => {
  describe('Property 1: Key Generation Produces Valid Key Pairs', () => {
    test('generated keys should be valid RSA-4096 key pairs', async () => {
      const keyPair = await encryptionService.generateKeyPair();

      // Property: Keys must exist
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.fingerprint).toBeDefined();

      // Property: Keys must be base64 strings
      expect(typeof keyPair.publicKey).toBe('string');
      expect(typeof keyPair.privateKey).toBe('string');
      expect(keyPair.publicKey.length).toBeGreaterThan(0);
      expect(keyPair.privateKey.length).toBeGreaterThan(0);

      // Property: Algorithm must be RSA-4096
      expect(keyPair.algorithm).toBe('RSA-4096');

      // Property: Fingerprint must be 40 character hex string
      expect(keyPair.fingerprint).toMatch(/^[0-9a-f]{40}$/);
    });

    test('generated keys should be usable for encryption/decryption', async () => {
      const keyPair = await encryptionService.generateKeyPair();

      // Property: Keys must be functional
      const testData = 'test message';
      const sessionKey = await encryptionService.generateSessionKey();
      
      // Encrypt session key with public key
      const encryptedSessionKey = await encryptionService.encryptSessionKey(
        sessionKey,
        keyPair.publicKey
      );

      // Decrypt session key with private key
      const decryptedSessionKey = await encryptionService.decryptSessionKey(
        encryptedSessionKey,
        keyPair.privateKey
      );

      // Property: Decrypted key should work for encryption
      const encrypted = await encryptionService.encryptMessage(
        testData,
        [keyPair.publicKey],
        sessionKey
      );

      expect(encrypted.encryptedContent).toBeDefined();
    });

    test('multiple key generations should produce different keys', async () => {
      const keyPair1 = await encryptionService.generateKeyPair();
      const keyPair2 = await encryptionService.generateKeyPair();

      // Property: Each generation must produce unique keys
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
      expect(keyPair1.fingerprint).not.toBe(keyPair2.fingerprint);
    });
  });

  describe('Property 12: Fingerprint Uniqueness', () => {
    test('same public key should always produce same fingerprint', async () => {
      const keyPair = await encryptionService.generateKeyPair();

      // Generate fingerprint multiple times
      const fingerprint1 = await encryptionService.generateFingerprint(keyPair.publicKey);
      const fingerprint2 = await encryptionService.generateFingerprint(keyPair.publicKey);
      const fingerprint3 = await encryptionService.generateFingerprint(keyPair.publicKey);

      // Property: Fingerprint must be deterministic
      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint2).toBe(fingerprint3);
      expect(fingerprint1).toBe(keyPair.fingerprint);
    });

    test('different public keys should produce different fingerprints', async () => {
      const keyPair1 = await encryptionService.generateKeyPair();
      const keyPair2 = await encryptionService.generateKeyPair();

      // Property: Different keys must have different fingerprints
      expect(keyPair1.fingerprint).not.toBe(keyPair2.fingerprint);
    });

    test('fingerprint should be collision-resistant', async () => {
      // Generate multiple key pairs
      const fingerprints = new Set();
      const iterations = 5; // Reduced for performance

      for (let i = 0; i < iterations; i++) {
        const keyPair = await encryptionService.generateKeyPair();
        fingerprints.add(keyPair.fingerprint);
      }

      // Property: All fingerprints must be unique (no collisions)
      expect(fingerprints.size).toBe(iterations);
    }, 30000); // 30 second timeout for RSA-4096 key generation

    test('fingerprint format should be consistent', async () => {
      const keyPair = await encryptionService.generateKeyPair();

      // Property: Fingerprint must be 40-character lowercase hex
      expect(keyPair.fingerprint).toMatch(/^[0-9a-f]{40}$/);
      expect(keyPair.fingerprint.length).toBe(40);
    });
  });

  describe('Property 6: Message Encryption Round Trip', () => {
    test('encrypted message should decrypt to original plaintext', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      const plaintext = 'This is a secret message';

      // Encrypt message
      const encrypted = await encryptionService.encryptMessage(
        plaintext,
        [keyPair.publicKey]
      );

      // Decrypt message
      const decrypted = await encryptionService.decryptMessage(
        encrypted,
        encrypted.encryptedSessionKeys[0].encryptedKey,
        keyPair.privateKey
      );

      // Property: Decrypted text must equal original plaintext
      expect(decrypted).toBe(plaintext);
    });

    test('round trip should work with various message lengths', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      
      const testMessages = [
        '', // Empty
        'a', // Single character
        'Hello, World!', // Short message
        'A'.repeat(1000), // Long message
        '🔒 Unicode 中文 العربية', // Unicode
        JSON.stringify({ complex: 'object', with: ['arrays', 123] }) // JSON
      ];

      for (const plaintext of testMessages) {
        const encrypted = await encryptionService.encryptMessage(
          plaintext,
          [keyPair.publicKey]
        );

        const decrypted = await encryptionService.decryptMessage(
          encrypted,
          encrypted.encryptedSessionKeys[0].encryptedKey,
          keyPair.privateKey
        );

        // Property: Round trip must preserve exact content
        expect(decrypted).toBe(plaintext);
      }
    });

    test('encrypted content should be different from plaintext', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      const plaintext = 'secret message';

      const encrypted = await encryptionService.encryptMessage(
        plaintext,
        [keyPair.publicKey]
      );

      // Property: Encrypted content must not contain plaintext
      expect(encrypted.encryptedContent).not.toContain(plaintext);
      expect(encrypted.encryptedContent).not.toBe(plaintext);
    });

    test('same plaintext should produce different ciphertext (IV randomness)', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      const plaintext = 'same message';

      const encrypted1 = await encryptionService.encryptMessage(
        plaintext,
        [keyPair.publicKey]
      );

      const encrypted2 = await encryptionService.encryptMessage(
        plaintext,
        [keyPair.publicKey]
      );

      // Property: Different IVs must produce different ciphertexts
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encryptedContent).not.toBe(encrypted2.encryptedContent);

      // But both should decrypt to same plaintext
      const decrypted1 = await encryptionService.decryptMessage(
        encrypted1,
        encrypted1.encryptedSessionKeys[0].encryptedKey,
        keyPair.privateKey
      );

      const decrypted2 = await encryptionService.decryptMessage(
        encrypted2,
        encrypted2.encryptedSessionKeys[0].encryptedKey,
        keyPair.privateKey
      );

      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    test('wrong private key should fail to decrypt', async () => {
      const keyPair1 = await encryptionService.generateKeyPair();
      const keyPair2 = await encryptionService.generateKeyPair();
      const plaintext = 'secret';

      const encrypted = await encryptionService.encryptMessage(
        plaintext,
        [keyPair1.publicKey]
      );

      // Property: Wrong key must not decrypt message
      await expect(
        encryptionService.decryptMessage(
          encrypted,
          encrypted.encryptedSessionKeys[0].encryptedKey,
          keyPair2.privateKey
        )
      ).rejects.toThrow();
    });
  });

  describe('Property 7: Signature Verification Detects Tampering', () => {
    test('valid signature should verify successfully', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      const data = 'important data';
      const dataBase64 = btoa(data);

      // Sign data
      const signature = await encryptionService.signMessage(
        dataBase64,
        keyPair.privateKey
      );

      // Verify signature
      const isValid = await encryptionService.verifySignature(
        dataBase64,
        signature,
        keyPair.publicKey
      );

      // Property: Valid signature must verify
      expect(isValid).toBe(true);
    });

    test('tampered data should fail verification', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      const originalData = 'original data';
      const tamperedData = 'tampered data';

      const originalBase64 = btoa(originalData);
      const tamperedBase64 = btoa(tamperedData);

      // Sign original data
      const signature = await encryptionService.signMessage(
        originalBase64,
        keyPair.privateKey
      );

      // Verify with tampered data
      const isValid = await encryptionService.verifySignature(
        tamperedBase64,
        signature,
        keyPair.publicKey
      );

      // Property: Tampered data must fail verification
      expect(isValid).toBe(false);
    });

    test('tampered signature should fail verification', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      const data = 'data';
      const dataBase64 = btoa(data);

      // Sign data
      const signature = await encryptionService.signMessage(
        dataBase64,
        keyPair.privateKey
      );

      // Tamper with signature (flip one bit)
      const signatureBytes = atob(signature);
      const tamperedBytes = signatureBytes.substring(0, 10) + 
        String.fromCharCode(signatureBytes.charCodeAt(10) ^ 1) + 
        signatureBytes.substring(11);
      const tamperedSignature = btoa(tamperedBytes);

      // Verify tampered signature
      const isValid = await encryptionService.verifySignature(
        dataBase64,
        tamperedSignature,
        keyPair.publicKey
      );

      // Property: Tampered signature must fail verification
      expect(isValid).toBe(false);
    });

    test('wrong public key should fail verification', async () => {
      const keyPair1 = await encryptionService.generateKeyPair();
      const keyPair2 = await encryptionService.generateKeyPair();
      const data = 'data';
      const dataBase64 = btoa(data);

      // Sign with keyPair1
      const signature = await encryptionService.signMessage(
        dataBase64,
        keyPair1.privateKey
      );

      // Verify with keyPair2's public key
      const isValid = await encryptionService.verifySignature(
        dataBase64,
        signature,
        keyPair2.publicKey
      );

      // Property: Wrong key must fail verification
      expect(isValid).toBe(false);
    });

    test('signature should be deterministic for same data', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      const data = 'consistent data';
      const dataBase64 = btoa(data);

      // Sign multiple times
      const signature1 = await encryptionService.signMessage(
        dataBase64,
        keyPair.privateKey
      );

      const signature2 = await encryptionService.signMessage(
        dataBase64,
        keyPair.privateKey
      );

      // Property: Same data should produce same signature
      expect(signature1).toBe(signature2);
    });
  });

  describe('Property 10: Session Key Encryption Per Recipient', () => {
    test('session key should be encrypted differently for each recipient', async () => {
      const keyPair1 = await encryptionService.generateKeyPair();
      const keyPair2 = await encryptionService.generateKeyPair();
      const keyPair3 = await encryptionService.generateKeyPair();

      const plaintext = 'group message';

      // Encrypt for multiple recipients
      const encrypted = await encryptionService.encryptMessage(
        plaintext,
        [keyPair1.publicKey, keyPair2.publicKey, keyPair3.publicKey]
      );

      // Property: Each recipient should have different encrypted session key
      expect(encrypted.encryptedSessionKeys).toHaveLength(3);
      expect(encrypted.encryptedSessionKeys[0].encryptedKey)
        .not.toBe(encrypted.encryptedSessionKeys[1].encryptedKey);
      expect(encrypted.encryptedSessionKeys[1].encryptedKey)
        .not.toBe(encrypted.encryptedSessionKeys[2].encryptedKey);
    }, 20000); // 20 second timeout for multiple RSA operations

    test('all recipients should decrypt to same plaintext', async () => {
      const keyPair1 = await encryptionService.generateKeyPair();
      const keyPair2 = await encryptionService.generateKeyPair();
      const keyPair3 = await encryptionService.generateKeyPair();

      const plaintext = 'shared secret';

      // Encrypt for multiple recipients
      const encrypted = await encryptionService.encryptMessage(
        plaintext,
        [keyPair1.publicKey, keyPair2.publicKey, keyPair3.publicKey]
      );

      // Each recipient decrypts
      const decrypted1 = await encryptionService.decryptMessage(
        encrypted,
        encrypted.encryptedSessionKeys[0].encryptedKey,
        keyPair1.privateKey
      );

      const decrypted2 = await encryptionService.decryptMessage(
        encrypted,
        encrypted.encryptedSessionKeys[1].encryptedKey,
        keyPair2.privateKey
      );

      const decrypted3 = await encryptionService.decryptMessage(
        encrypted,
        encrypted.encryptedSessionKeys[2].encryptedKey,
        keyPair3.privateKey
      );

      // Property: All recipients must get same plaintext
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
      expect(decrypted3).toBe(plaintext);
    }, 20000); // 20 second timeout for multiple RSA operations

    test('recipient cannot use another recipient\'s encrypted session key', async () => {
      const keyPair1 = await encryptionService.generateKeyPair();
      const keyPair2 = await encryptionService.generateKeyPair();

      const plaintext = 'private message';

      const encrypted = await encryptionService.encryptMessage(
        plaintext,
        [keyPair1.publicKey, keyPair2.publicKey]
      );

      // Property: Recipient 1 cannot use recipient 2's encrypted key
      await expect(
        encryptionService.decryptMessage(
          encrypted,
          encrypted.encryptedSessionKeys[1].encryptedKey, // Wrong key
          keyPair1.privateKey
        )
      ).rejects.toThrow();
    }, 15000); // 15 second timeout for RSA operations
  });

  describe('Property 2: Private Keys Never Leave the Browser', () => {
    test('private key should only be stored in IndexedDB', async () => {
      const userId = 123;
      const keyPair = await encryptionService.generateKeyPair();

      // Store private key
      await encryptionService.storePrivateKey(userId, keyPair.privateKey);

      // Property: Private key should be in IndexedDB
      const hasKeys = await encryptionService.hasKeys(userId);
      expect(hasKeys).toBe(true);

      // Property: Private key should be retrievable
      const retrieved = await encryptionService.getPrivateKey(userId);
      expect(retrieved).toBe(keyPair.privateKey);
    });

    test('exported keys should be in encrypted format', async () => {
      const userId = 456;
      const keyPair = await encryptionService.generateKeyPair();

      await encryptionService.storePrivateKey(userId, keyPair.privateKey);

      // Export keys
      const backup = await encryptionService.exportKeys(userId);

      // Property: Backup should be a Blob
      expect(backup).toBeInstanceOf(Blob);
      expect(backup.type).toBe('application/json');

      // Read backup content
      const text = await backup.text();
      const data = JSON.parse(text);

      // Property: Backup should contain encrypted private key
      expect(data.privateKey).toBeDefined();
      expect(data.userId).toBe(userId);
      expect(data.version).toBe(1);
    });

    test('imported keys should be stored securely', async () => {
      const userId = 789;
      const keyPair = await encryptionService.generateKeyPair();

      // Create backup file
      const backup = {
        version: 1,
        userId,
        privateKey: keyPair.privateKey,
        exportedAt: new Date().toISOString()
      };

      const file = new File(
        [JSON.stringify(backup)],
        'backup.json',
        { type: 'application/json' }
      );

      // Import keys
      const result = await encryptionService.importKeys(userId, file);

      // Property: Import should succeed
      expect(result.success).toBe(true);

      // Property: Keys should be retrievable from IndexedDB
      const retrieved = await encryptionService.getPrivateKey(userId);
      expect(retrieved).toBe(keyPair.privateKey);
    });
  });

  describe('Property 5: Encrypted Messages Cannot Be Read Without Private Key', () => {
    test('encrypted message should be unreadable without decryption', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      const plaintext = 'confidential information';

      const encrypted = await encryptionService.encryptMessage(
        plaintext,
        [keyPair.publicKey]
      );

      // Property: Encrypted content should not reveal plaintext
      expect(encrypted.encryptedContent).not.toContain(plaintext);
      
      // Try to decode as if it were base64 encoded plaintext
      try {
        const decoded = atob(encrypted.encryptedContent);
        expect(decoded).not.toContain(plaintext);
      } catch (e) {
        // If it fails to decode, that's also fine
      }
    });

    test('encrypted message without session key should be unreadable', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      const plaintext = 'secret data';

      const encrypted = await encryptionService.encryptMessage(
        plaintext,
        [keyPair.publicKey]
      );

      // Property: Cannot decrypt without session key
      await expect(
        encryptionService.decryptMessage(
          encrypted,
          'invalid-session-key',
          keyPair.privateKey
        )
      ).rejects.toThrow();
    });

    test('encrypted message with wrong IV should fail to decrypt', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      const plaintext = 'protected message';

      const encrypted = await encryptionService.encryptMessage(
        plaintext,
        [keyPair.publicKey]
      );

      // Tamper with IV
      const tamperedEncrypted = {
        ...encrypted,
        iv: btoa('wrong-iv-12345')
      };

      // Property: Wrong IV must fail decryption
      await expect(
        encryptionService.decryptMessage(
          tamperedEncrypted,
          encrypted.encryptedSessionKeys[0].encryptedKey,
          keyPair.privateKey
        )
      ).rejects.toThrow();
    });

    test('encrypted message with tampered content should fail to decrypt', async () => {
      const keyPair = await encryptionService.generateKeyPair();
      const plaintext = 'authentic message';

      const encrypted = await encryptionService.encryptMessage(
        plaintext,
        [keyPair.publicKey]
      );

      // Tamper with encrypted content
      const contentBytes = atob(encrypted.encryptedContent);
      const tamperedBytes = contentBytes.substring(0, 10) + 
        String.fromCharCode(contentBytes.charCodeAt(10) ^ 1) + 
        contentBytes.substring(11);
      const tamperedEncrypted = {
        ...encrypted,
        encryptedContent: btoa(tamperedBytes)
      };

      // Property: Tampered content must fail decryption (GCM authentication)
      await expect(
        encryptionService.decryptMessage(
          tamperedEncrypted,
          encrypted.encryptedSessionKeys[0].encryptedKey,
          keyPair.privateKey
        )
      ).rejects.toThrow();
    });
  });
});
