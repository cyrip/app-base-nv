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

        // Assign only user.view to user role
        const viewPermission = await Permission.findOne({ where: { name: 'user.view' } });
        await userRole.setPermissions([viewPermission]);
        console.log('Assigned user.view permission to user role');

        console.log('Permissions seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding permissions:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run if called directly
if (require.main === module) {
    seedPermissions()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = seedPermissions;
