const { Op } = require('sequelize');
const { sequelize, Module, ModuleSetting, Permission } = require('../../../models');

const DEFAULT_MODULES = [
    { key: 'modules', name: 'ModuleAdmin', description: 'Manage modules and their settings', enabled: true },
    { key: 'chat', name: 'Chat', description: 'Team chat', enabled: true },
    { key: 'profile', name: 'Profile', description: 'User profile', enabled: true },
];

async function seedModules() {
    try {
        for (const mod of DEFAULT_MODULES) {
            // Force enabled true on seed to guarantee availability
            await Module.upsert({ ...mod, enabled: true });
        }

        // Example default setting
        const chatModule = await Module.findOne({ where: { key: 'chat' } });
        if (chatModule) {
            await ModuleSetting.findOrCreate({
                where: { moduleId: chatModule.id, key: 'allowUploads' },
                defaults: { value: 'true' },
            });
            const chatPerm = await Permission.findOne({ where: { name: 'chat.use' } });
            if (chatPerm) {
                await chatModule.addPermission(chatPerm);
            }
        }

        const profileModule = await Module.findOne({ where: { key: 'profile' } });
        if (profileModule) {
            const profilePerm = await Permission.findOne({ where: { name: 'profile.view' } });
            if (profilePerm) {
                await profileModule.addPermission(profilePerm);
            }
        }

        const moduleAdmin = await Module.findOne({ where: { key: 'modules' } });
        if (moduleAdmin) {
            const managePerm = await Permission.findOne({ where: { name: 'module.manage' } });
            const adminPerm = await Permission.findOne({ where: { name: 'moduleadmin.admin' } });
            const permsToAdd = [managePerm, adminPerm].filter(Boolean);
            if (permsToAdd.length) {
                await moduleAdmin.addPermissions(permsToAdd);
            }
        }

        // Remove modules not in the default list to keep the set clean
        const keys = DEFAULT_MODULES.map((m) => m.key);
        await Module.destroy({
            where: {
                key: { [Op.notIn]: keys }
            }
        });

        console.log('Modules seeding completed');
    } catch (error) {
        console.error('Error seeding modules:', error);
        throw error;
    }
}

if (require.main === module) {
    seedModules()
        .then(() => sequelize.close())
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = seedModules;
