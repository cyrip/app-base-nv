const { Language } = require('../models');

const languages = [
    { id: 1, code: 'en', name: 'English', description: 'English' },
    { id: 2, code: 'hu', name: 'Hungarian', description: 'Hungarian' },
    { id: 3, code: 'de', name: 'German', description: 'German' },
    { id: 4, code: 'es', name: 'Spanish', description: 'Spanish' }
];

const seedLanguages = async () => {
    for (const lang of languages) {
        await Language.upsert(lang);
    }
};

module.exports = seedLanguages;
