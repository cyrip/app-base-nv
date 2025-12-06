module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/seeders/**',
        '!src/migrations/**',
        '!src/worker.js'
    ],
    testMatch: [
        '**/__tests__/**/*.test.js',
        '**/?(*.)+(spec|test).js'
    ],
    coverageThreshold: {
        global: {
            branches: 20,
            functions: 20,
            lines: 20,
            statements: 20
        }
    },
    testTimeout: 10000,
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
    maxWorkers: 1 // Run tests sequentially
};
