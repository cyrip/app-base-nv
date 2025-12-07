const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.get('/', auth, chatController.listChannels);
router.post('/', auth, chatController.createChannel);
router.post('/direct', auth, chatController.direct);
router.get('/:id/messages', auth, chatController.listMessages);
router.post('/:id/messages', auth, chatController.sendMessage);
router.post('/:id/participants', auth, chatController.addParticipant);
router.delete('/:id/participants/:userId', auth, chatController.removeParticipant);

module.exports = router;
