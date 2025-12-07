const { sequelize, Role, Permission } = require('../models');

async function seedPermissions() {
    try {
        console.log('Starting permissions seeding...');

        // Define permissions
        const permissions = [
            { name: 'user.view', description: 'View users' },
            { name: 'user.create', description: 'Create users' },
            { name: 'user.edit', description: 'Edit users' },
            { name: 'user.delete', description: 'Delete users' },
            { name: 'role.manage', description: 'Manage roles' },
            { name: 'group.manage', description: 'Manage groups' },
            { name: 'permission.manage', description: 'Manage permissions' },
            { name: 'module.manage', description: 'Manage application modules' },
            { name: 'chat.use', description: 'Use chat module' },
            { name: 'profile.view', description: 'View profile module' },
            { name: 'theme.manage', description: 'Manage themes' }
        ];

        // Create permissions
        for (const perm of permissions) {
            const [permission, created] = await Permission.findOrCreate({
                where: { name: perm.name },
                defaults: perm
            });
            console.log(`${created ? 'Created' : 'Found'} permission: ${perm.name}`);
        }

        // Get roles
        const adminRole = await Role.findOne({ where: { name: 'admin' } });
        const userRole = await Role.findOne({ where: { name: 'user' } });

        if (!adminRole || !userRole) {
            console.error('Admin or user role not found. Please run role migration first.');
            return;
        }

        // Assign all permissions to admin role
        const allPermissions = await Permission.findAll();
        await adminRole.setPermissions(allPermissions);
        console.log(`Assigned ${allPermissions.length} permissions to admin role`);

        // Assign limited set to user role
        const userPerms = await Permission.findAll({
            where: {
                name: ['user.view', 'chat.use', 'profile.view']
            }
        });
        await userRole.setPermissions(userPerms);
        console.log(`Assigned ${userPerms.length} permissions to user role`);

        // Clean up deprecated moduleadmin.admin permission if it exists
        await Permission.destroy({ where: { name: 'moduleadmin.admin' } });

        console.log('Permissions seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding permissions:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    seedPermissions()
        .then(() => sequelize.close())
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = seedPermissions;
