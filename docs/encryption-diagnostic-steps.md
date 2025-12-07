# Encryption Diagnostic Steps

## Problem
Admin can receive encrypted messages from user, but user cannot decrypt messages from admin.
Error: "Session key decryption failed: OperationError"

## Root Cause Analysis
The session key stored for admin (userId 1) was encrypted with a public key that doesn't match the private key in admin's browser.

## Diagnostic Steps

### Step 1: Check Public Key Fingerprints

**In Admin Browser Console:**
```javascript
// Get local public key fingerprint
const encryptionService = (await import('/src/services/encryption.js')).default;
const userId = 1; // admin
const publicKey = await encryptionService.getPublicKey(userId);
if (publicKey) {
  const fingerprint = await encryptionService.calculateFingerprint(publicKey);
  console.log('Admin local fingerprint:', fingerprint);
} else {
  console.log('No local public key found');
}
```

**Compare with server:**
```bash
docker-compose exec -T backend node -e "const { UserPublicKey } = require('./src/models'); (async () => { const key = await UserPublicKey.findOne({ where: { userId: 1 } }); console.log('Admin server fingerprint:', key ? key.fingerprint : 'Not found'); })();"
```

**If fingerprints DON'T match** → This is the problem! The browser and server have different keys.

### Step 2: Check When Keys Were Generated

The issue happens when:
1. User generates keys → uploads to server
2. User clears browser data (loses private key)
3. User generates NEW keys → uploads to server (overwrites public key)
4. Encryption is enabled using NEW public key from server
5. User tries to decrypt but has NEW private key, while session key was encrypted with NEW public key ✓ (should work)

OR:

1. User generates keys → uploads to server
2. Encryption is enabled using public key from server
3. User clears browser data (loses private key)
4. User generates NEW keys → uploads to server (overwrites public key)
5. User tries to decrypt but has NEW private key, while session key was encrypted with OLD public key ✗ (FAILS)

### Step 3: Solution

**Complete Reset (Recommended):**

1. **Clear ALL browser data for BOTH users:**
   - Admin browser: Click 🗑️ "Clear All Encryption Data"
   - User browser: Click 🗑️ "Clear All Encryption Data"

2. **Reset database:**
   ```bash
   docker-compose exec -T backend npm run db:reset
   ```

3. **Generate keys for BOTH users (in order):**
   - Admin browser: Generate keys → verify fingerprint appears
   - User browser: Generate keys → verify fingerprint appears

4. **Verify keys match on server:**
   ```bash
   docker-compose exec -T backend node -e "const { UserPublicKey } = require('./src/models'); (async () => { const keys = await UserPublicKey.findAll(); keys.forEach(k => console.log('User', k.userId, '- fingerprint:', k.fingerprint.substring(0, 40) + '...')); })();"
   ```

5. **Create direct channel and enable encryption**

6. **Test messaging both directions**

## Prevention

To avoid this issue:
- Never clear browser data after encryption is enabled
- Never generate new keys after encryption is enabled
- If you must reset, reset EVERYTHING (browser data + database)
