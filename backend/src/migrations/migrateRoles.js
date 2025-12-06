const { sequelize, User, Role } = require('../models');

async function migrateRoles() {
    try {
        console.log('Starting role migration...');

        // Create default roles
        const [adminRole] = await Role.findOrCreate({
            where: { name: 'admin' },
            defaults: { description: 'Administrator with full access' }
        });

        const [userRole] = await Role.findOrCreate({
            where: { name: 'user' },
            defaults: { description: 'Regular user' }
        });

        console.log('Default roles created');

        // Check if role column exists
        const tableInfo = await sequelize.queryInterface.describeTable('Users');
        if (!tableInfo.role) {
            console.log('Role column already removed, skipping migration');
            return;
        }

        // Get all users with their old role data
        const users = await sequelize.query(
            'SELECT id, role FROM Users WHERE role IS NOT NULL',
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log(`Found ${users.length} users to migrate`);

        // Assign roles based on old role column
        for (const user of users) {
            const userInstance = await User.findByPk(user.id);
            if (user.role === 'admin') {
                await userInstance.addRole(adminRole);
                console.log(`Assigned admin role to user ${user.id}`);
            } else {
                await userInstance.addRole(userRole);
                console.log(`Assigned user role to user ${user.id}`);
            }
        }

        console.log('Role migration completed successfully');
    } catch (error) {
        console.error('Error during role migration:', error);
        throw error;
    }
}

module.exports = migrateRoles;
