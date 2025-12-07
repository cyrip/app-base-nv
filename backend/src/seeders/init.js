const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { getDefaultLanguage } = require('../services/languageService');

const seedUsers = async () => {
    try {
        const defaultLanguage = await getDefaultLanguage();
        const defaultLanguageId = defaultLanguage?.id || null;

        const users = [
            {
                email: 'admin@codeware.cc',
                password: 'password',
                role: 'admin'
            },
            {
                email: 'user@codeware.cc',
                password: 'password',
                role: 'user'
            },
            {
                email: 'partner@codeware.cc',
                password: 'password',
                role: 'user'
            }
        ];

        for (const user of users) {
            const existingUser = await User.findOne({ where: { email: user.email } });
            if (!existingUser) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await User.create({
                    email: user.email,
                    password: hashedPassword,
                    languageId: defaultLanguageId
                });
                console.log(`User ${user.email} created.`);
            } else if (!existingUser.languageId && defaultLanguageId) {
                existingUser.languageId = defaultLanguageId;
                await existingUser.save();
                console.log(`User ${user.email} language set to default.`);
            } else {
                console.log(`User ${user.email} already exists.`);
            }
        }
        console.log('Seeding complete.');
    } catch (error) {
        console.error('Seeding failed:', error);
    }
};

module.exports = seedUsers;
