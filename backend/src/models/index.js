const sequelize = require('../config/database');
const User = require('./User');
const Role = require('./Role');
const Group = require('./Group');
const Permission = require('./Permission');
const Language = require('./Language');
const Message = require('./Message');
const Channel = require('./Channel');
const ChannelParticipant = require('./ChannelParticipant');
const UserPublicKey = require('./UserPublicKey');
const ChannelSessionKey = require('./ChannelSessionKey');

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

// Messages
User.hasMany(Message, { foreignKey: 'fromUserId', as: 'SentMessages' });
User.hasMany(Message, { foreignKey: 'toUserId', as: 'ReceivedMessages' });
Message.belongsTo(User, { foreignKey: 'fromUserId', as: 'FromUser' });
Message.belongsTo(User, { foreignKey: 'toUserId', as: 'ToUser' });

// Channels
Channel.belongsToMany(User, { through: ChannelParticipant, foreignKey: 'channelId', otherKey: 'userId' });
User.belongsToMany(Channel, { through: ChannelParticipant, foreignKey: 'userId', otherKey: 'channelId' });
Channel.hasMany(ChannelParticipant, { foreignKey: 'channelId' });
ChannelParticipant.belongsTo(Channel, { foreignKey: 'channelId' });
User.hasMany(ChannelParticipant, { foreignKey: 'userId' });
ChannelParticipant.belongsTo(User, { foreignKey: 'userId' });
Channel.hasMany(Message, { foreignKey: 'channelId' });
Message.belongsTo(Channel, { foreignKey: 'channelId' });

// Encryption associations
User.hasMany(UserPublicKey, { foreignKey: 'userId' });
UserPublicKey.belongsTo(User, { foreignKey: 'userId' });

Channel.hasMany(ChannelSessionKey, { foreignKey: 'channelId' });
ChannelSessionKey.belongsTo(Channel, { foreignKey: 'channelId' });
User.hasMany(ChannelSessionKey, { foreignKey: 'userId' });
ChannelSessionKey.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
    sequelize,
    User,
    Role,
    Group,
    Permission,
    Language,
    Message,
    Channel,
    ChannelParticipant,
    UserPublicKey,
    ChannelSessionKey
};
