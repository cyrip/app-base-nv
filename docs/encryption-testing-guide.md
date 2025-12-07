# E2E Encryption Testing Guide

## Prerequisites
- Database has been reset with fresh data
- Three test users available:
  - `admin@codeware.cc` / `password` (userId: 1)
  - `user@codeware.cc` / `password` (userId: 2)
  - `partner@codeware.cc` / `password` (userId: 3)

## Step-by-Step Testing Instructions

### Step 1: Clear Browser Data (CRITICAL)
**Do this for BOTH users before starting!**

1. Open the app in two different browsers (or incognito + regular)
2. For each browser:
   - Log in
   - Click "🔐 Encryption Keys" button
   - Click "🗑️ Clear All Encryption Data" button
   - Confirm the deletion
   - You should see "All encryption data cleared successfully"

### Step 2: Generate Encryption Keys
**Both users MUST generate keys before enabling encryption!**

#### Browser 1 (admin@codeware.cc):
1. Log in as `admin@codeware.cc` / `password`
2. Click "🔐 Encryption Keys" button
3. Click "Generate New Keys" button
4. Wait for success message
5. Verify you see the key fingerprint displayed

#### Browser 2 (user@codeware.cc):
1. Log in as `user@codeware.cc` / `password`
2. Click "🔐 Encryption Keys" button
3. Click "Generate New Keys" button
4. Wait for success message
5. Verify you see the key fingerprint displayed

### Step 3: Create Direct Channel
1. In Browser 1 (admin), click on "user@codeware.cc" in the user list
2. This creates a direct channel between admin and user
3. Verify the channel appears in both browsers

### Step 4: Enable Encryption
1. In Browser 1 (admin), click "Enable Encryption" button
2. Review the confirmation dialog
3. Click "Enable Encryption" to confirm
4. **Check browser console for debug logs:**
   - Should see: `[EncryptionToggle] Participant keys: (2) [{…}, {…}]`
   - Should see: `[EncryptionToggle] Encrypting session key for user: 1`
   - Should see: `[EncryptionToggle] Encrypting session key for user: 2`
   - Should see: `[EncryptionToggle] Session key stored for user: 1 {id: 1, channelId: 1, userId: 1, keyVersion: 1}`
   - Should see: `[EncryptionToggle] Session key stored for user: 2 {id: 2, channelId: 1, userId: 2, keyVersion: 1}`
   - **CRITICAL**: The `userId` in the last two logs should be DIFFERENT (1 and 2, not both 1)
5. Verify encryption is enabled (🔒 icon appears)

### Step 5: Send Encrypted Messages
1. In Browser 1 (admin), type a message and send
2. Verify in Browser 2 (user) that the message appears decrypted
3. In Browser 2 (user), reply with a message
4. Verify in Browser 1 (admin) that the reply appears decrypted

### Expected Console Output (Success)
```
[EncryptionToggle] Participant keys: (2) [{…}, {…}]
[EncryptionToggle] Number of participants: 2
[EncryptionToggle] Session key generated
[EncryptionToggle] Encrypting session key for user: 1
[EncryptionToggle] Encrypting session key for user: 2
[EncryptionToggle] Session key stored for user: 1 {id: 1, channelId: 1, userId: 1, keyVersion: 1}
[EncryptionToggle] Session key stored for user: 2 {id: 2, channelId: 1, userId: 2, keyVersion: 1}
[EncryptionToggle] All session keys stored
```

**KEY INDICATOR**: The `userId` values should be 1 and 2 (different users), NOT both 1.

### What Was Fixed
The bug was in the session key storage endpoint. Previously:
- Frontend was calling `/api/channels/:channelId/session-keys` (wrong endpoint)
- This stored ALL session keys with the authenticated user's ID
- Result: Both session keys had `userId: 1` instead of `userId: 1` and `userId: 2`

Now:
- Frontend calls `/api/channels/:channelId/participants/:userId/session-key` (correct endpoint)
- Each session key is stored with the correct participant's `userId`
- Result: Session keys have correct `userId` values (1 and 2)

### Troubleshooting

#### If you see "Session key not available" error:
1. Clear browser data for both users (Step 1)
2. Regenerate keys for both users (Step 2)
3. Try enabling encryption again

#### If you see "400 Bad Request" error:
- Check console for error details
- Verify the request body contains `encryptedSessionKey` (not `encryptedKey`)

#### If encryption enable fails:
1. Check that BOTH users have generated keys
2. Clear browser data and try again
3. Check browser console for detailed error messages

## After Successful Testing
Once encryption is working correctly:
1. Remove debug console.log statements from `EncryptionToggle.vue`
2. Remove the alert popup for encryption failures
3. Keep the user-friendly error messages
