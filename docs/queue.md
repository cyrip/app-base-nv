# Queue System Documentation

The Agent App uses a robust queue system backed by **Redis** and **Bull** to handle background tasks asynchronously. This ensures that heavy or long-running operations do not block the main API server.

## Architecture

1.  **Producer (Backend)**: The Express API server adds jobs to the queue.
2.  **Queue (Redis)**: Stores the jobs and manages their state (waiting, active, completed, failed).
3.  **Consumer (Worker)**: A separate Node.js process listens for new jobs and executes them.

## Code Usage

### 1. Configuration (`src/config/queue.js`)

The queue is configured to connect to the Redis instance defined by `REDIS_HOST`.

```javascript
const Queue = require('bull');

const queueConfig = {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
    }
};

const agentQueue = new Queue('agent-tasks', queueConfig);

module.exports = { agentQueue };
```

### 2. Producer (`server.js`)

To add a job to the queue, import the queue instance and call `.add()`.

```javascript
const { agentQueue } = require('./src/config/queue');

// Example: Adding a job via an API endpoint
app.post('/api/jobs', async (req, res) => {
    try {
        const job = await agentQueue.add({
            type: 'agent-task',
            payload: req.body // Data passed to the worker
        });
        res.json({ id: job.id, message: 'Job added to queue' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add job to queue' });
    }
});
```

### 3. Consumer / Worker (`src/worker.js`)

The worker process defines how to handle the jobs.

```javascript
const { agentQueue } = require('./config/queue');

agentQueue.process(async (job) => {
    console.log(`Processing job ${job.id} with data:`, job.data);
    
    // Perform the background task here
    // ...
    
    return { result: 'Success' };
});
```

## Usage via API

You can trigger a background task by sending a POST request to the API.

### Using cURL

```bash
curl -X POST \
  http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"task": "generate-report", "params": {"id": 123}}'
```

**Note:** If you are running this from a Windows PowerShell terminal, you may need to escape the JSON or use a file:

```powershell
# Create a payload file
echo '{"task": "generate-report"}' > job.json

# Send request
curl -X POST -H "Content-Type: application/json" -d @job.json http://localhost:3000/api/jobs
```
