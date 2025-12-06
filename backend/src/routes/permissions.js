const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { verifyToken } = require('../middleware/auth');

// All permission routes require authentication
router.use(verifyToken);

// List all permissions
router.get('/', permissionController.getPermissions);

module.exports = router;
