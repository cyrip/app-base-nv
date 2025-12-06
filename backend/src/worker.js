require('dotenv').config();
const { agentQueue } = require('./config/queue');

console.log('Worker started...');

agentQueue.process(async (job) => {
    console.log(`Processing job ${job.id} with data:`, job.data);

    // Simulate task processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`Job ${job.id} completed`);
    return { result: 'Success' };
});

agentQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed with result: ${JSON.stringify(result)}`);
});

agentQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error: ${err.message}`);
});
