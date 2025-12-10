const { LLMConversation, LLMConversationAgent, LLMMessage, LLMConnectAgent } = require('../../../models');
const llmService = require('../services/llmService');

class ConversationController {
    async list(req, res) {
        try {
            const convos = await LLMConversation.findAll({
                include: [{ model: LLMConnectAgent, as: 'LLMConnectAgents' }]
            });
            res.json(convos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            const { title, agentIds } = req.body;
            if (!Array.isArray(agentIds) || agentIds.length < 2) {
                return res.status(400).json({ error: 'Please select at least two agents for a conversation' });
            }
            const conversation = await LLMConversation.create({ title: title || 'Conversation' });
            const rows = agentIds.map(aid => ({ conversationId: conversation.id, agentId: aid }));
            await LLMConversationAgent.bulkCreate(rows, { ignoreDuplicates: true });
            const withAgents = await LLMConversation.findByPk(conversation.id, { include: [{ model: LLMConnectAgent, as: 'LLMConnectAgents' }] });
            res.json(withAgents);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async messages(req, res) {
        try {
            const { id } = req.params;
            const messages = await LLMMessage.findAll({
                where: { conversationId: id },
                order: [['createdAt', 'ASC']],
                include: [{ model: LLMConnectAgent, as: 'Agent' }]
            });
            res.json(messages);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async remove(req, res) {
        try {
            const { id } = req.params;
            const convo = await LLMConversation.findByPk(id);
            if (!convo) return res.status(404).json({ error: 'Conversation not found' });
            // Clean up dependent rows to avoid FK constraint issues
            await LLMMessage.destroy({ where: { conversationId: id } });
            await LLMConversationAgent.destroy({ where: { conversationId: id } });
            await convo.destroy();
            res.json({ success: true });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async send(req, res) {
        try {
            const { id } = req.params;
            const { agentId, content } = req.body;
            const result = await llmService.sendMessage({ conversationId: id, fromAgentId: agentId, content });
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async start(req, res) {
        try {
            const { id } = req.params;
            const { rounds, initialPrompt, delayMs } = req.body || {};
            const result = await llmService.startConversation({
                conversationId: id,
                rounds: rounds || 1,
                initialPrompt,
                delayMs
            });
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new ConversationController();
