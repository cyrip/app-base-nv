# Encryption Key Mismatch Fix

## Problem

You're seeing errors like:
```
Session key decryption failed: OperationError
Failed to decrypt session key
```

## Root Cause

This happens when the session key stored in the database was encrypted with a **different public key** than the private key you currently have in your browser.

Common scenarios:
1. You generated encryption keys **after** encryption was already enabled on the channel
2. You cleared browser data (localStorage/IndexedDB) and regenerated keys
3. The public key on the server doesn't match your current private key

## Solution

You need to **re-enable encryption** with your current keys. Here's how:

### Option 1: Disable and Re-enable Encryption (Recommended)

**Note:** Currently encryption cannot be disabled once enabled. You'll need to create a new channel.

1. Create a new direct channel with the same user
2. Both users should have their encryption keys already generated
3. Enable encryption on the new channel
4. The session keys will be encrypted with the correct public keys

### Option 2: Reset Database and Start Fresh

If you're in development/testing:

1. Reset the database:
   ```bash
   docker-compose exec -T backend npm run db:reset
   ```

2. Clear browser data for both users:
   - Open DevTools (F12)
   - Application tab → Storage → Clear site data
   - Or manually:
     - localStorage: Clear all items
     - IndexedDB: Delete `encryption-keys` database

3. Refresh the page and log in

4. **Generate encryption keys for both users FIRST**
   - User 1: Click "🔐 Encryption Keys" → Generate Keys
   - User 2: Click "🔐 Encryption Keys" → Generate Keys

5. Create a direct channel

6. Enable encryption on the channel

### Option 3: Backend API to Re-encrypt Session Keys (Advanced)

If you want to keep existing messages, you would need to:

1. Get the current session key (requires admin access to database)
2. Re-encrypt it with the new public keys
3. Update the `ChannelSessionKeys` table

This is complex and not recommended for production.

## Prevention

To avoid this issue in the future:

1. **Always generate encryption keys BEFORE enabling encryption**
2. **Never clear browser data** without backing up your keys (use Export Keys feature)
3. **If you regenerate keys**, you'll need to re-enable encryption on all channels

## Verification

After fixing, verify encryption works:

1. Send a message in the encrypted channel
2. Check that it shows 🔒 icon
3. Check that the other user can decrypt and read it
4. No errors in the browser console

## Technical Details

The encryption flow:
1. User generates RSA-4096 key pair (public + private)
2. Public key is uploaded to server
3. When encryption is enabled:
   - A random AES-256 session key is generated
   - Session key is encrypted with each participant's **public key**
   - Encrypted session keys are stored in database
4. To decrypt messages:
   - User retrieves their encrypted session key from server
   - Decrypts it with their **private key**
   - Uses session key to decrypt message content

If the public/private key pair doesn't match, step 4 fails with "OperationError".
