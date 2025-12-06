const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const auth = require('../middleware/auth');

// All permission routes require authentication
router.use(auth);

// List all permissions
router.get('/', permissionController.getPermissions);

// Create permission (admin only)
router.post('/', auth.requirePermission('permission.manage'), permissionController.createPermission);

// Delete permission (admin only)
router.delete('/:id', auth.requirePermission('permission.manage'), permissionController.deletePermission);

module.exports = router;
