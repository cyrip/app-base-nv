const { Op } = require('sequelize');
const { Message, User } = require('../../../models');

const sendMessage = async (fromUserId, toUserId, content) => {
    const message = await Message.create({ fromUserId, toUserId, content });
    return Message.findByPk(message.id, {
        include: [
            { model: User, as: 'FromUser', attributes: ['id', 'email'] },
            { model: User, as: 'ToUser', attributes: ['id', 'email'] }
        ]
    });
};

const getThread = async (userId, otherUserId) => {
    return Message.findAll({
        where: {
            [Op.or]: [
                { fromUserId: userId, toUserId: otherUserId },
                { fromUserId: otherUserId, toUserId: userId }
            ]
        },
        order: [['createdAt', 'ASC']],
        include: [
            { model: User, as: 'FromUser', attributes: ['id', 'email'] },
            { model: User, as: 'ToUser', attributes: ['id', 'email'] }
        ]
    });
};

module.exports = {
    sendMessage,
    getThread
};
