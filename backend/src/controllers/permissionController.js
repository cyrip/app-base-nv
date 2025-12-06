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

    // POST /api/permissions - Create permission
    async createPermission(req, res) {
        try {
            const { name, description } = req.body;

            if (!name) {
                return res.status(400).json({ message: 'Permission name is required' });
            }

            const permission = await Permission.create({ name, description });
            res.status(201).json(permission);
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ message: 'Permission already exists' });
            }
            res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/permissions/:id - Delete permission
    async deletePermission(req, res) {
        try {
            const permission = await Permission.findByPk(req.params.id);

            if (!permission) {
                return res.status(404).json({ message: 'Permission not found' });
            }

            await permission.destroy();
            res.json({ message: 'Permission deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new PermissionController();
