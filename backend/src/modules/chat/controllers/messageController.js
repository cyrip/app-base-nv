const messageService = require('../services/messageService');
const socketService = require('../services/socketService');

class MessageController {
    async send(req, res) {
        try {
            const { toUserId, content } = req.body;
            const message = await messageService.sendMessage(req.userId, toUserId, content);
            socketService.sendToUser(toUserId, 'private-message', message);
            socketService.sendToUser(req.userId, 'private-message', message);
            res.json(message);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async thread(req, res) {
        try {
            const { userId } = req.params;
            const messages = await messageService.getThread(req.userId, userId);
            res.json(messages);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new MessageController();
