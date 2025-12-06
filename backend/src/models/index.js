const sequelize = require('../config/database');
const User = require('./User');
const Role = require('./Role');
const Group = require('./Group');
const Permission = require('./Permission');
const Language = require('./Language');

// Define Associations

// User <-> Role
User.belongsToMany(Role, { through: 'UserRoles' });
Role.belongsToMany(User, { through: 'UserRoles' });

// User <-> Group
User.belongsToMany(Group, { through: 'UserGroups' });
Group.belongsToMany(User, { through: 'UserGroups' });

// Role <-> Permission
Role.belongsToMany(Permission, { through: 'RolePermissions' });
Permission.belongsToMany(Role, { through: 'RolePermissions' });

// User -> Language
Language.hasMany(User, { foreignKey: 'languageId' });
User.belongsTo(Language, { foreignKey: 'languageId', as: 'Language' });

module.exports = {
    sequelize,
    User,
    Role,
    Group,
    Permission,
    Language
};
