// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_NAME = 'test_agent_db';
process.env.DB_HOST = process.env.DB_HOST || 'db';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASS = process.env.DB_PASS || 'rootpassword';

// Increase timeout for database operations
jest.setTimeout(10000);

const sequelize = require('../config/database');

// Sync database before all tests
beforeAll(async () => {
  await sequelize.sync({ alter: true });
});

// Clean up database before each test file
beforeEach(async () => {
  // Truncate all tables in reverse order to avoid foreign key constraints
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  
  const tables = [
    'ChannelSessionKeys',
    'UserPublicKeys',
    'Messages',
    'ChannelParticipants',
    'Channels',
    'Users'
  ];
  
  for (const table of tables) {
    try {
      await sequelize.query(`TRUNCATE TABLE ${table}`);
    } catch (e) {
      // Table might not exist yet, ignore
    }
  }
  
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
});

// Close database connection after all tests
afterAll(async () => {
  await sequelize.close();
});
