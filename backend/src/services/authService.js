const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getDefaultLanguage } = require('./languageService');

class AuthService {
    async register(email, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const defaultLanguage = await getDefaultLanguage();
        const user = await User.create({ email, password: hashedPassword, languageId: defaultLanguage?.id });
        return { id: user.id, email: user.email };
    }

    async login(email, password) {
        const { User, Role, Language, Permission } = require('../models');
        const user = await User.findOne({
            where: { email, isDeleted: false },
            include: [{
                model: Role,
                through: { attributes: [] },
                attributes: ['id', 'name'],
                include: [{ model: Permission, through: { attributes: [] }, attributes: ['id', 'name'] }]
            }, {
                model: Language,
                as: 'Language',
                attributes: ['id', 'code', 'name']
            }]
        });
        if (!user) {
            throw new Error('User not found');
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            throw new Error('Invalid password');
        }

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                Roles: user.Roles,
                Language: user.Language
            }
        };
    }
}

module.exports = new AuthService();
