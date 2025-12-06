const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Get all users (Protected)
router.get('/', auth, userController.getUsers);

// Current user profile
router.get('/me', auth, userController.getProfile);
router.put('/me', auth, userController.updateProfile);

// Update user (Protected)
router.put('/:id', auth, userController.updateUser);

// Assign role to user (Admin only)
router.post('/:id/roles', auth, userController.assignRole);

// Remove role from user (Admin only)
router.delete('/:id/roles/:roleId', auth, userController.removeRole);

// Assign group to user (Admin only)
router.post('/:id/groups', auth, userController.assignGroup);

// Remove group from user (Admin only)
router.delete('/:id/groups/:groupId', auth, userController.removeGroup);

module.exports = router;
