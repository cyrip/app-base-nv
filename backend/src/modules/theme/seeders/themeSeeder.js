const Theme = require('../models/Theme');

const DEFAULT_THEMES = [
    {
        key: 'dark',
        name: 'Dark',
        isActive: true,
        config: {
            '--bg': '#0a0a1f',
            '--text': '#f5f7ff',
            '--primary': '#38bdf8',
            '--accent': '#a855f7'
        }
    },
    {
        key: 'light',
        name: 'Light',
        isActive: false,
        config: {
            '--bg': '#f2f4f7',
            '--text': '#0b1324',
            '--primary': '#1d4ed8',
            '--accent': '#7c3aed'
        }
    }
];

async function seedThemes() {
    for (const theme of DEFAULT_THEMES) {
        const [record] = await Theme.findOrCreate({
            where: { key: theme.key },
            defaults: theme
        });
        if (theme.isActive) {
            await Theme.update({ isActive: false }, { where: { key: { [require('sequelize').Op.ne]: theme.key } } });
            record.isActive = true;
        }
        record.config = theme.config;
        await record.save();
    }
    console.log('Themes seeded');
}

module.exports = seedThemes;
