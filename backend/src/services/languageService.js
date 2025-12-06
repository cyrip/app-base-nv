const { Language } = require('../models');

const getDefaultLanguageCode = () => process.env.APP_LANGUAGE || 'en';

const getDefaultLanguage = async () => {
    const code = getDefaultLanguageCode();
    const language = await Language.findOne({ where: { code } });
    if (language) return language;
    return Language.findOne({ order: [['id', 'ASC']] });
};

const listLanguages = async () => {
    return Language.findAll({ order: [['id', 'ASC']] });
};

module.exports = {
    getDefaultLanguage,
    listLanguages
};
