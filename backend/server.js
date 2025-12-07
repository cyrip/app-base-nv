require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 3000;

const seedUsers = require('./src/seeders/init.js');
const seedLanguages = require('./src/seeders/languageSeeder');
const seedPermissions = require('./src/seeders/permissions-seeder');
const seedModules = require('./src/modules/moduleAdmin/seeders/moduleSeeder');
require('./src/helpers/authHelpers'); // Load User helper methods

const http = require('http');
const socketService = require('./src/modules/chat/services/socketService');

// Database sync and server start
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        await sequelize.sync({ force: false });
        console.log('Database synced');

        // Ensure languageId column exists
        const ensureLanguageColumn = require('./src/migrations/addLanguageColumn');
        await ensureLanguageColumn();
        // Ensure message schema
        const ensureMessageSchema = require('./src/modules/chat/migrations/ensureMessageSchema');
        await ensureMessageSchema();
        // Ensure user soft delete column
        const ensureUserSoftDelete = require('./src/migrations/ensureUserSoftDelete');
        await ensureUserSoftDelete();

        // Run role migration
        const migrateRoles = require('./src/migrations/migrateRoles');
        await migrateRoles();

        // Run seeders (languages, users rely on roles existing)
        await seedLanguages();
        await seedUsers();

        // Seed permissions and modules
        await seedPermissions();
        await seedModules();

        // Drop old role column if it exists
        try {
            await sequelize.queryInterface.removeColumn('Users', 'role');
            console.log('Old role column removed');
        } catch (error) {
            // Column might already be removed
            console.log('Role column already removed or does not exist');
        }

        // Initialize Queue
        const { agentQueue } = require('./src/config/queue');

        // Create HTTP server
        const server = http.createServer(app);

        // Initialize Socket.io
        socketService.init(server);

        app.post('/api/jobs', async (req, res) => {
            try {
                const job = await agentQueue.add({
                    type: 'agent-task',
                    payload: req.body
                });

                // Broadcast job creation
                socketService.broadcast('job-created', { jobId: job.id, task: req.body.task });

                res.json({ id: job.id, message: 'Job added to queue' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to add job to queue' });
            }
        });

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        console.log('Retrying in 5 seconds...');
        setTimeout(startServer, 5000);
    }
};

startServer();
