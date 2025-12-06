const io = require('socket.io-client');
const http = require('http');

// Helper to login and get token
const login = () => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const body = JSON.parse(data);
                    resolve(body.token);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify({
            email: 'admin@codeware.cc',
            password: 'password'
        }));
        req.end();
    });
};

// Helper to trigger job
const triggerJob = (token) => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/jobs',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, (res) => {
            resolve();
        });

        req.on('error', reject);
        req.write(JSON.stringify({ task: 'socket-test-job' }));
        req.end();
    });
};

const runTest = async () => {
    try {
        console.log('Logging in...');
        const token = await login();
        console.log('Got token:', token ? 'Yes' : 'No');

        console.log('Connecting to socket...');
        const socket = io('http://localhost:3000', {
            auth: { token }
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);

            // Trigger job after connection
            console.log('Triggering job...');
            triggerJob(token);
        });

        socket.on('job-created', (data) => {
            console.log('Received job-created event:', data);
            if (data.task === 'socket-test-job') {
                console.log('Test PASSED');
                socket.disconnect();
                process.exit(0);
            }
        });

        socket.on('connect_error', (err) => {
            console.error('Connection error:', err.message);
            process.exit(1);
        });

        // Timeout
        setTimeout(() => {
            console.error('Test Timed Out');
            process.exit(1);
        }, 5000);

    } catch (error) {
        console.error('Test Failed:', error);
        process.exit(1);
    }
};

runTest();
