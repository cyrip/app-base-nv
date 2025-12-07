# Design Document: End-to-End Encryption for Chat

## Overview

This document details the technical design for implementing optional end-to-end encryption in the chat application. The system uses hybrid encryption (RSA-4096 for key exchange + AES-256-GCM for message content) with browser-based key generation via the Web Crypto API. Users can toggle encryption per channel, and the system supports mixed mode where encrypted and unencrypted messages coexist.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Vue.js Frontend                                      │  │
│  │  ┌────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ Chat UI        │  │ Encryption Service       │   │  │
│  │  │ - Messages     │──│ - Key Generation         │   │  │
│  │  │ - Channels     │  │ - Encrypt/Decrypt        │   │  │
│  │  │ - Toggle       │  │ - Sign/Verify            │   │  │
│  │  └────────────────┘  └──────────────────────────┘   │  │
│  │                              │                        │  │
│  │                              ▼                        │  │
│  │                    ┌──────────────────┐              │  │
│  │                    │  Web Crypto API  │              │  │
│  │                    └──────────────────┘              │  │
│  │                              │                        │  │
│  │                              ▼                        │  │
│  │                    ┌──────────────────┐              │  │
│  │                    │   IndexedDB      │              │  │
│  │                    │ (Private Keys)   │              │  │
│  │                    └──────────────────┘              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/TLS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend Server                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Node.js/Express API                                  │  │
│  │  ┌────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ Encryption API │  │ Message API              │   │  │
│  │  │ - Store Keys   │  │ - Store Encrypted Msgs   │   │  │
│  │  │ - Get Keys     │  │ - Relay Messages         │   │  │
│  │  │ - Toggle E2EE  │  │ - Channel Management     │   │  │
│  │  └────────────────┘  └──────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                  │  │
│  │  - Channels (encryptionEnabled)                       │  │
│  │  - Messages (encrypted, encryptionMetadata)           │  │
│  │  - UserPublicKeys (publicKey, fingerprint)            │  │
│  │  - ChannelSessionKeys (encryptedSessionKey)           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Encryption Flow

**Message Encryption:**
```
1. User types message
2. Check if channel.encryptionEnabled
3. If encrypted:
   a. Get/generate AES-256 session key
   b. Encrypt message content with session key
   c. Sign encrypted content with sender's private key
   d. Encrypt session key with each recipient's public key
   e. Send: {encryptedContent, iv, signature, encryptedSessionKeys}
4. If not encrypted:
   a. Send plaintext message
```

**Message Decryption:**
```
1. Receive message
2. Check message.encrypted flag
3. If encrypted:
   a. Decrypt session key with user's private key
   b. Verify signature with sender's public key
   c. Decrypt content with session key
   d. Display plaintext
4. If not encrypted:
   a. Display as-is
```

## Components and Interfaces

### Frontend Components

#### 1. EncryptionService (`frontend/src/services/encryption.js`)

```javascript
class EncryptionService {
  // Key Management
  async generateKeyPair(): Promise<KeyPairData>
  async storePrivateKey(userId: number, privateKey: string): Promise<void>
  async getPrivateKey(userId: number): Promise<string>
  async hasKeys(userId: number): Promise<boolean>
  async exportKeys(userId: number): Promise<Blob>
  async importKeys(userId: number, file: File): Promise<void>
  
  // Encryption/Decryption
  async encryptMessage(plaintext: string, recipientPublicKeys: string[]): Promise<EncryptedMessage>
  async decryptMessage(encryptedData: EncryptedMessage, senderPublicKey: string): Promise<string>
  
  // Session Key Management
  async generateSessionKey(): Promise<CryptoKey>
  async encryptSessionKey(sessionKey: CryptoKey, publicKey: string): Promise<string>
  async decryptSessionKey(encryptedKey: string, privateKey: string): Promise<CryptoKey>
  
  // Signing/Verification
  async signMessage(data: ArrayBuffer, privateKey: CryptoKey): Promise<string>
  async verifySignature(data: ArrayBuffer, signature: string, publicKey: CryptoKey): Promise<boolean>
  
  // Utilities
  async generateFingerprint(publicKey: string): Promise<string>
  arrayBufferToBase64(buffer: ArrayBuffer): string
  base64ToArrayBuffer(base64: string): ArrayBuffer
}
```

#### 2. KeyManagementModal Component (`frontend/src/modules/chat/components/KeyManagementModal.vue`)

```vue
<template>
  <div class="modal">
    <h2>Encryption Keys</h2>
    
    <div v-if="!hasKeys">
      <p>Generate encryption keys to enable secure messaging</p>
      <button @click="generateKeys">Generate Keys</button>
    </div>
    
    <div v-else>
      <p>Key Fingerprint: {{ fingerprint }}</p>
      <button @click="exportKeys">Export Keys</button>
      <button @click="showImport = true">Import Keys</button>
    </div>
  </div>
</template>
```

#### 3. EncryptionToggle Component (`frontend/src/modules/chat/components/EncryptionToggle.vue`)

```vue
<template>
  <button 
    @click="toggleEncryption"
    :disabled="!canEnable"
    class="encryption-toggle"
  >
    <span v-if="channel.encryptionEnabled">🔒 Encrypted</span>
    <span v-else>🔓 Enable Encryption</span>
  </button>
</template>
```

#### 4. MessageEncryptionIndicator Component

```vue
<template>
  <span class="encryption-indicator">
    <span v-if="message.encrypted">
      🔒
      <span v-if="message.verified" class="verified">✓</span>
      <span v-else-if="message.verificationFailed" class="warning">⚠️</span>
    </span>
    <span v-else>🔓</span>
  </span>
</template>
```

### Backend Components

#### 1. Encryption Controller (`backend/src/controllers/encryptionController.js`)

```javascript
class EncryptionController {
  // POST /api/users/keys
  async uploadPublicKey(req, res): Promise<void>
  
  // GET /api/users/:userId/public-key
  async getPublicKey(req, res): Promise<void>
  
  // GET /api/users/me/encryption/status
  async getEncryptionStatus(req, res): Promise<void>
  
  // POST /api/channels/:channelId/encryption/enable
  async enableEncryption(req, res): Promise<void>
  
  // GET /api/channels/:channelId/encryption/status
  async getChannelEncryptionStatus(req, res): Promise<void>
  
  // GET /api/channels/:channelId/participants/keys
  async getParticipantKeys(req, res): Promise<void>
}
```

#### 2. Encryption Service (`backend/src/services/encryptionService.js`)

```javascript
class EncryptionService {
  async storePublicKey(userId, publicKey, fingerprint, algorithm): Promise<PublicKey>
  async getPublicKey(userId): Promise<PublicKey>
  async getUsersWithKeys(userIds): Promise<number[]>
  async enableChannelEncryption(channelId, userId): Promise<void>
  async isChannelEncrypted(channelId): Promise<boolean>
  async storeSessionKey(channelId, userId, encryptedKey, version): Promise<void>
  async getSessionKey(channelId, userId): Promise<string>
}
```

## Data Models

### Database Schema

```sql
-- Add encryption columns to Channels table
ALTER TABLE Channels ADD COLUMN encryptionEnabled BOOLEAN DEFAULT FALSE;
ALTER TABLE Channels ADD COLUMN encryptionEnabledAt TIMESTAMP;
ALTER TABLE Channels ADD COLUMN encryptionEnabledBy INTEGER REFERENCES Users(id);

-- Add encryption columns to Messages table
ALTER TABLE Messages ADD COLUMN encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE Messages ADD COLUMN encryptionMetadata JSONB;

-- Create UserPublicKeys table
CREATE TABLE UserPublicKeys (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  publicKey TEXT NOT NULL,
  keyType VARCHAR(50) DEFAULT 'RSA-4096',
  fingerprint VARCHAR(128) UNIQUE NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  revokedAt TIMESTAMP,
  UNIQUE(userId, fingerprint)
);

CREATE INDEX idx_user_public_keys_user_id ON UserPublicKeys(userId);
CREATE INDEX idx_user_public_keys_fingerprint ON UserPublicKeys(fingerprint);

-- Create ChannelSessionKeys table
CREATE TABLE ChannelSessionKeys (
  id SERIAL PRIMARY KEY,
  channelId INTEGER NOT NULL REFERENCES Channels(id) ON DELETE CASCADE,
  userId INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  encryptedSessionKey TEXT NOT NULL,
  keyVersion INTEGER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(channelId, userId, keyVersion)
);

CREATE INDEX idx_channel_session_keys_channel_user ON ChannelSessionKeys(channelId, userId);
```

### TypeScript Interfaces

```typescript
// Frontend Types
interface KeyPairData {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
  algorithm: string;
  createdAt: string;
}

interface EncryptedMessage {
  encryptedContent: string;
  iv: string;
  signature: string;
  encryptedSessionKeys: EncryptedSessionKey[];
  senderKeyId: string;
  algorithm: string;
}

interface EncryptedSessionKey {
  userId: number;
  encryptedKey: string;
}

interface EncryptionMetadata {
  algorithm: string;
  iv: string;
  signature: string;
  senderKeyId: string;
}

interface Channel {
  id: number;
  name: string;
  encryptionEnabled: boolean;
  encryptionEnabledAt?: string;
  encryptionEnabledBy?: number;
  // ... other fields
}

interface Message {
  id: number;
  content: string;
  encrypted: boolean;
  encryptionMetadata?: EncryptionMetadata;
  // ... other fields
}

// Backend Types
interface PublicKeyRecord {
  id: number;
  userId: number;
  publicKey: string;
  keyType: string;
  fingerprint: string;
  createdAt: Date;
  revokedAt?: Date;
}

interface SessionKeyRecord {
  id: number;
  channelId: number;
  userId: number;
  encryptedSessionKey: string;
  keyVersion: number;
  createdAt: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Key Generation Produces Valid Key Pairs
*For any* user requesting key generation, the system should produce an RSA-4096 key pair where the public key can encrypt data that only the corresponding private key can decrypt.
**Validates: Requirements 1.1**

### Property 2: Private Keys Never Leave the Browser
*For any* key generation or storage operation, the private key should only exist in the browser's IndexedDB and never be transmitted to the server.
**Validates: Requirements 2.1, 18.2**

### Property 3: Public Keys Are Retrievable
*For any* user who has generated keys, their public key should be retrievable by other users via the API.
**Validates: Requirements 3.2**

### Property 4: Encryption Toggle Requires All Participants Have Keys
*For any* channel where encryption is being enabled, all participants must have public keys stored in the system.
**Validates: Requirements 5.2**

### Property 5: Encrypted Messages Cannot Be Read Without Private Key
*For any* encrypted message, attempting to decrypt without the correct private key should fail.
**Validates: Requirements 7.5**

### Property 6: Message Encryption Round Trip
*For any* plaintext message encrypted with a recipient's public key, decrypting with the corresponding private key should yield the original plaintext.
**Validates: Requirements 6.2, 7.3**

### Property 7: Signature Verification Detects Tampering
*For any* encrypted message with a valid signature, modifying the encrypted content should cause signature verification to fail.
**Validates: Requirements 7.2, 7.4**

### Property 8: Mixed Mode Preserves Message Types
*For any* channel with both encrypted and unencrypted messages, each message should retain its original encryption status.
**Validates: Requirements 8.4**

### Property 9: Encryption Cannot Be Disabled
*For any* channel where encryptionEnabled is TRUE, attempts to set it to FALSE should be rejected.
**Validates: Requirements 13.1, 13.2**

### Property 10: Session Key Encryption Per Recipient
*For any* encrypted message sent to N recipients, there should be exactly N encrypted session keys, one for each recipient.
**Validates: Requirements 11.2**

### Property 11: New Participants Receive Session Keys
*For any* user joining an encrypted channel, a new encrypted session key should be created for that user.
**Validates: Requirements 11.3, 12.3**

### Property 12: Fingerprint Uniqueness
*For any* two different public keys, their fingerprints should be different.
**Validates: Requirements 1.4, 3.4**

### Property 13: Encryption Metadata Completeness
*For any* encrypted message, the encryptionMetadata should contain algorithm, IV, signature, and senderKeyId fields.
**Validates: Requirements 6.5**

### Property 14: Key Storage Encryption
*For any* private key stored in IndexedDB, it should be encrypted before storage.
**Validates: Requirements 2.1, 18.2**

### Property 15: Decryption Requires Correct Session Key
*For any* encrypted message, decryption should only succeed when using the correct session key.
**Validates: Requirements 7.1**

## Error Handling

### Key Generation Errors
- **Browser doesn't support Web Crypto API**: Show error with browser upgrade suggestion
- **IndexedDB unavailable**: Show error about private browsing mode
- **Key generation fails**: Retry with exponential backoff, show error after 3 attempts

### Encryption Errors
- **Missing recipient public keys**: Fetch keys and retry, show error if still missing
- **Session key generation fails**: Retry once, show error if fails again
- **Encryption operation fails**: Log error, show user-friendly message, don't send message

### Decryption Errors
- **Missing private key**: Show "Generate keys to read this message" prompt
- **Signature verification fails**: Show warning "⚠️ Message may have been tampered with"
- **Decryption fails**: Show "🔒 [Encrypted message - cannot decrypt]"
- **Corrupted data**: Log error, show generic decryption failure message

### API Errors
- **Network failure**: Retry with exponential backoff
- **401 Unauthorized**: Redirect to login
- **403 Forbidden**: Show "You don't have permission" message
- **404 Not Found**: Show "Resource not found" message
- **500 Server Error**: Show "Server error, please try again" message

## Testing Strategy

### Unit Tests

**Frontend:**
- Key generation produces valid key pairs
- Private key storage and retrieval from IndexedDB
- Public key export to base64
- Message encryption with AES-256-GCM
- Message decryption with correct keys
- Signature generation and verification
- Fingerprint generation from public key
- Session key encryption/decryption
- Error handling for missing keys

**Backend:**
- Public key storage in database
- Public key retrieval by user ID
- Channel encryption toggle
- Encryption status checks
- Session key storage and retrieval
- Participant key fetching
- Authorization checks

### Property-Based Tests

We will use **fast-check** (JavaScript property-based testing library) to verify correctness properties.

**Property Test 1: Encryption/Decryption Round Trip**
```javascript
// Feature: e2e-encryption, Property 6: Message Encryption Round Trip
// Validates: Requirements 6.2, 7.3
fc.assert(
  fc.asyncProperty(fc.string(), async (message) => {
    const keyPair = await encryptionService.generateKeyPair();
    const encrypted = await encryptionService.encryptMessage(message, [keyPair.publicKey]);
    const decrypted = await encryptionService.decryptMessage(encrypted, keyPair.publicKey);
    return decrypted === message;
  }),
  { numRuns: 100 }
);
```

**Property Test 2: Signature Tampering Detection**
```javascript
// Feature: e2e-encryption, Property 7: Signature Verification Detects Tampering
// Validates: Requirements 7.2, 7.4
fc.assert(
  fc.asyncProperty(fc.string(), fc.integer(), async (message, tamperByte) => {
    const keyPair = await encryptionService.generateKeyPair();
    const encrypted = await encryptionService.encryptMessage(message, [keyPair.publicKey]);
    
    // Tamper with encrypted content
    const tampered = { ...encrypted };
    const contentBytes = base64ToArrayBuffer(tampered.encryptedContent);
    const view = new Uint8Array(contentBytes);
    view[0] = (view[0] + tamperByte) % 256;
    tampered.encryptedContent = arrayBufferToBase64(contentBytes);
    
    // Verification should fail
    const isValid = await encryptionService.verifySignature(
      tampered.encryptedContent,
      tampered.signature,
      keyPair.publicKey
    );
    return !isValid;
  }),
  { numRuns: 100 }
);
```

**Property Test 3: Fingerprint Uniqueness**
```javascript
// Feature: e2e-encryption, Property 12: Fingerprint Uniqueness
// Validates: Requirements 1.4, 3.4
fc.assert(
  fc.asyncProperty(fc.array(fc.nat(), { minLength: 2, maxLength: 10 }), async (seeds) => {
    const fingerprints = new Set();
    
    for (const seed of seeds) {
      const keyPair = await encryptionService.generateKeyPair();
      const fingerprint = await encryptionService.generateFingerprint(keyPair.publicKey);
      fingerprints.add(fingerprint);
    }
    
    // All fingerprints should be unique
    return fingerprints.size === seeds.length;
  }),
  { numRuns: 50 }
);
```

### Integration Tests

- End-to-end message encryption flow (send encrypted message, receive and decrypt)
- Channel encryption toggle with multiple participants
- New participant joining encrypted channel
- Key generation, storage, and retrieval flow
- Mixed mode: sending both encrypted and unencrypted messages
- Error scenarios: missing keys, invalid signatures, corrupted data

### Security Tests

- Verify private keys are never sent to server (network inspection)
- Verify encrypted messages cannot be decrypted without keys
- Verify signature verification catches tampering
- Verify session keys are unique per channel
- Verify encryption uses strong algorithms (RSA-4096, AES-256)
- Penetration testing for common vulnerabilities

## Performance Considerations

### Optimization Strategies

1. **Lazy Decryption**: Only decrypt messages when they become visible in the viewport
2. **Memory Caching**: Cache decrypted messages in memory (not storage) to avoid re-decryption
3. **Web Workers**: Perform crypto operations in background thread to avoid blocking UI
4. **Batch Operations**: Decrypt multiple messages in parallel using Promise.all()
5. **Session Key Reuse**: Use same session key for all messages in a channel (don't generate per message)
6. **Hardware Acceleration**: Web Crypto API uses hardware acceleration when available

### Performance Targets

- Key generation: < 2 seconds (RSA-4096)
- Message encryption: < 100ms
- Message decryption: < 50ms
- Signature verification: < 50ms
- UI should remain responsive during all operations

## Security Considerations

### Threat Model

**Protected Against:**
- ✅ Server compromise (server cannot read encrypted messages)
- ✅ Database breach (encrypted messages are useless without keys)
- ✅ Network eavesdropping (TLS + E2EE)
- ✅ Man-in-the-middle attacks (signature verification)
- ✅ Message tampering (signature verification)

**NOT Protected Against:**
- ❌ Compromised client device (malware, keyloggers)
- ❌ Malicious browser extensions
- ❌ XSS attacks (need strong CSP)
- ❌ User sharing their private key
- ❌ Physical access to unlocked device

### Security Measures

1. **Content Security Policy (CSP)**: Prevent XSS attacks
2. **HTTPS Only**: All communication over TLS
3. **Key Pinning**: Warn when public keys change
4. **Secure Storage**: Private keys encrypted in IndexedDB
5. **Strong Algorithms**: RSA-4096, AES-256-GCM, SHA-256
6. **Signature Verification**: Detect message tampering
7. **No Key Escrow**: Server never has access to private keys

## Migration Strategy

### Phase 1: Database Setup
- Add encryption columns to existing tables
- Create new tables for keys and session keys
- Run migrations on staging environment
- Test rollback procedures

### Phase 2: Backend API
- Implement encryption endpoints
- Add encryption toggle logic
- Test with Postman/automated tests
- Deploy to staging

### Phase 3: Frontend Core
- Implement EncryptionService
- Add key generation UI
- Test in isolation
- Deploy to staging

### Phase 4: Message Encryption
- Integrate encryption into message sending
- Add decryption to message display
- Test end-to-end flow
- Deploy to staging

### Phase 5: UI Polish
- Add encryption indicators
- Implement toggle UI
- Add error messages
- User testing

### Phase 6: Production Rollout
- Feature flag: disabled by default
- Enable for beta users
- Monitor for issues
- Gradual rollout to all users

## Deployment Considerations

### Feature Flags
```javascript
const ENCRYPTION_ENABLED = process.env.ENCRYPTION_ENABLED === 'true';
const ENCRYPTION_REQUIRED = process.env.ENCRYPTION_REQUIRED === 'true';
const ENCRYPTION_DEFAULT = process.env.ENCRYPTION_DEFAULT === 'true';
```

### Monitoring
- Track key generation success/failure rates
- Monitor encryption/decryption performance
- Alert on high error rates
- Log encryption toggle events

### Rollback Plan
- Feature flag can disable encryption feature
- Existing encrypted messages remain encrypted
- New messages sent unencrypted if feature disabled
- No data loss during rollback
