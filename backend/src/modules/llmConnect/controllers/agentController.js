const { LLMConnectAgent } = require('../../../models');

class AgentController {
    async list(req, res) {
        try {
            const agents = await LLMConnectAgent.findAll();
            res.json(agents);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            const { name, role, instructions, apiKey, provider } = req.body;
            const agent = await LLMConnectAgent.create({ name, role, instructions, apiKey, provider: provider || 'chatgpt' });
            res.json(agent);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async remove(req, res) {
        try {
            const { id } = req.params;
            const agent = await LLMConnectAgent.findByPk(id);
            if (!agent) return res.status(404).json({ error: 'Agent not found' });
            await agent.destroy();
            res.json({ success: true });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const agent = await LLMConnectAgent.findByPk(id);
            if (!agent) return res.status(404).json({ error: 'Agent not found' });

            const { name, role, instructions, apiKey, provider } = req.body;
            if (name !== undefined) agent.name = name;
            if (role !== undefined) agent.role = role;
            if (instructions !== undefined) agent.instructions = instructions;
            if (provider !== undefined) agent.provider = provider;
            if (apiKey !== undefined) agent.apiKey = apiKey;

            await agent.save();
            res.json(agent);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new AgentController();
