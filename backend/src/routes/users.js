const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Get all users (Protected)
router.get('/', auth, userController.getUsers);

// Update user (Protected)
router.put('/:id', auth, userController.updateUser);

module.exports = router;
