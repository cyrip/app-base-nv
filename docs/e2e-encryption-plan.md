# End-to-End Encryption Plan for Chat Application

## Overview

This document outlines the architecture and implementation plan for adding end-to-end encryption (E2EE) to the chat application using public-key cryptography.

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
1. On first login, prompt user to generate keys
2. Show key fingerprint for verification
3. Option to export/backup keys (encrypted with password)
4. Option to import existing keys

**Message Display:**
- Show lock icon for encrypted messages
- Show verification badge when signature is valid
- Show warning if signature verification fails
- Show "Waiting for keys..." for messages that can't be decrypted yet

**Security Indicators:**
- Display participant key fingerprints in channel settings
- Show when keys change (potential MITM warning)
- Allow users to verify fingerprints out-of-band

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

## Migration Strategy

### For Existing Messages:
1. Keep unencrypted messages as-is (mark as legacy)
2. New messages use encryption
3. Option to "upgrade" channel to encrypted (all new messages encrypted)

### Gradual Rollout:
1. Phase 1: Optional encryption (users opt-in)
2. Phase 2: Encrypted by default (users can opt-out)
3. Phase 3: Encryption mandatory for all new channels

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

## Next Steps

1. Review and approve this architecture
2. Create detailed technical specifications
3. Set up development environment with crypto libraries
4. Implement Phase 1 (Key Management)
5. Implement Phase 2 (Message Encryption)
6. Security audit before production deployment

## References

- [Signal Protocol](https://signal.org/docs/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [libsodium Documentation](https://libsodium.gitbook.io/doc/)
