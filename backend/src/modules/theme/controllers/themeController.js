const Theme = require('../models/Theme');

class ThemeController {
    async list(req, res) {
        try {
            const themes = await Theme.findAll();
            res.json(themes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async activate(req, res) {
        try {
            const { id } = req.params;
            const theme = await Theme.findByPk(id);
            if (!theme) {
                return res.status(404).json({ message: 'Theme not found' });
            }
            await Theme.update({ isActive: false }, { where: {} });
            theme.isActive = true;
            await theme.save();
            res.json(theme);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ThemeController();
