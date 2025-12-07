require('dotenv').config();
const { sequelize } = require('./src/models');
const seedUsers = require('./src/seeders/init.js');
const seedLanguages = require('./src/seeders/languageSeeder');

const resetDatabase = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        console.log('🗑️  Dropping all tables...');
        await sequelize.drop();
        console.log('✅ All tables dropped');

        console.log('🔨 Creating tables with force sync...');
        await sequelize.sync({ force: true });
        console.log('✅ Tables created');

        console.log('🔧 Running migrations...');
        
        // Run all migrations
        const ensureLanguageColumn = require('./src/migrations/addLanguageColumn');
        await ensureLanguageColumn();
        
        const ensureMessageSchema = require('./src/migrations/ensureMessageSchema');
        await ensureMessageSchema();
        
        const ensureUserSoftDelete = require('./src/migrations/ensureUserSoftDelete');
        await ensureUserSoftDelete();

        // Run encryption migrations
        const addChannelEncryption = require('./src/migrations/addChannelEncryption');
        await addChannelEncryption();
        
        const addMessageEncryption = require('./src/migrations/addMessageEncryption');
        await addMessageEncryption();
        
        const createUserPublicKeys = require('./src/migrations/createUserPublicKeys');
        await createUserPublicKeys();
        
        const createChannelSessionKeys = require('./src/migrations/createChannelSessionKeys');
        await createChannelSessionKeys();
        
        const allowNullFromUserId = require('./src/migrations/allowNullFromUserId');
        await allowNullFromUserId.up(sequelize.getQueryInterface(), sequelize.Sequelize);

        console.log('✅ Migrations completed');

        console.log('🌱 Running seeders...');
        
        // Run seeders
        await seedLanguages();
        await seedUsers();

        // Run role migration
        const migrateRoles = require('./src/migrations/migrateRoles');
        await migrateRoles();

        console.log('✅ Seeders completed');

        console.log('🎉 Database reset complete!');
        console.log('\nDefault users created:');
        console.log('  - admin@codeware.cc / password');
        console.log('  - user@codeware.cc / password');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Database reset failed:', error);
        process.exit(1);
    }
};

resetDatabase();
