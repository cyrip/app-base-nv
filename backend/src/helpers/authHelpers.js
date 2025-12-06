const { User, Role, Group, Permission } = require('../models');

/**
 * Add helper methods to User instances
 */

// Check if user has a specific role
User.prototype.hasRole = async function (roleName) {
    const roles = await this.getRoles();
    return roles.some(role => role.name === roleName);
};

// Check if user is in a specific group
User.prototype.inGroup = async function (groupName) {
    const groups = await this.getGroups();
    return groups.some(group => group.name === groupName);
};

// Check if user has a specific permission (via roles)
User.prototype.can = async function (permissionName) {
    const roles = await this.getRoles({ include: [Permission] });
    for (const role of roles) {
        const permissions = await role.getPermissions();
        if (permissions.some(perm => perm.name === permissionName)) {
            return true;
        }
    }
    return false;
};

module.exports = { User, Role, Group, Permission };
