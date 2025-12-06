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
}

module.exports = new UserController();
