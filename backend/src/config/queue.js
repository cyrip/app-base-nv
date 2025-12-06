const Queue = require('bull');

const queueConfig = {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
    }
};

const agentQueue = new Queue('agent-tasks', queueConfig);

agentQueue.on('ready', () => {
    console.log('Bull Queue ready');
});

agentQueue.on('error', (error) => {
    console.error('Bull Queue error:', error);
});

module.exports = { agentQueue };
