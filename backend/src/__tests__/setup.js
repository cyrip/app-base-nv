// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_NAME = 'test_agent_db';
process.env.DB_HOST = process.env.DB_HOST || 'db';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASS = process.env.DB_PASS || 'rootpassword';

// Increase timeout for database operations
jest.setTimeout(10000);
