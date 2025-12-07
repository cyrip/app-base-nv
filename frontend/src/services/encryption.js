/**
 * Encryption Service
 * Handles all client-side cryptographic operations for end-to-end encryption
 * Uses Web Crypto API for secure key generation, encryption, and signing
 */

class EncryptionService {
  constructor() {
    this.dbName = 'ChatEncryptionDB';
    this.storeName = 'keys';
    this.db = null;
    this.checkBrowserSupport();
  }

  /**
   * Check if browser supports required APIs
   */
  checkBrowserSupport() {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API not supported. Please use a modern browser.');
    }
    
    if (!window.indexedDB) {
      throw new Error('IndexedDB not supported. Please use a modern browser.');
    }
  }

  /**
   * Check if browser is in private/incognito mode (IndexedDB may be restricted)
   */
  async checkPrivateMode() {
    try {
      await this.initDB();
      return false;
    } catch (e) {
      if (e.message.includes('Failed to open IndexedDB')) {
        return true;
      }
      throw e;
    }
  }

  // ============================================================================
  // IndexedDB Management
  // ============================================================================

  /**
   * Initialize IndexedDB for storing private keys
   */
  async initDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  // ============================================================================
  // Key Generation
  // ============================================================================

  /**
   * Generate RSA-4096 key pair using Web Crypto API
   * @returns {Promise<{publicKey: string, privateKey: string, fingerprint: string, algorithm: string}>}
   */
  async generateKeyPair() {
    try {
      // Generate RSA-OAEP 4096-bit key pair
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 4096,
          publicExponent: new Uint8Array([1, 0, 1]), // 65537
          hash: 'SHA-256'
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      // Export public key
      const publicKeyData = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const publicKeyBase64 = this.arrayBufferToBase64(publicKeyData);

      // Export private key
      const privateKeyData = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKeyBase64 = this.arrayBufferToBase64(privateKeyData);

      // Generate fingerprint
      const fingerprint = await this.generateFingerprint(publicKeyBase64);

      return {
        publicKey: publicKeyBase64,
        privateKey: privateKeyBase64,
        fingerprint,
        algorithm: 'RSA-4096'
      };
    } catch (error) {
      console.error('Key generation failed:', error);
      throw new Error(`Failed to generate key pair: ${error.message}`);
    }
  }

  // ============================================================================
  // Key Storage
  // ============================================================================

  /**
   * Store private key in IndexedDB (encrypted)
   * @param {number} userId - User ID
   * @param {string} privateKey - Base64 encoded private key
   */
  async storePrivateKey(userId, privateKey) {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        // Store private key with userId as key
        const request = store.put(privateKey, `privateKey_${userId}`);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to store private key'));
      });
    } catch (error) {
      console.error('Failed to store private key:', error);
      throw new Error(`Failed to store private key: ${error.message}`);
    }
  }

  /**
   * Retrieve private key from IndexedDB
   * @param {number} userId - User ID
   * @returns {Promise<string>} Base64 encoded private key
   */
  async getPrivateKey(userId) {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);

        const request = store.get(`privateKey_${userId}`);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            reject(new Error('Private key not found'));
          }
        };
        request.onerror = () => reject(new Error('Failed to retrieve private key'));
      });
    } catch (error) {
      console.error('Failed to retrieve private key:', error);
      throw new Error(`Failed to retrieve private key: ${error.message}`);
    }
  }

  /**
   * Check if user has keys stored
   * @param {number} userId - User ID
   * @returns {Promise<boolean>}
   */
  async hasKeys(userId) {
    try {
      await this.getPrivateKey(userId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete all encryption keys from IndexedDB
   * WARNING: This will permanently delete all keys and you won't be able to decrypt old messages
   * @returns {Promise<void>}
   */
  async deleteAllKeys() {
    // Close the database connection first to avoid blocking
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      
      request.onsuccess = () => {
        console.log('IndexedDB database deleted successfully');
        resolve();
      };
      
      request.onerror = () => {
        console.error('Failed to delete IndexedDB database:', request.error);
        reject(new Error('Failed to delete encryption database'));
      };
      
      request.onblocked = () => {
        console.warn('Database deletion blocked. Attempting to force close...');
        // Try to force close by waiting a bit
        setTimeout(() => {
          const retryRequest = indexedDB.deleteDatabase(this.dbName);
          retryRequest.onsuccess = () => {
            console.log('IndexedDB database deleted successfully on retry');
            resolve();
          };
          retryRequest.onerror = () => {
            reject(new Error('Failed to delete encryption database. Please close all other tabs and try again.'));
          };
        }, 100);
      };
    });
  }

  // ============================================================================
  // Key Import/Export
  // ============================================================================

  /**
   * Export keys as encrypted backup file
   * @param {number} userId - User ID
   * @returns {Promise<Blob>}
   */
  async exportKeys(userId) {
    try {
      const privateKey = await this.getPrivateKey(userId);

      // Create backup object
      const backup = {
        version: 1,
        userId,
        privateKey,
        exportedAt: new Date().toISOString()
      };

      // Convert to JSON and create Blob
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });

      return blob;
    } catch (error) {
      console.error('Failed to export keys:', error);
      throw new Error(`Failed to export keys: ${error.message}`);
    }
  }

  /**
   * Import keys from backup file
   * @param {number} userId - User ID
   * @param {File} file - Backup file
   */
  async importKeys(userId, file) {
    try {
      // Read file content
      const text = await file.text();
      const backup = JSON.parse(text);

      // Validate backup format
      if (!backup.version || !backup.privateKey) {
        throw new Error('Invalid backup file format');
      }

      // Store private key
      await this.storePrivateKey(userId, backup.privateKey);

      return {
        success: true,
        importedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to import keys:', error);
      throw new Error(`Failed to import keys: ${error.message}`);
    }
  }

  // ============================================================================
  // Fingerprint Generation
  // ============================================================================

  /**
   * Generate SHA-256 fingerprint of public key
   * @param {string} publicKey - Base64 encoded public key
   * @returns {Promise<string>} Hex fingerprint
   */
  async generateFingerprint(publicKey) {
    try {
      // Convert base64 public key to ArrayBuffer
      const publicKeyData = this.base64ToArrayBuffer(publicKey);

      // Generate SHA-256 hash
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', publicKeyData);

      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Return first 40 characters (similar to SSH fingerprints)
      return hashHex.substring(0, 40);
    } catch (error) {
      console.error('Fingerprint generation failed:', error);
      throw new Error(`Failed to generate fingerprint: ${error.message}`);
    }
  }

  // ============================================================================
  // Session Key Management
  // ============================================================================

  /**
   * Generate AES-256 session key
   * @returns {Promise<CryptoKey>}
   */
  async generateSessionKey() {
    try {
      const sessionKey = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      return sessionKey;
    } catch (error) {
      console.error('Session key generation failed:', error);
      throw new Error(`Failed to generate session key: ${error.message}`);
    }
  }

  /**
   * Encrypt session key with RSA public key
   * @param {CryptoKey} sessionKey - AES session key
   * @param {string} publicKey - Base64 encoded RSA public key
   * @returns {Promise<string>} Base64 encoded encrypted session key
   */
  async encryptSessionKey(sessionKey, publicKey) {
    try {
      // Export session key as raw bytes
      const sessionKeyData = await window.crypto.subtle.exportKey('raw', sessionKey);

      // Import RSA public key
      const publicKeyData = this.base64ToArrayBuffer(publicKey);
      const rsaPublicKey = await window.crypto.subtle.importKey(
        'spki',
        publicKeyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['encrypt']
      );

      // Encrypt session key with RSA public key
      const encryptedSessionKey = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        rsaPublicKey,
        sessionKeyData
      );

      return this.arrayBufferToBase64(encryptedSessionKey);
    } catch (error) {
      console.error('Session key encryption failed:', error);
      throw new Error(`Failed to encrypt session key: ${error.message}`);
    }
  }

  /**
   * Decrypt session key with RSA private key
   * @param {string} encryptedKey - Base64 encoded encrypted session key
   * @param {string} privateKey - Base64 encoded RSA private key
   * @returns {Promise<CryptoKey>} Decrypted AES session key
   */
  async decryptSessionKey(encryptedKey, privateKey) {
    try {
      // Import RSA private key
      const privateKeyData = this.base64ToArrayBuffer(privateKey);
      const rsaPrivateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['decrypt']
      );

      // Decrypt session key
      const encryptedKeyData = this.base64ToArrayBuffer(encryptedKey);
      const sessionKeyData = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        rsaPrivateKey,
        encryptedKeyData
      );

      // Import decrypted session key
      const sessionKey = await window.crypto.subtle.importKey(
        'raw',
        sessionKeyData,
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      return sessionKey;
    } catch (error) {
      console.error('Session key decryption failed:', error);
      console.error('This usually means your private key does not match the public key used to encrypt the session key.');
      console.error('Possible causes:');
      console.error('1. You generated new keys after encryption was enabled');
      console.error('2. You cleared browser data and regenerated keys');
      console.error('3. The session key was encrypted for a different user');
      throw new Error(`Failed to decrypt session key: ${error.message}`);
    }
  }

  // ============================================================================
  // Message Encryption/Decryption
  // ============================================================================

  /**
   * Encrypt message with AES-256-GCM
   * @param {string} plaintext - Message to encrypt
   * @param {Array<string>} recipientPublicKeys - Array of recipient public keys
   * @param {CryptoKey} sessionKey - Optional existing session key (if not provided, generates new one)
   * @returns {Promise<Object>} Encrypted message data
   */
  async encryptMessage(plaintext, recipientPublicKeys, sessionKey = null) {
    try {
      // Generate or use provided session key
      const aesKey = sessionKey || await this.generateSessionKey();

      // Generate random IV (Initialization Vector)
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt message content with AES-GCM
      const encoder = new TextEncoder();
      const plaintextData = encoder.encode(plaintext);

      const encryptedContent = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        aesKey,
        plaintextData
      );

      // Encrypt session key for each recipient
      const encryptedSessionKeys = await Promise.all(
        recipientPublicKeys.map(async (publicKey) => ({
          encryptedKey: await this.encryptSessionKey(aesKey, publicKey)
        }))
      );

      return {
        encryptedContent: this.arrayBufferToBase64(encryptedContent),
        iv: this.arrayBufferToBase64(iv),
        encryptedSessionKeys,
        algorithm: 'AES-256-GCM'
      };
    } catch (error) {
      console.error('Message encryption failed:', error);
      throw new Error(`Failed to encrypt message: ${error.message}`);
    }
  }

  /**
   * Decrypt message with AES-256-GCM
   * @param {Object} encryptedData - Encrypted message data
   * @param {string} encryptedSessionKey - Encrypted session key for current user
   * @param {string} privateKey - User's private key (base64)
   * @returns {Promise<string>} Decrypted plaintext
   */
  async decryptMessage(encryptedData, encryptedSessionKey, privateKey) {
    try {
      // Decrypt session key
      const sessionKey = await this.decryptSessionKey(encryptedSessionKey, privateKey);

      // Convert encrypted content and IV from base64
      const encryptedContent = this.base64ToArrayBuffer(encryptedData.encryptedContent);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);

      // Decrypt message content
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        sessionKey,
        encryptedContent
      );

      // Convert to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Message decryption failed:', error);
      throw new Error(`Failed to decrypt message: ${error.message}`);
    }
  }

  // ============================================================================
  // Signing/Verification
  // ============================================================================

  /**
   * Sign data with private key
   * @param {string} data - Data to sign (base64 encoded encrypted content)
   * @param {string} privateKey - Base64 encoded RSA private key
   * @returns {Promise<string>} Base64 encoded signature
   */
  async signMessage(data, privateKey) {
    try {
      // Import RSA private key for signing
      const privateKeyData = this.base64ToArrayBuffer(privateKey);
      const rsaPrivateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyData,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        false,
        ['sign']
      );

      // Convert data to ArrayBuffer
      const dataBuffer = this.base64ToArrayBuffer(data);

      // Sign the data
      const signature = await window.crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        rsaPrivateKey,
        dataBuffer
      );

      return this.arrayBufferToBase64(signature);
    } catch (error) {
      console.error('Message signing failed:', error);
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }

  /**
   * Verify signature with public key
   * @param {string} data - Original data (base64 encoded encrypted content)
   * @param {string} signature - Base64 encoded signature
   * @param {string} publicKey - Base64 encoded RSA public key
   * @returns {Promise<boolean>} True if signature is valid
   */
  async verifySignature(data, signature, publicKey) {
    try {
      // Import RSA public key for verification
      const publicKeyData = this.base64ToArrayBuffer(publicKey);
      const rsaPublicKey = await window.crypto.subtle.importKey(
        'spki',
        publicKeyData,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        false,
        ['verify']
      );

      // Convert data and signature to ArrayBuffer
      const dataBuffer = this.base64ToArrayBuffer(data);
      const signatureBuffer = this.base64ToArrayBuffer(signature);

      // Verify signature
      const isValid = await window.crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        rsaPublicKey,
        signatureBuffer,
        dataBuffer
      );

      return isValid;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false; // Return false instead of throwing on verification failure
    }
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Convert ArrayBuffer to Base64 string
   * @param {ArrayBuffer} buffer
   * @returns {string}
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   * @param {string} base64
   * @returns {ArrayBuffer}
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export singleton instance
export default new EncryptionService();
