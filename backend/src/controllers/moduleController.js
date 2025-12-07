const { Module, ModuleSetting } = require('../models');

class ModuleController {
    async list(req, res) {
        try {
            const modules = await Module.findAll({
                include: [
                    { model: ModuleSetting, as: 'Settings' },
                    { model: require('../models').Permission, as: 'Permissions' }
                ]
            });
            res.json(modules);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { enabled, settings, permissions } = req.body;

            const module = await Module.findByPk(id);
            if (!module) {
                return res.status(404).json({ message: 'Module not found' });
            }

            if (typeof enabled === 'boolean') {
                module.enabled = enabled;
            }
            await module.save();

            if (Array.isArray(settings)) {
                for (const entry of settings) {
                    if (!entry?.key) continue;
                    const [setting] = await ModuleSetting.findOrCreate({
                        where: { moduleId: module.id, key: entry.key },
                        defaults: { value: entry.value }
                    });
                    setting.value = entry.value;
                    await setting.save();
                }
            }

            if (Array.isArray(permissions)) {
                const { Permission } = require('../models');
                const perms = await Permission.findAll({ where: { name: permissions } });
                await module.setPermissions(perms);
            }

            const withSettings = await Module.findByPk(module.id, {
                include: [
                    { model: ModuleSetting, as: 'Settings' },
                    { model: require('../models').Permission, as: 'Permissions' }
                ]
            });
            res.json(withSettings);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ModuleController();
