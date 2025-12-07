const express = require('express');
const router = express.Router();
const encryptionController = require('../controllers/encryptionController');
const auth = require('../middleware/auth');

// User encryption key endpoints
router.post('/users/keys', auth, encryptionController.uploadPublicKey);
router.get('/users/me/encryption/status', auth, encryptionController.getEncryptionStatus);
router.get('/users/:userId/public-key', encryptionController.getPublicKey); // Public endpoint

// Channel encryption endpoints
router.post('/channels/:channelId/encryption/enable', auth, encryptionController.enableEncryption);
router.get('/channels/:channelId/encryption/status', auth, encryptionController.getChannelEncryptionStatus);
router.get('/channels/:channelId/participants/keys', auth, encryptionController.getParticipantKeys);

// Session key endpoints
router.post('/channels/:channelId/session-keys', auth, encryptionController.storeSessionKey);
router.get('/channels/:channelId/session-keys/me', auth, encryptionController.getMySessionKey);
router.post('/channels/:channelId/participants/:userId/session-key', auth, encryptionController.addParticipantSessionKey);
router.post('/channels/:channelId/session-keys/rotate', auth, encryptionController.rotateSessionKey);

module.exports = router;
