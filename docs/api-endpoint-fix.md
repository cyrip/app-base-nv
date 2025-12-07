# API Endpoint Fix

## Issue
Frontend was calling encryption endpoints without the `/api` prefix, resulting in 404 errors.

## Root Cause
Backend encryption routes are mounted at `/api` in `backend/src/app.js`:
```javascript
app.use('/api', encryptionRoutes);
```

But frontend was calling endpoints like:
- `/channels/:id/encryption/status` ❌
- `/users/keys` ❌

## Solution
Added `/api` prefix to all encryption-related API calls in the frontend:

### Files Updated:
1. **frontend/src/modules/chat/components/EncryptionToggle.vue**
   - `/channels/:id/encryption/status` → `/api/channels/:id/encryption/status` ✓
   - `/channels/:id/encryption/enable` → `/api/channels/:id/encryption/enable` ✓

2. **frontend/src/modules/chat/components/EncryptionInfoModal.vue**
   - `/channels/:id/encryption/status` → `/api/channels/:id/encryption/status` ✓

3. **frontend/src/modules/chat/components/KeyManagementModal.vue**
   - `/users/me/encryption/status` → `/api/users/me/encryption/status` ✓
   - `/users/keys` → `/api/users/keys` ✓

4. **frontend/src/modules/chat/views/Chat.vue**
   - `/channels/:id/session-keys/me` → `/api/channels/:id/session-keys/me` ✓
   - `/users/:id/public-key` → `/api/users/:id/public-key` ✓
   - `/channels/:id/participants/keys` → `/api/channels/:id/participants/keys` ✓
   - `/channels/:id/session-keys/rotate` → `/api/channels/:id/session-keys/rotate` ✓

## Correct Endpoint Paths

All encryption endpoints now use the correct paths:

### User Encryption
- `POST /api/users/keys` - Upload public key
- `GET /api/users/me/encryption/status` - Check encryption status
- `GET /api/users/:userId/public-key` - Get user's public key

### Channel Encryption
- `POST /api/channels/:channelId/encryption/enable` - Enable encryption
- `GET /api/channels/:channelId/encryption/status` - Get encryption status
- `GET /api/channels/:channelId/participants/keys` - Get participant keys

### Session Keys
- `POST /api/channels/:channelId/session-keys` - Store session key
- `GET /api/channels/:channelId/session-keys/me` - Get my session key
- `POST /api/channels/:channelId/session-keys/rotate` - Rotate session key

## Testing
After this fix:
1. Login to the application
2. Navigate to chat
3. Select a channel
4. Encryption status should load without 404 errors
5. Encryption toggle should work correctly
