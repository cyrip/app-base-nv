const express = require('express');
const router = express.Router();
const auth = require('../../../middleware/auth');
const themeController = require('../controllers/themeController');

router.get('/', auth, themeController.list);
router.put('/:id/activate', auth, auth.requirePermission('theme.manage'), themeController.activate);

module.exports = router;
