const axios = require('axios');
const { LLMMessage, LLMConnectAgent, LLMConversation } = require('../../../models');

const buildHistoryForAgent = async (conversationId, agentId, limit = 30) => {
    const msgs = await LLMMessage.findAll({
        where: { conversationId },
        order: [['createdAt', 'ASC']],
        limit,
        include: [{ model: LLMConnectAgent, as: 'Agent' }]
    });
    // Map conversation into the perspective of agentId:
    // messages from agentId -> assistant, others -> user, prepend speaker name for clarity
    return msgs.map(m => {
        const speakerName = m.Agent?.name || 'Agent';
        const content = `${speakerName}: ${m.content}`;
        const role = m.agentId === agentId ? 'assistant' : 'user';
        return { role, content };
    });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callLLM = async ({ provider = 'chatgpt', apiKey, systemPrompt, history, userInput }) => {
    if (!apiKey) {
        // Fallback dummy response if no API key
        return `Echo: ${userInput}`;
    }

    if (provider === 'chatgpt') {
        const body = {
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: userInput }
            ],
            temperature: 0.5
        };
        const res = await axios.post('https://api.openai.com/v1/chat/completions', body, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            }
        });
        return res.data.choices?.[0]?.message?.content || '';
    }

    // Unknown provider fallback
    return `Echo (${provider}): ${userInput}`;
};

const sendMessage = async ({ conversationId, fromAgentId, content }) => {
    const agent = await LLMConnectAgent.findByPk(fromAgentId);
    if (!agent) {
        throw new Error('Agent not found');
    }
    // Save user message
    const userMsg = await LLMMessage.create({
        conversationId,
        agentId: fromAgentId,
        role: 'user',
        content
    });

    const history = await buildHistoryForAgent(conversationId, fromAgentId, 30);
    const systemPrompt = agent.instructions || agent.role || 'You are an assistant.';
    const apiKey = agent.apiKey || process.env.OPENAI_API_KEY;
    let reply;
    try {
        reply = await callLLM({
            provider: agent.provider || 'chatgpt',
            apiKey,
            systemPrompt,
            history,
            userInput: content
        });
    } catch (err) {
        console.error('LLM sendMessage failed:', err.message);
        reply = `LLM error: ${err.message || 'unknown error'}`;
    }

    const llmMsg = await LLMMessage.create({
        conversationId,
        agentId: fromAgentId,
        role: 'assistant',
        content: reply
    });
    llmMsg.Agent = agent;

    return { userMsg, llmMsg };
};

const startConversation = async ({ conversationId, rounds = 1, initialPrompt, delayMs = 0 }) => {
    const convo = await LLMConversation.findByPk(conversationId, {
        include: [{ model: LLMConnectAgent, as: 'LLMConnectAgents' }]
    });
    if (!convo) throw new Error('Conversation not found');
    const agents = convo.LLMConnectAgents || [];
    if (agents.length < 2) {
        throw new Error('Need at least two agents to start a conversation');
    }

    // Use first two agents for dialogue
    const agentA = agents[0];
    const agentB = agents[1];
    const createdMessages = [];

    // Local history cache for quick append (we still fetch perspective history per responder)
    const history = [];

    // Agent A kickoff
    const kickoffText = initialPrompt || agentA.instructions || agentA.role || 'Start the conversation.';
    const kickoffMsg = await LLMMessage.create({
        conversationId,
        agentId: agentA.id,
        role: 'assistant',
        content: kickoffText
    });
    kickoffMsg.Agent = agentA;
    createdMessages.push(kickoffMsg);
    history.push({ role: 'assistant', content: `${agentA.name}: ${kickoffText}` });

    let lastSpeaker = agentA;
    let lastContent = kickoffText;

    // Each round = one reply from the other agent
    const delay = Math.max(0, Number(delayMs) || 0);
    for (let r = 0; r < rounds; r++) {
        const responder = lastSpeaker.id === agentA.id ? agentB : agentA;
        const other = responder.id === agentA.id ? agentB : agentA;
        const systemPrompt = responder.instructions
            || responder.role
            || `You are ${responder.name}, talking to ${other.name} whose role is ${other.role || 'assistant'}. Be concise and stay in character.`;
        let replyText;
        try {
            const perspectiveHistory = await buildHistoryForAgent(conversationId, responder.id, 50);
            replyText = await callLLM({
                provider: responder.provider || 'chatgpt',
                apiKey: responder.apiKey || process.env.OPENAI_API_KEY,
                systemPrompt,
                history: perspectiveHistory,
                userInput: lastContent || 'Continue the conversation.'
            });
        } catch (err) {
            console.error('LLM startConversation failed:', err.message);
            replyText = `LLM error: ${err.message || 'unknown error'}`;
        }

        const responderMsg = await LLMMessage.create({
            conversationId,
            agentId: responder.id,
            role: 'assistant',
            content: replyText
        });
        responderMsg.Agent = responder;
        createdMessages.push(responderMsg);
        history.push({ role: 'assistant', content: `${responder.name}: ${replyText}` });

        lastSpeaker = responder;
        lastContent = replyText;

        if (delay > 0 && r < rounds - 1) {
            await sleep(delay);
        }
    }

    return { messages: createdMessages };
};

module.exports = {
    sendMessage,
    startConversation
};
