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
            const result = await chatService.getOrCreateDirectChannel(req.userId, userId);
            
            // If a new channel was created, notify both users
            if (result.isNew) {
                console.log(`[direct] New channel created, notifying users ${req.userId} and ${userId}`);
                // Notify the other user
                const sent1 = socketService.sendToUser(userId, 'channel:created', result.channel);
                // Also notify the creator (in case they have multiple tabs open)
                const sent2 = socketService.sendToUser(req.userId, 'channel:created', result.channel);
                console.log(`[direct] Notifications sent: user ${userId}=${sent1}, user ${req.userId}=${sent2}`);
            } else {
                console.log(`[direct] Existing channel found, no notification needed`);
            }
            
            res.json(result.channel);
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
            const { content, encrypted, encryptionMetadata } = req.body;
            
            // Validate encryption metadata if message is encrypted
            if (encrypted && !encryptionMetadata) {
                return res.status(400).json({ error: 'Encryption metadata required for encrypted messages' });
            }
            
            const message = await chatService.sendMessage(
                id,
                req.userId,
                content,
                encrypted || false,
                encryptionMetadata || null
            );
            
            socketService.broadcastToChannel(id, 'channel:message', message);
            res.json(message);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async addParticipant(req, res) {
        try {
            const { id } = req.params;
            const { userId } = req.body;
            
            if (!userId) {
                return res.status(400).json({ error: 'userId is required' });
            }
            
            const result = await chatService.addParticipantToChannel(
                parseInt(id),
                parseInt(userId),
                req.userId
            );
            
            // Notify all participants about the new member
            socketService.broadcastToChannel(id, 'channel:participant-added', {
                channelId: id,
                userId: userId,
                ...result
            });
            
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async removeParticipant(req, res) {
        try {
            const { id, userId } = req.params;
            
            const result = await chatService.removeParticipantFromChannel(
                parseInt(id),
                parseInt(userId),
                req.userId
            );
            
            // Notify all participants about the removal
            socketService.broadcastToChannel(id, 'channel:participant-removed', {
                channelId: id,
                userId: parseInt(userId),
                ...result
            });
            
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new ChatController();
