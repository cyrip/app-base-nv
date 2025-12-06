const languageService = require('../services/languageService');

class LanguageController {
    async list(req, res) {
        try {
            const languages = await languageService.listLanguages();
            res.json(languages);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new LanguageController();
