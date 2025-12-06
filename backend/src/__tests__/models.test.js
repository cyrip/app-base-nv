const { sequelize, User, Role, Group, Permission } = require('../models');

describe('Authorization Models', () => {
    beforeAll(async () => {
        // Sync database
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    afterEach(async () => {
        // Clean up after each test - delete all records
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        await User.destroy({ where: {}, force: true });
        await Role.destroy({ where: {}, force: true });
        await Group.destroy({ where: {}, force: true });
        await Permission.destroy({ where: {}, force: true });
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    describe('User Model', () => {
        it('should create a user', async () => {
            const user = await User.create({
                email: 'test@example.com',
                password: 'hashedpassword'
            });

            expect(user.id).toBeDefined();
            expect(user.email).toBe('test@example.com');
        });

        it('should enforce unique email', async () => {
            await User.create({
                email: 'test@example.com',
                password: 'hashedpassword'
            });

            await expect(
                User.create({
                    email: 'test@example.com',
                    password: 'anotherpassword'
                })
            ).rejects.toThrow();
        });

        it('should validate email format', async () => {
            await expect(
                User.create({
                    email: 'invalid-email',
                    password: 'hashedpassword'
                })
            ).rejects.toThrow();
        });
    });

    describe('Role Model', () => {
        it('should create a role', async () => {
            const role = await Role.create({
                name: 'admin',
                description: 'Administrator'
            });

            expect(role.id).toBeDefined();
            expect(role.name).toBe('admin');
        });

        it('should enforce unique role name', async () => {
            await Role.create({ name: 'admin' });

            await expect(
                Role.create({ name: 'admin' })
            ).rejects.toThrow();
        });
    });

    describe('Group Model', () => {
        it('should create a group', async () => {
            const group = await Group.create({
                name: 'Engineering',
                description: 'Engineering team'
            });

            expect(group.id).toBeDefined();
            expect(group.name).toBe('Engineering');
        });
    });

    describe('Permission Model', () => {
        it('should create a permission', async () => {
            const permission = await Permission.create({
                name: 'user.create',
                description: 'Create users'
            });

            expect(permission.id).toBeDefined();
            expect(permission.name).toBe('user.create');
        });
    });

    describe('User-Role Association', () => {
        it('should assign role to user', async () => {
            const user = await User.create({
                email: 'test@example.com',
                password: 'hashedpassword'
            });

            const role = await Role.create({
                name: 'admin',
                description: 'Administrator'
            });

            await user.addRole(role);

            const roles = await user.getRoles();
            expect(roles).toHaveLength(1);
            expect(roles[0].name).toBe('admin');
        });

        it('should assign multiple roles to user', async () => {
            const user = await User.create({
                email: 'test@example.com',
                password: 'hashedpassword'
            });

            const adminRole = await Role.create({ name: 'admin' });
            const editorRole = await Role.create({ name: 'editor' });

            await user.addRoles([adminRole, editorRole]);

            const roles = await user.getRoles();
            expect(roles).toHaveLength(2);
        });
    });

    describe('User-Group Association', () => {
        it('should assign group to user', async () => {
            const user = await User.create({
                email: 'test@example.com',
                password: 'hashedpassword'
            });

            const group = await Group.create({
                name: 'Engineering'
            });

            await user.addGroup(group);

            const groups = await user.getGroups();
            expect(groups).toHaveLength(1);
            expect(groups[0].name).toBe('Engineering');
        });
    });

    describe('Role-Permission Association', () => {
        it('should assign permission to role', async () => {
            const role = await Role.create({ name: 'admin' });
            const permission = await Permission.create({ name: 'user.create' });

            await role.addPermission(permission);

            const permissions = await role.getPermissions();
            expect(permissions).toHaveLength(1);
            expect(permissions[0].name).toBe('user.create');
        });

        it('should assign multiple permissions to role', async () => {
            const role = await Role.create({ name: 'admin' });
            const perm1 = await Permission.create({ name: 'user.create' });
            const perm2 = await Permission.create({ name: 'user.delete' });

            await role.addPermissions([perm1, perm2]);

            const permissions = await role.getPermissions();
            expect(permissions).toHaveLength(2);
        });
    });
});
