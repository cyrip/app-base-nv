const jwt = require('jsonwebtoken');
const { User, Role, Group } = require('../models');
const verifyToken = require('../middleware/auth');

// Mock request and response objects
const mockRequest = (headers = {}) => ({
    headers
});

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

describe('Auth Middleware', () => {
    let user;
    let adminRole;
    let token;

    beforeAll(async () => {
        const { sequelize } = require('../models');

        // Ensure database is synced
        await sequelize.sync({ alter: true });
    });

    beforeEach(async () => {
        // Create test user and role for each test
        user = await User.create({
            email: `test-${Date.now()}@example.com`,
            password: 'hashedpassword'
        });

        adminRole = await Role.findOne({ where: { name: 'admin' } });
        if (!adminRole) {
            adminRole = await Role.create({
                name: 'admin',
                description: 'Administrator'
            });
        }

        await user.addRole(adminRole);

        // Generate token
        token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    });

    afterAll(async () => {
        const { sequelize } = require('../models');
        await sequelize.close();
    });

    afterEach(() => {
        // Clear mock calls between tests
        jest.clearAllMocks();
    });

    describe('verifyToken', () => {
        it('should reject request without token', async () => {
            const req = mockRequest({});
            const res = mockResponse();
            const localMockNext = jest.fn();

            await verifyToken(req, res, localMockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
            expect(localMockNext).not.toHaveBeenCalled();
        });

        it('should reject request with invalid token', async () => {
            const req = mockRequest({
                authorization: 'Bearer invalid-token'
            });
            const res = mockResponse();
            const localMockNext = jest.fn();

            await verifyToken(req, res, localMockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: 'Failed to authenticate token' });
            expect(localMockNext).not.toHaveBeenCalled();
        });

        it('should accept request with valid token', async () => {
            const req = mockRequest({
                authorization: `Bearer ${token}`
            });
            const res = mockResponse();
            const localMockNext = jest.fn();

            await verifyToken(req, res, localMockNext);

            expect(req.user).toBeDefined();
            expect(req.user.id).toBe(user.id);
            expect(req.user.email).toBe(user.email);
            expect(localMockNext).toHaveBeenCalled();
        });

        it('should load user roles and groups', async () => {
            const req = mockRequest({
                authorization: `Bearer ${token}`
            });
            const res = mockResponse();
            const localMockNext = jest.fn();

            await verifyToken(req, res, localMockNext);

            expect(req.user.Roles).toBeDefined();
            expect(req.user.Roles).toHaveLength(1);
            expect(req.user.Roles[0].name).toBe('admin');
        });
    });

    describe('requireRole middleware', () => {
        const { requireRole } = require('../middleware/auth');

        it('should allow access with correct role', async () => {
            const localMockNext = jest.fn();
            const req = mockRequest({
                authorization: `Bearer ${token}`
            });
            const res = mockResponse();

            // First verify token
            await verifyToken(req, res, localMockNext);
            expect(localMockNext).toHaveBeenCalledTimes(1);

            // Then check role - requireRole should call next() if role matches
            const roleMiddleware = requireRole('admin');
            await roleMiddleware(req, res, localMockNext);

            // Verify next was called (no error response)
            expect(res.status).not.toHaveBeenCalled();
            expect(localMockNext).toHaveBeenCalledTimes(2);
        });

        it('should deny access without correct role', async () => {
            const localMockNext = jest.fn();
            const req = mockRequest({
                authorization: `Bearer ${token}`
            });
            const res = mockResponse();

            await verifyToken(req, res, localMockNext);

            const roleMiddleware = requireRole('superadmin');
            const res2 = mockResponse(); // New response for role check
            await roleMiddleware(req, res2, localMockNext);

            expect(res2.status).toHaveBeenCalledWith(403);
            expect(res2.json).toHaveBeenCalledWith({ message: 'Requires superadmin role' });
        });
    });
});
