const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seedUsers = async () => {
    try {
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

        for (const user of users) {
            const existingUser = await User.findOne({ where: { email: user.email } });
            if (!existingUser) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await User.create({
                    email: user.email,
                    password: hashedPassword
                });
                console.log(`User ${user.email} created.`);
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
