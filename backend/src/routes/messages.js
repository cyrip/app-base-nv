const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const messageController = require('../controllers/messageController');

router.post('/', auth, messageController.send);
router.get('/thread/:userId', auth, messageController.thread);

module.exports = router;
