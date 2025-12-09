const axios = require('axios');
const { LLMMessage, LLMConnectAgent, LLMConversation } = require('../../../models');

const buildHistory = async (conversationId, limit = 20) => {
    const msgs = await LLMMessage.findAll({
        where: { conversationId },
        order: [['createdAt', 'ASC']],
        limit
    });
    return msgs.map(m => ({
        role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
    }));
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

    const history = await buildHistory(conversationId, 12);
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

    // Local history cache to avoid re-query each turn
    const history = await buildHistory(conversationId, 50);

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
    history.push({ role: 'assistant', content: kickoffText });

    let lastSpeaker = agentA;
    let lastContent = kickoffText;

    // Each round = one reply from the other agent
    const delay = Math.max(0, Number(delayMs) || 0);
    for (let r = 0; r < rounds; r++) {
        const responder = lastSpeaker.id === agentA.id ? agentB : agentA;
        const systemPrompt = responder.instructions || responder.role || `You are ${responder.name}.`;
        let replyText;
        try {
            replyText = await callLLM({
                provider: responder.provider || 'chatgpt',
                apiKey: responder.apiKey || process.env.OPENAI_API_KEY,
                systemPrompt,
                history,
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
        history.push({ role: 'assistant', content: replyText });

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
