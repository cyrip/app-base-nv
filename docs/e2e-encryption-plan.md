# End-to-End Encryption Plan for Chat Application

## Overview

This document outlines the architecture and implementation plan for adding **optional** end-to-end encryption (E2EE) to the chat application using public-key cryptography.

**Key Feature**: Users can enable/disable encryption per channel or direct message, giving them flexibility to choose when they need maximum security.

## Security Architecture

### Cryptographic Approach

We'll use **hybrid encryption** combining asymmetric and symmetric cryptography:

1. **Asymmetric Encryption (RSA/ECC)**: For key exchange and digital signatures
2. **Symmetric Encryption (AES-256-GCM)**: For actual message content (faster, more efficient)

### Why Not Pure RSA for Messages?

Your initial approach has a conceptual issue:
- **Messages should NOT be encrypted with the sender's private key** - that's signing, not encryption
- **Private keys decrypt, public keys encrypt** in RSA

**Correct Flow:**
- **Encryption**: Use recipient's PUBLIC key to encrypt
- **Decryption**: Use recipient's PRIVATE key to decrypt
- **Signing**: Use sender's PRIVATE key to sign (proves authenticity)
- **Verification**: Use sender's PUBLIC key to verify signature

## Recommended Architecture: Signal Protocol Approach

### Key Components

#### 1. Key Generation & Storage

**User Key Pairs:**
- Generate RSA-4096 or ECC (Curve25519) key pairs in browser
- Store private key encrypted in browser's IndexedDB (NOT localStorage - more secure)
- Upload public key to server for distribution
- Use Web Crypto API for all cryptographic operations

**Session Keys:**
- Generate ephemeral AES-256 keys for each conversation
- Encrypt session key with recipient's public key
- Store encrypted session keys on server

#### 2. Message Encryption Flow

```
Sender Side:
1. Generate random AES-256 session key (if new conversation)
2. Encrypt message content with AES-256-GCM
3. Encrypt session key with recipient's public key (RSA/ECC)
4. Sign encrypted message with sender's private key
5. Send: {encryptedMessage, encryptedSessionKey, signature, senderPublicKeyId}

Recipient Side:
1. Decrypt session key using recipient's private key
2. Verify signature using sender's public key
3. Decrypt message content using decrypted session key
4. Display plaintext message
```

#### 3. Group Chat Encryption

For channels with multiple participants:
- Generate one session key per channel
- Encrypt session key separately for each participant using their public key
- When new user joins, re-encrypt session key for them
- When user leaves, rotate session key and re-encrypt for remaining users

## Implementation Plan

### Phase 1: Key Management System

**Backend:**
```
POST /api/users/keys
- Upload public key
- Store public key in database
- Associate with user account

GET /api/users/:userId/public-key
- Retrieve user's public key
- Public endpoint (no auth required for public keys)

GET /api/channels/:channelId/participants/keys
- Get all public keys for channel participants
- Used for encrypting session keys
```

**Frontend:**
```javascript
// Key generation using Web Crypto API
async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  
  return keyPair;
}

// Store private key in IndexedDB (encrypted with user password)
async function storePrivateKey(privateKey, password) {
  // Derive encryption key from password using PBKDF2
  const encryptionKey = await deriveKeyFromPassword(password);
  
  // Export and encrypt private key
  const exportedKey = await crypto.subtle.exportKey("pkcs8", privateKey);
  const encryptedKey = await encryptAES(exportedKey, encryptionKey);
  
  // Store in IndexedDB
  await indexedDB.put('privateKey', encryptedKey);
}
```

### Phase 2: Message Encryption

**Database Schema Changes:**
```sql
-- Add encryption settings to channels
ALTER TABLE Channels ADD COLUMN encryptionEnabled BOOLEAN DEFAULT FALSE;
ALTER TABLE Channels ADD COLUMN encryptionEnabledAt TIMESTAMP;
ALTER TABLE Channels ADD COLUMN encryptionEnabledBy INTEGER REFERENCES Users(id);

-- Add encryption metadata to messages
ALTER TABLE Messages ADD COLUMN encrypted BOOLEAN DEFAULT FALSE;
ALTER TABLE Messages ADD COLUMN encryptionMetadata JSONB;
-- encryptionMetadata: {
--   algorithm: 'AES-256-GCM',
--   senderKeyId: 'uuid',
--   signature: 'base64',
--   iv: 'base64'
-- }

-- Store encrypted session keys per channel participant
CREATE TABLE ChannelSessionKeys (
  id SERIAL PRIMARY KEY,
  channelId INTEGER REFERENCES Channels(id),
  userId INTEGER REFERENCES Users(id),
  encryptedSessionKey TEXT NOT NULL,
  keyVersion INTEGER DEFAULT 1,
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(channelId, userId, keyVersion)
);

-- Store user public keys
CREATE TABLE UserPublicKeys (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES Users(id),
  publicKey TEXT NOT NULL,
  keyType VARCHAR(50) DEFAULT 'RSA-4096',
  fingerprint VARCHAR(128) UNIQUE,
  createdAt TIMESTAMP DEFAULT NOW(),
  revokedAt TIMESTAMP,
  UNIQUE(userId, fingerprint)
);
```

**Frontend Encryption Service:**
```javascript
// services/encryption.js
class EncryptionService {
  async encryptMessage(plaintext, recipientPublicKeys) {
    // 1. Generate or retrieve session key
    const sessionKey = await this.getOrCreateSessionKey(channelId);
    
    // 2. Encrypt message with AES
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      sessionKey,
      new TextEncoder().encode(plaintext)
    );
    
    // 3. Sign encrypted content
    const signature = await this.signMessage(encryptedContent);
    
    // 4. Encrypt session key for each recipient
    const encryptedSessionKeys = await Promise.all(
      recipientPublicKeys.map(pubKey => 
        this.encryptSessionKey(sessionKey, pubKey)
      )
    );
    
    return {
      encryptedContent: arrayBufferToBase64(encryptedContent),
      iv: arrayBufferToBase64(iv),
      signature,
      encryptedSessionKeys
    };
  }
  
  async decryptMessage(encryptedData, senderPublicKey) {
    // 1. Verify signature
    const isValid = await this.verifySignature(
      encryptedData.encryptedContent,
      encryptedData.signature,
      senderPublicKey
    );
    
    if (!isValid) throw new Error('Invalid signature');
    
    // 2. Decrypt session key
    const sessionKey = await this.decryptSessionKey(
      encryptedData.encryptedSessionKey
    );
    
    // 3. Decrypt message
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToArrayBuffer(encryptedData.iv) },
      sessionKey,
      base64ToArrayBuffer(encryptedData.encryptedContent)
    );
    
    return new TextDecoder().decode(decrypted);
  }
}
```

### Phase 3: UI/UX Considerations

**Key Setup Flow:**
1. On first login, prompt user to generate keys (optional)
2. Show key fingerprint for verification
3. Option to export/backup keys (encrypted with password)
4. Option to import existing keys
5. User can skip key generation and enable it later

**Encryption Toggle UI:**

**Channel Settings:**
```
┌─────────────────────────────────────┐
│ Channel Settings                    │
├─────────────────────────────────────┤
│ 🔒 End-to-End Encryption            │
│                                     │
│ [ ] Enable encryption for this      │
│     channel                         │
│                                     │
│ ⚠️  Once enabled:                   │
│ • All new messages will be encrypted│
│ • All participants must have keys   │
│ • Old messages remain unencrypted   │
│ • Cannot be disabled                │
│                                     │
│ [Enable Encryption]                 │
└─────────────────────────────────────┘
```

**Direct Message UI:**
```
┌─────────────────────────────────────┐
│ Chat with @user                  🔓 │ ← Click to enable
├─────────────────────────────────────┤
│ Messages...                         │
└─────────────────────────────────────┘

After enabling:
┌─────────────────────────────────────┐
│ Chat with @user                  🔒 │ ← Encrypted
├─────────────────────────────────────┤
│ 🔒 This conversation is encrypted   │
│ Messages...                         │
└─────────────────────────────────────┘
```

**Message Display:**
- Show 🔒 lock icon for encrypted messages
- Show 🔓 open lock for unencrypted messages
- Show ✓ verification badge when signature is valid
- Show ⚠️ warning if signature verification fails
- Show "Waiting for keys..." for messages that can't be decrypted yet
- Show "Encryption enabled" system message when toggled on

**Channel List Indicators:**
```
📱 General Chat              🔓 (unencrypted)
💼 Work Discussion          🔒 (encrypted)
👥 Team Updates             🔓 (unencrypted)
```

**Security Indicators:**
- Display participant key fingerprints in channel settings
- Show when keys change (potential MITM warning)
- Allow users to verify fingerprints out-of-band
- Show encryption status in channel header

### Phase 4: Key Rotation & Recovery

**Key Rotation:**
- Allow users to generate new key pairs
- Keep old keys for decrypting historical messages
- Notify contacts when key changes

**Recovery Options:**
- Encrypted key backup to server (encrypted with recovery password)
- Export keys to file
- Recovery codes (print and store securely)

## Security Considerations

### What We Protect Against:
✅ Server compromise (server can't read messages)
✅ Database breach (encrypted messages are useless)
✅ Network eavesdropping (TLS + E2EE)
✅ Man-in-the-middle (signature verification)

### What We DON'T Protect Against:
❌ Compromised client device
❌ Malicious browser extensions
❌ XSS attacks (need strong CSP)
❌ User sharing their private key
❌ Keyloggers on client machine

### Additional Security Measures:

1. **Content Security Policy (CSP)**
   - Prevent XSS attacks
   - Restrict script sources

2. **Subresource Integrity (SRI)**
   - Ensure crypto libraries aren't tampered with

3. **Key Pinning**
   - Pin public keys to prevent MITM
   - Warn users when keys change

4. **Perfect Forward Secrecy**
   - Rotate session keys regularly
   - Use ephemeral keys when possible

5. **Secure Key Storage**
   - Use IndexedDB with encryption
   - Never store private keys in localStorage
   - Consider using Web Crypto API's non-extractable keys

## Libraries to Consider

### Recommended:
- **libsodium.js** (NaCl): Modern, audited, easy to use
- **TweetNaCl.js**: Lightweight, well-tested
- **OpenPGP.js**: If you want PGP compatibility

### Built-in:
- **Web Crypto API**: Native browser support, no dependencies

## Encryption Toggle Implementation

### Backend API Endpoints:

```javascript
// Enable encryption for a channel
POST /api/channels/:channelId/encryption/enable
Body: { confirm: true }
Response: { 
  success: true, 
  encryptionEnabled: true,
  sessionKeyId: 'uuid'
}

// Get encryption status
GET /api/channels/:channelId/encryption/status
Response: {
  enabled: boolean,
  enabledAt: timestamp,
  enabledBy: userId,
  participantsWithKeys: [userId1, userId2],
  participantsMissingKeys: [userId3]
}

// Check if user has encryption keys
GET /api/users/me/encryption/status
Response: {
  hasKeys: boolean,
  publicKeyFingerprint: 'abc123...',
  keyCreatedAt: timestamp
}
```

### Frontend Logic:

```javascript
// Check prerequisites before enabling encryption
async function canEnableEncryption(channelId) {
  // 1. Check if current user has keys
  const userStatus = await api.get('/users/me/encryption/status');
  if (!userStatus.hasKeys) {
    return { 
      canEnable: false, 
      reason: 'You need to generate encryption keys first' 
    };
  }
  
  // 2. Check if all participants have keys
  const channelStatus = await api.get(`/channels/${channelId}/encryption/status`);
  if (channelStatus.participantsMissingKeys.length > 0) {
    return {
      canEnable: false,
      reason: 'Some participants do not have encryption keys',
      missingUsers: channelStatus.participantsMissingKeys
    };
  }
  
  return { canEnable: true };
}

// Enable encryption for channel
async function enableEncryption(channelId) {
  const check = await canEnableEncryption(channelId);
  
  if (!check.canEnable) {
    showError(check.reason);
    return;
  }
  
  // Show confirmation dialog
  const confirmed = await confirmDialog({
    title: 'Enable End-to-End Encryption?',
    message: 'Once enabled, all new messages will be encrypted. This cannot be undone.',
    confirmText: 'Enable Encryption',
    cancelText: 'Cancel'
  });
  
  if (!confirmed) return;
  
  // Enable on backend
  await api.post(`/channels/${channelId}/encryption/enable`, { confirm: true });
  
  // Generate and distribute session key
  await generateAndDistributeSessionKey(channelId);
  
  // Show success message
  showSuccess('Encryption enabled for this channel');
  
  // Reload channel to show encryption status
  await reloadChannel(channelId);
}
```

### Message Sending Logic:

```javascript
async function sendMessage(channelId, content) {
  // Check if channel has encryption enabled
  const channel = await getChannel(channelId);
  
  if (channel.encryptionEnabled) {
    // Encrypt the message
    const encrypted = await encryptionService.encryptMessage(
      content,
      channel.participants.map(p => p.publicKey)
    );
    
    // Send encrypted message
    await api.post(`/channels/${channelId}/messages`, {
      content: encrypted.encryptedContent,
      encrypted: true,
      encryptionMetadata: {
        algorithm: 'AES-256-GCM',
        iv: encrypted.iv,
        signature: encrypted.signature,
        senderKeyId: currentUser.publicKeyId
      }
    });
  } else {
    // Send unencrypted message (normal flow)
    await api.post(`/channels/${channelId}/messages`, {
      content: content,
      encrypted: false
    });
  }
}
```

### Message Display Logic:

```javascript
async function displayMessage(message) {
  if (message.encrypted) {
    try {
      // Decrypt the message
      const decrypted = await encryptionService.decryptMessage(
        message.content,
        message.encryptionMetadata
      );
      
      return {
        ...message,
        content: decrypted,
        decrypted: true,
        verified: true
      };
    } catch (error) {
      return {
        ...message,
        content: '🔒 [Encrypted message - cannot decrypt]',
        decrypted: false,
        error: error.message
      };
    }
  } else {
    // Display unencrypted message as-is
    return message;
  }
}
```

## Migration Strategy

### For Existing Channels:
1. **All existing channels start unencrypted** (default behavior)
2. **Users can opt-in** to enable encryption per channel
3. **Mixed mode**: Channels can have both encrypted and unencrypted messages
   - Old messages remain unencrypted
   - New messages (after enabling) are encrypted
   - UI clearly shows which messages are encrypted

### Encryption Toggle Rules:

**Can Enable When:**
- ✅ All participants have generated encryption keys
- ✅ User has permission to modify channel settings
- ✅ Channel is not already encrypted

**Cannot Disable Once Enabled:**
- ❌ Encryption is one-way (cannot be turned off)
- ❌ Prevents accidental exposure of previously encrypted messages
- ❌ If users want unencrypted chat, create a new channel

**Handling New Participants:**
- When someone joins an encrypted channel:
  - Check if they have encryption keys
  - If yes: Encrypt session key for them
  - If no: Show warning, prompt them to generate keys
  - They can see unencrypted messages but not encrypted ones until they have keys

### Gradual Rollout:
1. **Phase 1**: Optional encryption (users opt-in) ← **START HERE**
2. **Phase 2**: Promote encryption (show benefits, encourage adoption)
3. **Phase 3**: Encrypted by default for new channels (users can opt-out)
4. **Phase 4**: Encryption mandatory for sensitive channels (admin policy)

## Testing Strategy

### Unit Tests:
- Key generation
- Encryption/decryption
- Signature verification
- Key storage/retrieval

### Integration Tests:
- End-to-end message flow
- Multi-user scenarios
- Key rotation
- Error handling

### Security Tests:
- Attempt to decrypt without proper keys
- Verify signature validation
- Test key compromise scenarios
- Penetration testing

## Performance Considerations

- **Lazy Loading**: Only decrypt messages when visible
- **Caching**: Cache decrypted messages in memory (not storage)
- **Web Workers**: Perform crypto operations in background thread
- **Batch Operations**: Encrypt/decrypt multiple messages at once

## Compliance & Legal

- **GDPR**: E2EE helps with data minimization
- **Export Controls**: Check crypto export regulations
- **Lawful Intercept**: Document that you CAN'T access user messages
- **Terms of Service**: Clarify that lost keys = lost messages

## User Flows

### Flow 1: First-Time User Enabling Encryption

```
1. User opens chat application
2. Sees banner: "🔒 Enable secure messaging? Generate encryption keys"
3. Clicks "Generate Keys"
4. System generates key pair in browser
5. Private key stored in IndexedDB (encrypted)
6. Public key uploaded to server
7. Shows success: "Encryption keys generated! You can now enable encryption for any conversation"
8. User goes to a direct message
9. Clicks 🔓 icon in header
10. Confirms: "Enable encryption for this conversation?"
11. System enables encryption
12. All new messages are encrypted
```

### Flow 2: Enabling Encryption for Group Channel

```
1. User opens channel settings
2. Sees "End-to-End Encryption" section
3. Clicks "Enable Encryption"
4. System checks:
   - ✅ User has keys
   - ✅ All 5 participants have keys
5. Shows confirmation dialog with warnings
6. User confirms
7. System:
   - Generates session key
   - Encrypts session key for each participant
   - Stores encrypted session keys
   - Marks channel as encrypted
8. Posts system message: "🔒 Encryption enabled by @user"
9. All new messages are encrypted
```

### Flow 3: User Without Keys Joins Encrypted Channel

```
1. User joins encrypted channel
2. System detects: User has no encryption keys
3. Shows warning banner:
   "⚠️ This channel uses encryption. Generate keys to read encrypted messages."
4. User can:
   - See old unencrypted messages
   - See encrypted messages as "🔒 [Encrypted - generate keys to read]"
   - Cannot send messages until keys generated
5. User clicks "Generate Keys"
6. Keys generated
7. System encrypts session key for new user
8. User can now read and send encrypted messages
```

## Feature Flags & Configuration

```javascript
// config/features.js
export const ENCRYPTION_CONFIG = {
  // Enable/disable encryption feature globally
  enabled: true,
  
  // Require all users to generate keys on signup
  requireKeysOnSignup: false,
  
  // Allow users to enable encryption per channel
  allowPerChannelToggle: true,
  
  // Default encryption for new channels
  encryptByDefault: false,
  
  // Allow disabling encryption (not recommended)
  allowDisable: false,
  
  // Minimum participants with keys to enable encryption
  minParticipantsWithKeys: 1.0, // 100% must have keys
  
  // Show encryption prompts
  showEncryptionPrompts: true,
  
  // Crypto library to use
  cryptoLibrary: 'web-crypto-api', // or 'libsodium'
  
  // Key algorithm
  keyAlgorithm: 'RSA-OAEP', // or 'X25519'
  keySize: 4096
};
```

## Next Steps

1. ✅ Review and approve this architecture
2. Create detailed technical specifications (if needed)
3. Set up development environment with crypto libraries
4. **Implement Phase 1**: Key Management (optional, user-initiated)
5. **Implement Phase 2**: Message Encryption (per-channel toggle)
6. **Implement Phase 3**: UI/UX (encryption toggle, indicators)
7. **Implement Phase 4**: Key Rotation & Recovery
8. Security audit before production deployment

## Quick Start Implementation Order

### Sprint 1: Foundation
- [ ] Add database columns for encryption settings
- [ ] Create encryption service with Web Crypto API
- [ ] Implement key generation UI
- [ ] Store keys in IndexedDB

### Sprint 2: Core Encryption
- [ ] Implement message encryption/decryption
- [ ] Add encryption toggle to channel settings
- [ ] Handle encrypted message sending
- [ ] Handle encrypted message display

### Sprint 3: UI/UX Polish
- [ ] Add encryption indicators (🔒/🔓)
- [ ] Show encryption status in channel list
- [ ] Add key fingerprint verification
- [ ] Handle edge cases (missing keys, etc.)

### Sprint 4: Advanced Features
- [ ] Key backup/export
- [ ] Key rotation
- [ ] Group encryption with key distribution
- [ ] Security warnings and notifications

## References

- [Signal Protocol](https://signal.org/docs/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [libsodium Documentation](https://libsodium.gitbook.io/doc/)
