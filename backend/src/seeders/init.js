const bcrypt = require('bcryptjs');
const { User, Role } = require('../models');
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
            }
        ];

        const adminRole = await Role.findOne({ where: { name: 'admin' } });
        const userRole = await Role.findOne({ where: { name: 'user' } });

        for (const user of users) {
            const existingUser = await User.findOne({ where: { email: user.email } });
            if (!existingUser) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                const createdUser = await User.create({
                    email: user.email,
                    password: hashedPassword,
                    languageId: defaultLanguageId
                });
                // Assign role
                if (user.role === 'admin' && adminRole) {
                    await createdUser.addRole(adminRole);
                } else if (userRole) {
                    await createdUser.addRole(userRole);
                }
                console.log(`User ${user.email} created.`);
            } else if (!existingUser.languageId && defaultLanguageId) {
                existingUser.languageId = defaultLanguageId;
                await existingUser.save();
                console.log(`User ${user.email} language set to default.`);
                if (!(await existingUser.getRoles()).length) {
                    if (user.role === 'admin' && adminRole) {
                        await existingUser.addRole(adminRole);
                    } else if (userRole) {
                        await existingUser.addRole(userRole);
                    }
                }
            } else {
                console.log(`User ${user.email} already exists.`);
            }
        }
        // Ensure role assignments for known users
        const adminUser = await User.findOne({ where: { email: 'admin@codeware.cc' } });
        if (adminUser && adminRole) {
            await adminUser.setRoles([adminRole]);
            console.log('Ensured admin role assigned to admin@codeware.cc');
        }
        const basicUser = await User.findOne({ where: { email: 'user@codeware.cc' } });
        if (basicUser && userRole) {
            await basicUser.setRoles([userRole]);
            console.log('Ensured user role assigned to user@codeware.cc');
        }
        console.log('Seeding complete.');
    } catch (error) {
        console.error('Seeding failed:', error);
    }
};

module.exports = seedUsers;
