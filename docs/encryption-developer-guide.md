# End-to-End Encryption Developer Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Backend API Reference](#backend-api-reference)
4. [Frontend EncryptionService API](#frontend-encryptionservice-api)
5. [Code Examples](#code-examples)
6. [Security Considerations](#security-considerations)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client A                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  IndexedDB (Private Key Storage)                     │   │
│  │  - Private Key (RSA-4096)                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  EncryptionService                                   │   │
│  │  - Key Generation (Web Crypto API)                   │   │
│  │  - Message Encryption (AES-256-GCM)                  │   │
│  │  - Message Signing (RSASSA-PKCS1-v1_5)               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         Server                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Database                                            │   │
│  │  - UserPublicKeys (Public Keys)                      │   │
│  │  - ChannelSessionKeys (Encrypted Session Keys)       │   │
│  │  - Messages (Encrypted Content + Metadata)           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Encryption API                                      │   │
│  │  - Key Management Endpoints                          │   │
│  │  - Channel Encryption Endpoints                      │   │
│  │  - Session Key Endpoints                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         Client B                             │
│  (Similar structure to Client A)                             │
└─────────────────────────────────────────────────────────────┘
```

### Encryption Flow

**Key Generation:**
1. Client generates RSA-4096 key pair using Web Crypto API
2. Private key stored in IndexedDB (never leaves device)
3. Public key + fingerprint uploaded to server

**Enabling Encryption:**
1. Client generates AES-256 session key
2. Session key encrypted with each participant's RSA public key
3. Encrypted session keys stored on server
4. Channel marked as encrypted (irreversible)

**Sending Messages:**
1. Client retrieves encrypted session key from server
2. Client decrypts session key with private RSA key
3. Message encrypted with AES-256-GCM using session key
4. Encrypted message signed with sender's RSA private key
5. Encrypted message + signature sent to server

**Receiving Messages:**
1. Client retrieves encrypted message from server
2. Client decrypts session key with private RSA key
3. Message decrypted with AES-256-GCM using session key
4. Signature verified with sender's RSA public key

### Cryptographic Algorithms

| Purpose | Algorithm | Key Size | Notes |
|---------|-----------|----------|-------|
| Key Exchange | RSA-OAEP | 4096 bits | SHA-256 hash |
| Message Encryption | AES-GCM | 256 bits | Random 12-byte IV per message |
| Message Signing | RSASSA-PKCS1-v1_5 | 4096 bits | SHA-256 hash |
| Fingerprints | SHA-256 | 256 bits | First 40 hex chars used |

---

## Database Schema

### UserPublicKeys Table

Stores user public keys for encryption.

```sql
CREATE TABLE UserPublicKeys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  publicKey TEXT NOT NULL,
  keyType VARCHAR(50) NOT NULL DEFAULT 'RSA-4096',
  fingerprint VARCHAR(64) NOT NULL UNIQUE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revokedAt DATETIME NULL,
  
  INDEX idx_userId (userId),
  INDEX idx_fingerprint (fingerprint),
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);
```

**Fields:**
- `id`: Primary key
- `userId`: Reference to Users table
- `publicKey`: Base64-encoded RSA public key (SPKI format)
- `keyType`: Algorithm identifier (e.g., "RSA-4096")
- `fingerprint`: SHA-256 hash of public key (40 hex characters)
- `createdAt`: Timestamp of key creation
- `revokedAt`: Timestamp of key revocation (NULL if active)

### ChannelSessionKeys Table

Stores encrypted session keys for each participant in encrypted channels.

```sql
CREATE TABLE ChannelSessionKeys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  channelId INT NOT NULL,
  userId INT NOT NULL,
  encryptedSessionKey TEXT NOT NULL,
  keyVersion INT NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_channel_user_version (channelId, userId, keyVersion),
  INDEX idx_channelId (channelId),
  INDEX idx_userId (userId),
  FOREIGN KEY (channelId) REFERENCES Channels(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
);
```

**Fields:**
- `id`: Primary key
- `channelId`: Reference to Channels table
- `userId`: Reference to Users table
- `encryptedSessionKey`: Base64-encoded AES session key encrypted with user's RSA public key
- `keyVersion`: Version number for key rotation (default: 1)
- `createdAt`: Timestamp of key creation

### Channels Table (Additional Fields)

```sql
ALTER TABLE Channels ADD COLUMN encryptionEnabled BOOLEAN DEFAULT FALSE;
ALTER TABLE Channels ADD COLUMN encryptionEnabledAt DATETIME NULL;
ALTER TABLE Channels ADD COLUMN encryptionEnabledBy INT NULL;
```

**Fields:**
- `encryptionEnabled`: Whether encryption is enabled for this channel
- `encryptionEnabledAt`: Timestamp when encryption was enabled
- `encryptionEnabledBy`: User ID who enabled encryption

### Messages Table (Additional Fields)

```sql
ALTER TABLE Messages ADD COLUMN encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE Messages ADD COLUMN encryptionMetadata JSON NULL;
```

**Fields:**
- `encrypted`: Whether this message is encrypted
- `encryptionMetadata`: JSON object containing:
  - `iv`: Base64-encoded initialization vector
  - `algorithm`: Encryption algorithm used (e.g., "AES-256-GCM")
  - `signature`: Base64-encoded message signature
  - `encryptedSessionKeys`: Array of encrypted session keys for recipients

**Example encryptionMetadata:**
```json
{
  "iv": "dGVzdGl2MTIzNDU2",
  "algorithm": "AES-256-GCM",
  "signature": "c2lnbmF0dXJlZGF0YQ==",
  "encryptedSessionKeys": [
    {
      "encryptedKey": "ZW5jcnlwdGVkc2Vzc2lvbmtleQ=="
    }
  ]
}
```

---

## Backend API Reference

### Base URL
```
/api
```

### Authentication
All endpoints (except public key retrieval) require JWT authentication via `Authorization: Bearer <token>` header.

---

### User Key Management

#### Upload Public Key
```http
POST /users/keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "publicKey": "base64-encoded-public-key",
  "fingerprint": "40-character-hex-fingerprint",
  "algorithm": "RSA-4096"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "userId": 123,
  "fingerprint": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "keyType": "RSA-4096",
  "createdAt": "2025-12-07T10:30:00.000Z"
}
```

**Errors:**
- `400`: Missing required fields
- `409`: Fingerprint already exists

#### Get User's Public Key
```http
GET /users/:userId/public-key
```

**Response (200 OK):**
```json
{
  "id": 1,
  "userId": 123,
  "publicKey": "base64-encoded-public-key",
  "keyType": "RSA-4096",
  "fingerprint": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "createdAt": "2025-12-07T10:30:00.000Z"
}
```

**Errors:**
- `404`: Public key not found

#### Get Current User's Encryption Status
```http
GET /users/me/encryption/status
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "hasKeys": true,
  "publicKeyFingerprint": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "keyCreatedAt": "2025-12-07T10:30:00.000Z",
  "keyType": "RSA-4096"
}
```

---

### Channel Encryption

#### Enable Encryption on Channel
```http
POST /channels/:channelId/encryption/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "confirm": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "channelId": 456,
  "encryptionEnabled": true,
  "encryptionEnabledAt": "2025-12-07T10:35:00.000Z",
  "encryptionEnabledBy": 123,
  "systemMessage": {
    "id": 789,
    "content": "🔒 End-to-end encryption enabled by user@example.com. All future messages will be encrypted.",
    "fromUserId": null,
    "channelId": 456,
    "encrypted": false
  }
}
```

**Errors:**
- `400`: Confirmation not provided or participants missing keys
- `404`: Channel not found
- `409`: Encryption already enabled

#### Get Channel Encryption Status
```http
GET /channels/:channelId/encryption/status
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "enabled": true,
  "enabledAt": "2025-12-07T10:35:00.000Z",
  "enabledBy": 123,
  "participantsWithKeys": [123, 456, 789],
  "participantsMissingKeys": []
}
```

#### Get Participant Public Keys
```http
GET /channels/:channelId/participants/keys
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 123,
    "publicKey": "base64-encoded-public-key",
    "keyType": "RSA-4096",
    "fingerprint": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    "createdAt": "2025-12-07T10:30:00.000Z"
  }
]
```

---

### Session Key Management

#### Store Session Key
```http
POST /channels/:channelId/session-keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 123,
  "encryptedKey": "base64-encoded-encrypted-session-key",
  "version": 1
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "channelId": 456,
  "userId": 123,
  "keyVersion": 1,
  "createdAt": "2025-12-07T10:36:00.000Z"
}
```

**Errors:**
- `400`: Missing required fields
- `403`: User not a participant
- `404`: Channel not found

#### Get Current User's Session Key
```http
GET /channels/:channelId/session-keys/me
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "channelId": 456,
  "userId": 123,
  "encryptedSessionKey": "base64-encoded-encrypted-session-key",
  "keyVersion": 1,
  "createdAt": "2025-12-07T10:36:00.000Z"
}
```

**Errors:**
- `404`: Session key not found

---

### Message Endpoints

#### Send Message (with encryption)
```http
POST /channels/:channelId/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "base64-encoded-encrypted-content",
  "encrypted": true,
  "encryptionMetadata": {
    "iv": "base64-encoded-iv",
    "algorithm": "AES-256-GCM",
    "signature": "base64-encoded-signature",
    "encryptedSessionKeys": [
      {
        "encryptedKey": "base64-encoded-encrypted-session-key"
      }
    ]
  }
}
```

**Response (200 OK):**
```json
{
  "id": 789,
  "channelId": 456,
  "fromUserId": 123,
  "content": "base64-encoded-encrypted-content",
  "encrypted": true,
  "encryptionMetadata": { ... },
  "createdAt": "2025-12-07T10:40:00.000Z",
  "FromUser": {
    "id": 123,
    "email": "user@example.com"
  }
}
```

---

## Frontend EncryptionService API

### Location
```javascript
import encryptionService from '@/services/encryption';
```

### Methods

#### Key Generation

##### `generateKeyPair()`
Generates a new RSA-4096 key pair.

```javascript
const keys = await encryptionService.generateKeyPair();
// Returns:
// {
//   publicKey: "base64-encoded-public-key",
//   privateKey: "base64-encoded-private-key",
//   fingerprint: "40-character-hex-fingerprint",
//   algorithm: "RSA-4096"
// }
```

##### `generateFingerprint(publicKey)`
Generates SHA-256 fingerprint of a public key.

```javascript
const fingerprint = await encryptionService.generateFingerprint(publicKey);
// Returns: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
```

#### Key Storage

##### `storePrivateKey(userId, privateKey)`
Stores private key in IndexedDB.

```javascript
await encryptionService.storePrivateKey(123, privateKey);
```

##### `getPrivateKey(userId)`
Retrieves private key from IndexedDB.

```javascript
const privateKey = await encryptionService.getPrivateKey(123);
```

##### `hasKeys(userId)`
Checks if user has keys stored.

```javascript
const hasKeys = await encryptionService.hasKeys(123);
// Returns: true or false
```

#### Key Import/Export

##### `exportKeys(userId)`
Exports keys as a Blob for download.

```javascript
const blob = await encryptionService.exportKeys(123);
// Create download link
const url = URL.createObjectURL(blob);
```

##### `importKeys(userId, file)`
Imports keys from a backup file.

```javascript
const result = await encryptionService.importKeys(123, file);
// Returns: { success: true, importedAt: "2025-12-07T10:45:00.000Z" }
```

#### Session Key Management

##### `generateSessionKey()`
Generates a new AES-256 session key.

```javascript
const sessionKey = await encryptionService.generateSessionKey();
// Returns: CryptoKey object
```

##### `encryptSessionKey(sessionKey, publicKey)`
Encrypts session key with RSA public key.

```javascript
const encryptedKey = await encryptionService.encryptSessionKey(sessionKey, publicKey);
// Returns: "base64-encoded-encrypted-session-key"
```

##### `decryptSessionKey(encryptedKey, privateKey)`
Decrypts session key with RSA private key.

```javascript
const sessionKey = await encryptionService.decryptSessionKey(encryptedKey, privateKey);
// Returns: CryptoKey object
```

#### Message Encryption/Decryption

##### `encryptMessage(plaintext, recipientPublicKeys, sessionKey?)`
Encrypts a message with AES-256-GCM.

```javascript
const encrypted = await encryptionService.encryptMessage(
  "Hello, World!",
  [publicKey1, publicKey2],
  sessionKey // optional, generates new if not provided
);
// Returns:
// {
//   encryptedContent: "base64-encoded-encrypted-content",
//   iv: "base64-encoded-iv",
//   encryptedSessionKeys: [
//     { encryptedKey: "base64-encoded-encrypted-session-key" }
//   ],
//   algorithm: "AES-256-GCM"
// }
```

##### `decryptMessage(encryptedData, encryptedSessionKey, privateKey)`
Decrypts a message with AES-256-GCM.

```javascript
const plaintext = await encryptionService.decryptMessage(
  {
    encryptedContent: "base64-encoded-encrypted-content",
    iv: "base64-encoded-iv"
  },
  encryptedSessionKey,
  privateKey
);
// Returns: "Hello, World!"
```

#### Message Signing/Verification

##### `signMessage(data, privateKey)`
Signs data with RSA private key.

```javascript
const signature = await encryptionService.signMessage(encryptedContent, privateKey);
// Returns: "base64-encoded-signature"
```

##### `verifySignature(data, signature, publicKey)`
Verifies signature with RSA public key.

```javascript
const isValid = await encryptionService.verifySignature(
  encryptedContent,
  signature,
  publicKey
);
// Returns: true or false
```

#### Browser Compatibility

##### `checkBrowserSupport()`
Checks if browser supports required APIs.

```javascript
try {
  encryptionService.checkBrowserSupport();
  // Browser is supported
} catch (error) {
  // Browser not supported
  console.error(error.message);
}
```

##### `checkPrivateMode()`
Checks if browser is in private/incognito mode.

```javascript
const isPrivate = await encryptionService.checkPrivateMode();
// Returns: true or false
```

---

## Code Examples

### Complete Encryption Flow

```javascript
// 1. Generate keys for a new user
const keys = await encryptionService.generateKeyPair();
await encryptionService.storePrivateKey(userId, keys.privateKey);

// Upload public key to server
await axios.post('/api/users/keys', {
  publicKey: keys.publicKey,
  fingerprint: keys.fingerprint,
  algorithm: keys.algorithm
}, authHeaders());

// 2. Enable encryption on a channel
// Get all participant public keys
const keysRes = await axios.get(`/api/channels/${channelId}/participants/keys`, authHeaders());
const participantKeys = keysRes.data;

// Generate session key
const sessionKey = await encryptionService.generateSessionKey();

// Encrypt session key for each participant
for (const participant of participantKeys) {
  const encryptedKey = await encryptionService.encryptSessionKey(
    sessionKey,
    participant.publicKey
  );
  
  // Store on server
  await axios.post(`/api/channels/${channelId}/session-keys`, {
    userId: participant.userId,
    encryptedKey,
    version: 1
  }, authHeaders());
}

// Enable encryption
await axios.post(`/api/channels/${channelId}/encryption/enable`, {
  confirm: true
}, authHeaders());

// 3. Send encrypted message
const privateKey = await encryptionService.getPrivateKey(userId);

// Get session key
const sessionKeyRes = await axios.get(
  `/api/channels/${channelId}/session-keys/me`,
  authHeaders()
);
const sessionKey = await encryptionService.decryptSessionKey(
  sessionKeyRes.data.encryptedSessionKey,
  privateKey
);

// Encrypt message
const encrypted = await encryptionService.encryptMessage(
  "Hello, World!",
  participantKeys.map(p => p.publicKey),
  sessionKey
);

// Sign message
const signature = await encryptionService.signMessage(
  encrypted.encryptedContent,
  privateKey
);

// Send to server
await axios.post(`/api/channels/${channelId}/messages`, {
  content: encrypted.encryptedContent,
  encrypted: true,
  encryptionMetadata: {
    iv: encrypted.iv,
    algorithm: encrypted.algorithm,
    signature,
    encryptedSessionKeys: encrypted.encryptedSessionKeys
  }
}, authHeaders());

// 4. Decrypt received message
const message = /* received from server */;

// Decrypt session key
const sessionKey = await encryptionService.decryptSessionKey(
  message.encryptionMetadata.encryptedSessionKeys[0].encryptedKey,
  privateKey
);

// Decrypt message
const plaintext = await encryptionService.decryptMessage(
  {
    encryptedContent: message.content,
    iv: message.encryptionMetadata.iv
  },
  message.encryptionMetadata.encryptedSessionKeys[0].encryptedKey,
  privateKey
);

// Verify signature
const senderKeyRes = await axios.get(
  `/api/users/${message.fromUserId}/public-key`,
  authHeaders()
);
const isValid = await encryptionService.verifySignature(
  message.content,
  message.encryptionMetadata.signature,
  senderKeyRes.data.publicKey
);

console.log('Decrypted:', plaintext);
console.log('Signature valid:', isValid);
```

---

## Security Considerations

### Key Management
- ✅ Private keys never leave the client device
- ✅ Private keys stored in IndexedDB (more secure than localStorage)
- ✅ Public keys stored on server for distribution
- ✅ Fingerprints used for key verification

### Encryption
- ✅ AES-256-GCM for message encryption (authenticated encryption)
- ✅ RSA-4096 for key exchange (future-proof key size)
- ✅ Random IV generated for each message
- ✅ Messages signed to prevent tampering

### Session Keys
- ✅ Unique session key per channel
- ✅ Session keys encrypted with each participant's public key
- ✅ Session keys stored encrypted on server
- ✅ Support for key rotation (version field)

### Threats Mitigated
- ✅ Server compromise (server cannot decrypt messages)
- ✅ Man-in-the-middle (fingerprint verification)
- ✅ Message tampering (digital signatures)
- ✅ Replay attacks (timestamps + signatures)

### Known Limitations
- ⚠️ Metadata not encrypted (who, when, channel)
- ⚠️ No forward secrecy (compromised key decrypts all messages)
- ⚠️ No post-compromise security (no key rotation yet)
- ⚠️ Fingerprint verification relies on out-of-band channel

---

## Testing

### Unit Tests

```javascript
// Test key generation
describe('EncryptionService.generateKeyPair', () => {
  it('should generate valid RSA-4096 key pair', async () => {
    const keys = await encryptionService.generateKeyPair();
    expect(keys.publicKey).toBeDefined();
    expect(keys.privateKey).toBeDefined();
    expect(keys.fingerprint).toHaveLength(40);
    expect(keys.algorithm).toBe('RSA-4096');
  });
});

// Test encryption/decryption
describe('Message encryption', () => {
  it('should encrypt and decrypt message correctly', async () => {
    const keys = await encryptionService.generateKeyPair();
    const plaintext = 'Test message';
    
    const encrypted = await encryptionService.encryptMessage(
      plaintext,
      [keys.publicKey]
    );
    
    const decrypted = await encryptionService.decryptMessage(
      encrypted,
      encrypted.encryptedSessionKeys[0].encryptedKey,
      keys.privateKey
    );
    
    expect(decrypted).toBe(plaintext);
  });
});

// Test signature verification
describe('Message signing', () => {
  it('should sign and verify message correctly', async () => {
    const keys = await encryptionService.generateKeyPair();
    const data = 'Test data';
    
    const signature = await encryptionService.signMessage(data, keys.privateKey);
    const isValid = await encryptionService.verifySignature(
      data,
      signature,
      keys.publicKey
    );
    
    expect(isValid).toBe(true);
  });
  
  it('should detect tampered messages', async () => {
    const keys = await encryptionService.generateKeyPair();
    const data = 'Test data';
    
    const signature = await encryptionService.signMessage(data, keys.privateKey);
    const isValid = await encryptionService.verifySignature(
      'Tampered data',
      signature,
      keys.publicKey
    );
    
    expect(isValid).toBe(false);
  });
});
```

### Integration Tests

```javascript
describe('End-to-end encryption flow', () => {
  it('should enable encryption and send encrypted message', async () => {
    // Create users and channel
    const user1 = await createUser();
    const user2 = await createUser();
    const channel = await createChannel([user1.id, user2.id]);
    
    // Generate keys for both users
    const keys1 = await encryptionService.generateKeyPair();
    const keys2 = await encryptionService.generateKeyPair();
    
    // Upload public keys
    await uploadPublicKey(user1.id, keys1);
    await uploadPublicKey(user2.id, keys2);
    
    // Enable encryption
    await enableChannelEncryption(channel.id, user1.id);
    
    // Send encrypted message
    const message = await sendEncryptedMessage(
      channel.id,
      user1.id,
      'Test message',
      keys1.privateKey
    );
    
    // Verify message is encrypted
    expect(message.encrypted).toBe(true);
    expect(message.encryptionMetadata).toBeDefined();
    
    // Decrypt message as user2
    const decrypted = await decryptMessage(message, keys2.privateKey);
    expect(decrypted).toBe('Test message');
  });
});
```

---

## Troubleshooting

### Common Issues

**"Web Crypto API not supported"**
- Browser doesn't support Web Crypto API
- Solution: Use modern browser (Chrome 37+, Firefox 34+, Safari 11+, Edge 79+)

**"Failed to open IndexedDB"**
- Private/incognito mode detected
- Solution: Use normal browsing mode

**"Private key not found"**
- Keys not generated or were deleted
- Solution: Generate new keys or import from backup

**"Session key not found"**
- User doesn't have access to channel's session key
- Solution: Re-enable encryption or add user to session keys

**"Failed to decrypt message"**
- Wrong private key or corrupted message
- Solution: Verify keys are correct, check message integrity

**"Signature verification failed"**
- Message tampered with or wrong public key
- Solution: Verify sender's public key, check message integrity

### Debugging

Enable debug logging:
```javascript
// In encryption.js
console.log('[Encryption]', 'Operation:', data);
```

Check IndexedDB:
```javascript
// In browser console
const request = indexedDB.open('ChatEncryptionDB');
request.onsuccess = () => {
  const db = request.result;
  const tx = db.transaction('keys', 'readonly');
  const store = tx.objectStore('keys');
  const getAllRequest = store.getAll();
  getAllRequest.onsuccess = () => {
    console.log('Stored keys:', getAllRequest.result);
  };
};
```

---

## Performance Considerations

### Key Generation
- RSA-4096 generation takes ~1 second
- Only done once per user
- Show loading indicator to user

### Message Encryption
- AES-256-GCM is fast (~1ms per message)
- Signing adds ~10ms per message
- Negligible impact on UX

### Message Decryption
- Session key decryption done once per channel
- Message decryption is fast (~1ms per message)
- Batch decrypt for better performance

### Optimization Tips
- Cache decrypted session keys in memory
- Decrypt messages lazily (only when visible)
- Use Web Workers for bulk operations
- Implement pagination for message history

---

## Future Enhancements

### Planned Features
- [ ] Forward secrecy (ephemeral keys)
- [ ] Key rotation support
- [ ] Multi-device sync
- [ ] Key revocation
- [ ] Encrypted file attachments
- [ ] Encrypted voice/video calls

### Security Improvements
- [ ] Post-compromise security
- [ ] Metadata encryption
- [ ] Deniable authentication
- [ ] Perfect forward secrecy

---

*Last updated: December 2025*
