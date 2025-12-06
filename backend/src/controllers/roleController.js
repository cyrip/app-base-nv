const { Role, Permission, User } = require('../models');

class RoleController {
    // GET /api/roles - List all roles
    async getRoles(req, res) {
        try {
            const roles = await Role.findAll({
                include: [{
                    model: Permission,
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'description']
                }]
            });
            res.json(roles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/roles - Create role
    async createRole(req, res) {
        try {
            const { name, description } = req.body;

            if (!name) {
                return res.status(400).json({ message: 'Role name is required' });
            }

            const role = await Role.create({ name, description });
            res.status(201).json(role);
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ message: 'Role already exists' });
            }
            res.status(500).json({ error: error.message });
        }
    }

    // PUT /api/roles/:id - Update role
    async updateRole(req, res) {
        try {
            const { name, description } = req.body;
            const role = await Role.findByPk(req.params.id);

            if (!role) {
                return res.status(404).json({ message: 'Role not found' });
            }

            if (name) role.name = name;
            if (description !== undefined) role.description = description;

            await role.save();
            res.json(role);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/roles/:id - Delete role
    async deleteRole(req, res) {
        try {
            const role = await Role.findByPk(req.params.id);

            if (!role) {
                return res.status(404).json({ message: 'Role not found' });
            }

            // Prevent deletion of system roles
            if (role.name === 'admin' || role.name === 'user') {
                return res.status(403).json({ message: 'Cannot delete system roles' });
            }

            await role.destroy();
            res.json({ message: 'Role deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/roles/:id/permissions - Assign permissions to role
    async assignPermissions(req, res) {
        try {
            const { permissionIds } = req.body;
            const role = await Role.findByPk(req.params.id);

            if (!role) {
                return res.status(404).json({ message: 'Role not found' });
            }

            if (!Array.isArray(permissionIds)) {
                return res.status(400).json({ message: 'permissionIds must be an array' });
            }

            const permissions = await Permission.findAll({
                where: { id: permissionIds }
            });

            await role.setPermissions(permissions);

            const updatedRole = await Role.findByPk(req.params.id, {
                include: [{
                    model: Permission,
                    through: { attributes: [] }
                }]
            });

            res.json(updatedRole);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new RoleController();
