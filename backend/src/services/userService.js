const { User, Role, Group } = require('../models');

class UserService {
    async getAllUsers() {
        return await User.findAll({
            attributes: { exclude: ['password'] },
            include: [{
                model: Role,
                through: { attributes: [] },
                attributes: ['id', 'name']
            }]
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

        await user.save();
        return { id: user.id, email: user.email };
    }

    async assignRole(userId, roleId) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const role = await Role.findByPk(roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        await user.addRole(role);

        const updatedUser = await User.findByPk(userId, {
            include: [{
                model: Role,
                through: { attributes: [] }
            }]
        });

        return { message: 'Role assigned successfully', user: updatedUser };
    }

    async removeRole(userId, roleId) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const role = await Role.findByPk(roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        await user.removeRole(role);

        const updatedUser = await User.findByPk(userId, {
            include: [{
                model: Role,
                through: { attributes: [] }
            }]
        });

        return { message: 'Role removed successfully', user: updatedUser };
    }

    async assignGroup(userId, groupId) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const group = await Group.findByPk(groupId);
        if (!group) {
            throw new Error('Group not found');
        }

        await user.addGroup(group);

        const updatedUser = await User.findByPk(userId, {
            include: [{
                model: Group,
                through: { attributes: [] }
            }]
        });

        return { message: 'Group assigned successfully', user: updatedUser };
    }

    async removeGroup(userId, groupId) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const group = await Group.findByPk(groupId);
        if (!group) {
            throw new Error('Group not found');
        }

        await user.removeGroup(group);

        const updatedUser = await User.findByPk(userId, {
            include: [{
                model: Group,
                through: { attributes: [] }
            }]
        });

        return { message: 'Group removed successfully', user: updatedUser };
    }
}

module.exports = new UserService();
