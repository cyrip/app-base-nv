const messageService = require('../services/messageService');
const socketService = require('../services/socketService');

class MessageController {
    async send(req, res) {
        try {
            const { toUserId, content } = req.body;
            if (!toUserId || !content) {
                return res.status(400).json({ message: 'toUserId and content are required' });
            }

            const message = await messageService.sendMessage(req.userId, toUserId, content);

            // Emit to recipient if online and echo to sender
            socketService.sendToUser(toUserId, 'private-message', message);
            socketService.sendToUser(req.userId, 'private-message', message);

            res.json({ message: 'Message sent', data: message });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async thread(req, res) {
        try {
            const otherUserId = parseInt(req.params.userId, 10);
            const messages = await messageService.getThread(req.userId, otherUserId);
            res.json(messages);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new MessageController();
