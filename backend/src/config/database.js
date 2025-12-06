const { Sequelize } = require('sequelize');

// Use test database when NODE_ENV is 'test'
const dbName = process.env.NODE_ENV === 'test'
    ? 'test_agent_db'
    : (process.env.DB_NAME || 'agent_db');

const sequelize = new Sequelize(
    dbName,
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'password',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'test' ? false : console.log, // Disable logging in tests
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Wait for database to be ready
const connectWithRetry = async (retries = 5, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.authenticate();
            console.log('Database connection established successfully.');
            return;
        } catch (error) {
            console.log(`Database connection attempt ${i + 1} failed. Retrying in ${delay}ms...`);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// Only retry in non-test environments
if (process.env.NODE_ENV !== 'test') {
    connectWithRetry().catch(err => {
        console.error('Unable to connect to the database after retries:', err);
        process.exit(1);
    });
}

module.exports = sequelize;
