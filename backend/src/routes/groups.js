const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { requirePermission } = require('../middleware/auth');
const auth = require('../middleware/auth');

// All group routes require authentication
router.use(auth);

// List all groups
router.get('/', groupController.getGroups);

// Create group (admin only)
router.post('/', requirePermission('group.manage'), groupController.createGroup);

// Update group (admin only)
router.put('/:id', requirePermission('group.manage'), groupController.updateGroup);

// Delete group (admin only)
router.delete('/:id', requirePermission('group.manage'), groupController.deleteGroup);

module.exports = router;
