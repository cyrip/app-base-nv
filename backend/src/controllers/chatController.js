const chatService = require('../services/chatService');
const socketService = require('../services/socketService');

class ChatController {
    async listChannels(req, res) {
        try {
            const channels = await chatService.listChannelsForUser(req.userId);
            res.json(channels);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async createChannel(req, res) {
        try {
            const { name, type, participantIds } = req.body;
            const channel = await chatService.createChannel({
                name,
                type: type || 'custom',
                participantIds,
                createdBy: req.userId
            });

            // notify participants
            channel.ChannelParticipants?.forEach(cp => {
                socketService.sendToUser(cp.userId, 'channel:created', channel);
            });

            res.json(channel);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async direct(req, res) {
        try {
            const { userId } = req.body;
            const channel = await chatService.getOrCreateDirectChannel(req.userId, userId);
            res.json(channel);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async listMessages(req, res) {
        try {
            const { id } = req.params;
            const { before, limit } = req.query;
            const messages = await chatService.getChannelMessages(
                id,
                req.userId,
                limit ? parseInt(limit, 10) : 50,
                before
            );
            res.json(messages);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async sendMessage(req, res) {
        try {
            const { id } = req.params;
            const { content } = req.body;
            const message = await chatService.sendMessage(id, req.userId, content);
            socketService.broadcastToChannel(id, 'channel:message', message);
            res.json(message);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new ChatController();
