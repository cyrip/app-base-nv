const userService = require('../services/userService');

class UserController {
    async getUsers(req, res) {
        try {
            const users = await userService.getAllUsers();
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async createUser(req, res) {
        try {
            const isAdmin = req.user?.Roles?.some(r => r.name === 'admin');
            if (!isAdmin) return res.status(403).json({ message: 'Access denied' });
            const { email, password, languageId } = req.body;
            const user = await userService.createUser({ email, password, languageId });
            res.status(201).json(user);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async updateUser(req, res) {
        try {
            const { email, role } = req.body;
            const result = await userService.updateUser(
                req.params.id,
                { email, role },
                req.userId,
                req.userRole
            );
            res.json({ message: 'User updated', user: result });
        } catch (error) {
            if (error.message === 'User not found') {
                res.status(404).json({ message: error.message });
            } else if (error.message === 'Access denied') {
                res.status(403).json({ message: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    async deleteUser(req, res) {
        try {
            const isAdmin = req.user?.Roles?.some(r => r.name === 'admin');
            if (!isAdmin) return res.status(403).json({ message: 'Access denied' });
            const result = await userService.softDeleteUser(req.params.id);
            res.json({ message: 'User deleted', user: result });
        } catch (error) {
            if (error.message === 'User not found') {
                res.status(404).json({ message: error.message });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    }

    async getProfile(req, res) {
        try {
            const user = await userService.getProfile(req.userId);
            res.json(user);
        } catch (error) {
            if (error.message === 'User not found') {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    async updateProfile(req, res) {
        try {
            const { currentPassword, newPassword, languageId } = req.body;
            const user = await userService.updateProfile(req.userId, { currentPassword, newPassword, languageId });
            res.json({ message: 'Profile updated', user });
        } catch (error) {
            if (error.message === 'User not found' || error.message === 'Language not found' || error.message === 'Invalid current password' || error.message === 'Current password required') {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    // POST /api/users/:id/roles - Assign role to user
    async assignRole(req, res) {
        try {
            const { roleId } = req.body;
            const result = await userService.assignRole(req.params.id, roleId);
            res.json(result);
        } catch (error) {
            if (error.message === 'User not found' || error.message === 'Role not found') {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    // DELETE /api/users/:id/roles/:roleId - Remove role from user
    async removeRole(req, res) {
        try {
            const result = await userService.removeRole(req.params.id, req.params.roleId);
            res.json(result);
        } catch (error) {
            if (error.message === 'User not found' || error.message === 'Role not found') {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    // POST /api/users/:id/groups - Assign group to user
    async assignGroup(req, res) {
        try {
            const { groupId } = req.body;
            const result = await userService.assignGroup(req.params.id, groupId);
            res.json(result);
        } catch (error) {
            if (error.message === 'User not found' || error.message === 'Group not found') {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }

    // DELETE /api/users/:id/groups/:groupId - Remove group from user
    async removeGroup(req, res) {
        try {
            const result = await userService.removeGroup(req.params.id, req.params.groupId);
            res.json(result);
        } catch (error) {
            if (error.message === 'User not found' || error.message === 'Group not found') {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }
}

module.exports = new UserController();
