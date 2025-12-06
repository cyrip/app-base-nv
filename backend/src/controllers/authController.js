const authService = require('../services/authService');

class AuthController {
    async register(req, res) {
        try {
            const { email, password } = req.body;
            const result = await authService.register(email, password);
            res.status(201).json({ message: 'User created', userId: result.id });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            res.json(result);
        } catch (error) {
            if (error.message === 'User not found' || error.message === 'Invalid password') {
                res.status(401).json({ message: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    }
}

module.exports = new AuthController();
