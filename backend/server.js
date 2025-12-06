require('dotenv').config();
const app = require('./src/app');
const sequelize = require('./src/config/database');

const PORT = process.env.PORT || 3000;

const seedUsers = require('./src/seeders/init.js');

// Database sync and server start
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        await sequelize.sync({ force: false });
        console.log('Database synced');

        // Run seeders
        await seedUsers();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        console.log('Retrying in 5 seconds...');
        setTimeout(startServer, 5000);
    }
};

startServer();
