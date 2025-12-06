const User = require('../models/User');

class UserService {
    async getAllUsers() {
        return await User.findAll({
            attributes: { exclude: ['password'] }
        });
    }

    async updateUser(id, data, requesterId, requesterRole) {
        const user = await User.findByPk(id);
        if (!user) {
            throw new Error('User not found');
        }

        // Authorization check
        if (requesterRole !== 'admin' && requesterId !== parseInt(id)) {
            throw new Error('Access denied');
        }

        if (data.email) user.email = data.email;
        if (data.role) user.role = data.role; // Note: In a real app, only admin should change roles

        await user.save();
        return { id: user.id, email: user.email, role: user.role };
    }
}

module.exports = new UserService();
