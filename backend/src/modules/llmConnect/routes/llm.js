const express = require('express');
const router = express.Router();
const auth = require('../../../middleware/auth');
const agentController = require('../controllers/agentController');
const conversationController = require('../controllers/conversationController');

router.get('/agents', auth, agentController.list);
router.post('/agents', auth, auth.requirePermission('llm.manage'), agentController.create);
router.put('/agents/:id', auth, auth.requirePermission('llm.manage'), agentController.update);
router.delete('/agents/:id', auth, auth.requirePermission('llm.manage'), agentController.remove);

router.get('/conversations', auth, conversationController.list);
router.post('/conversations', auth, auth.requirePermission('llm.manage'), conversationController.create);
router.post('/conversations/:id/start', auth, auth.requirePermission('llm.manage'), conversationController.start);
router.get('/conversations/:id/messages', auth, conversationController.messages);
router.post('/conversations/:id/messages', auth, conversationController.send);
router.delete('/conversations/:id', auth, auth.requirePermission('llm.manage'), conversationController.remove);

module.exports = router;
