# Backend Testing

This document explains the testing setup for the backend application.

## Test Database

Tests run on a **separate test database** to avoid interfering with development data.

### Database Configuration

- **Development DB**: `agent_db`
- **Test DB**: `test_agent_db`

The database configuration (`src/config/database.js`) automatically switches to the test database when `NODE_ENV=test`.

### How It Works

1. When tests run, `NODE_ENV` is set to `test` in `src/__tests__/setup.js`
2. The database config detects this and connects to `test_agent_db` instead of `agent_db`
3. Each test file syncs the database with `{ force: true }`, creating a clean slate
4. After tests complete, the test database remains but can be safely dropped

### Creating the Test Database

The test database will be created automatically when you first run tests. If you need to create it manually:

```sql
CREATE DATABASE test_agent_db;
```

Or using Docker:

```bash
docker compose exec db mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS test_agent_db;"
```

## Running Tests

### Run all tests with coverage
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run specific test file
```bash
npm test -- models.test.js
```

## Test Structure

```
backend/
├── jest.config.js              # Jest configuration
├── src/
│   └── __tests__/
│       ├── setup.js            # Test environment setup
│       ├── models.test.js      # Model tests
│       └── auth.middleware.test.js  # Auth middleware tests
```

## Test Coverage

The test suite covers:

- ✅ User, Role, Group, Permission models
- ✅ Model validations and constraints
- ✅ Many-to-many associations
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Permission checking

Coverage thresholds are set to 70% for branches, functions, lines, and statements.

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Use `afterEach` to clean up test data
3. **Descriptive Names**: Test names should clearly describe what they're testing
4. **Arrange-Act-Assert**: Follow the AAA pattern in tests
