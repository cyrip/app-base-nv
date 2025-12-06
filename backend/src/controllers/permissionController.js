const { Permission } = require('../models');

class PermissionController {
    // GET /api/permissions - List all permissions
    async getPermissions(req, res) {
        try {
            const permissions = await Permission.findAll();
            res.json(permissions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PermissionController();
