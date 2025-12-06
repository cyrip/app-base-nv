const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const auth = require('../middleware/auth');

// All permission routes require authentication
router.use(auth);

// List all permissions
router.get('/', permissionController.getPermissions);

module.exports = router;
