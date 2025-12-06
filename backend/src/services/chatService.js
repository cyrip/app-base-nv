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
    const existing = await Channel.findOne({
        where: { type: 'direct' },
        include: [
            {
                model: ChannelParticipant,
                where: { userId },
                attributes: []
            },
            {
                model: ChannelParticipant,
                required: true,
                where: { userId: otherUserId },
                attributes: []
            }
        ]
    });
    if (existing) return existing;
    return createChannel({
        name: null,
        type: 'direct',
        participantIds: [userId, otherUserId],
        createdBy: userId
    });
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

const sendMessage = async (channelId, fromUserId, content) => {
    await ensureMembership(channelId, fromUserId);
    const msg = await Message.create({ channelId, fromUserId, toUserId: null, content });
    await Channel.update({ updatedAt: new Date() }, { where: { id: channelId } });
    return Message.findByPk(msg.id, {
        include: [
            { model: User, as: 'FromUser', attributes: ['id', 'email'] },
            { model: Channel }
        ]
    });
};

module.exports = {
    listChannelsForUser,
    createChannel,
    getChannelMessages,
    sendMessage,
    listChannelIdsForUser,
    getOrCreateDirectChannel
};
