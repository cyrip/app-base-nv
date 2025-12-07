const { Op } = require('sequelize');
const { Channel, ChannelParticipant, Message, User } = require('../models');

const ensureMembership = async (channelId, userId) => {
    const count = await ChannelParticipant.count({
        where: { channelId, userId }
    });
    if (count === 0) {
        throw new Error('Not a channel participant');
    }
};

const listChannelIdsForUser = async (userId) => {
    const rows = await ChannelParticipant.findAll({
        where: { userId },
        attributes: ['channelId']
    });
    return rows.map(r => r.channelId);
};

const listChannelsForUser = async (userId) => {
    return Channel.findAll({
        include: [
            {
                model: ChannelParticipant,
                where: { userId },
                attributes: []
            },
            {
                model: ChannelParticipant,
                include: [{ model: User, attributes: ['id', 'email'] }]
            }
        ],
        order: [['updatedAt', 'DESC']]
    });
};

const createChannel = async ({ name, type = 'custom', participantIds, createdBy }) => {
    if (!participantIds?.length) throw new Error('Participants required');
    if (!participantIds.includes(createdBy)) participantIds.push(createdBy);

    const channel = await Channel.create({ name, type, createdBy });
    const rows = participantIds.map(userId => ({ channelId: channel.id, userId }));
    await ChannelParticipant.bulkCreate(rows, { ignoreDuplicates: true });
    return Channel.findByPk(channel.id, {
        include: [
            {
                model: ChannelParticipant,
                include: [{ model: User, attributes: ['id', 'email'] }]
            }
        ]
    });
};

const getOrCreateDirectChannel = async (userId, otherUserId) => {
    // Find all direct channels for userId
    const userChannels = await Channel.findAll({
        where: { type: 'direct' },
        include: [
            {
                model: ChannelParticipant,
                attributes: ['userId']
            }
        ]
    });
    
    // Find a channel that has exactly these two users
    const existing = userChannels.find(channel => {
        const participantIds = channel.ChannelParticipants.map(p => p.userId);
        return participantIds.length === 2 &&
               participantIds.includes(userId) &&
               participantIds.includes(otherUserId);
    });
    
    if (existing) {
        // Return the full channel with all associations
        const channel = await Channel.findByPk(existing.id, {
            include: [
                {
                    model: ChannelParticipant,
                    include: [{ model: User, attributes: ['id', 'email'] }]
                }
            ]
        });
        return { channel, isNew: false };
    }
    
    const channel = await createChannel({
        name: null,
        type: 'direct',
        participantIds: [userId, otherUserId],
        createdBy: userId
    });
    
    return { channel, isNew: true };
};

const getChannelMessages = async (channelId, userId, limit = 50, before) => {
    await ensureMembership(channelId, userId);
    const where = { channelId };
    if (before) {
        where.createdAt = { [Op.lt]: before };
    }
    return Message.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        include: [{ model: User, as: 'FromUser', attributes: ['id', 'email'] }]
    });
};

const sendMessage = async (channelId, fromUserId, content, encrypted = false, encryptionMetadata = null) => {
    await ensureMembership(channelId, fromUserId);
    
    const messageData = {
        channelId,
        fromUserId,
        toUserId: null,
        content,
        encrypted,
        encryptionMetadata
    };
    
    const msg = await Message.create(messageData);
    await Channel.update({ updatedAt: new Date() }, { where: { id: channelId } });
    
    return Message.findByPk(msg.id, {
        include: [
            { model: User, as: 'FromUser', attributes: ['id', 'email'] },
            { model: Channel }
        ]
    });
};

const addParticipantToChannel = async (channelId, userId, addedBy) => {
    // Check if channel exists
    const channel = await Channel.findByPk(channelId);
    if (!channel) {
        throw new Error('Channel not found');
    }
    
    // Check if adding user is a participant
    await ensureMembership(channelId, addedBy);
    
    // Check if user is already a participant
    const existing = await ChannelParticipant.findOne({
        where: { channelId, userId }
    });
    
    if (existing) {
        throw new Error('User is already a participant');
    }
    
    // Add participant
    await ChannelParticipant.create({
        channelId,
        userId,
        joinedAt: new Date()
    });
    
    // If channel is encrypted, handle session key distribution
    if (channel.encryptionEnabled) {
        const encryptionService = require('./encryptionService');
        
        // Check if new participant has keys
        const usersWithKeys = await encryptionService.getUsersWithKeys([userId]);
        const hasKeys = usersWithKeys.includes(userId);
        
        return {
            success: true,
            channelEncrypted: true,
            participantHasKeys: hasKeys,
            message: hasKeys 
                ? 'Participant added. Session key needs to be encrypted for them.'
                : 'Participant added but does not have encryption keys. They will need to generate keys to read encrypted messages.'
        };
    }
    
    return {
        success: true,
        channelEncrypted: false,
        message: 'Participant added successfully'
    };
};

const removeParticipantFromChannel = async (channelId, userId, removedBy) => {
    // Check if channel exists
    const channel = await Channel.findByPk(channelId);
    if (!channel) {
        throw new Error('Channel not found');
    }
    
    // Check if removing user is a participant (or removing themselves)
    if (removedBy !== userId) {
        await ensureMembership(channelId, removedBy);
    }
    
    // Check if user is a participant
    const participant = await ChannelParticipant.findOne({
        where: { channelId, userId }
    });
    
    if (!participant) {
        throw new Error('User is not a participant');
    }
    
    // Remove participant
    await participant.destroy();
    
    // If channel is encrypted, session key needs to be rotated
    if (channel.encryptionEnabled) {
        return {
            success: true,
            channelEncrypted: true,
            requiresKeyRotation: true,
            message: 'Participant removed. Session key rotation required for security.'
        };
    }
    
    return {
        success: true,
        channelEncrypted: false,
        message: 'Participant removed successfully'
    };
};

module.exports = {
    listChannelsForUser,
    createChannel,
    getChannelMessages,
    sendMessage,
    listChannelIdsForUser,
    getOrCreateDirectChannel,
    addParticipantToChannel,
    removeParticipantFromChannel,
    ensureMembership
};
