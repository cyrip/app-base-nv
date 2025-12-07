const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const moduleController = require('../controllers/moduleController');

// List modules
router.get('/', auth, moduleController.list);

// Update module (enable/disable/settings) - require auth then permission
router.put('/:id', auth, auth.requirePermission('module.manage'), moduleController.update);

module.exports = router;
