const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { verifyToken, requirePermission } = require('../middleware/auth');

// All role routes require authentication and role.manage permission
router.use(verifyToken);

// List all roles
router.get('/', roleController.getRoles);

// Create role (admin only)
router.post('/', requirePermission('role.manage'), roleController.createRole);

// Update role (admin only)
router.put('/:id', requirePermission('role.manage'), roleController.updateRole);

// Delete role (admin only)
router.delete('/:id', requirePermission('role.manage'), roleController.deleteRole);

// Assign permissions to role (admin only)
router.post('/:id/permissions', requirePermission('role.manage'), roleController.assignPermissions);

module.exports = router;
