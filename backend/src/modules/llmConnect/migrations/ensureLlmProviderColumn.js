const { sequelize } = require('../../../models');

module.exports = async function ensureLlmProviderColumn() {
    const [results] = await sequelize.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Agents' AND COLUMN_NAME = 'provider' AND TABLE_SCHEMA = DATABASE();
    `);

    if (results.length === 0) {
        try {
            await sequelize.query(`
                ALTER TABLE Agents
                ADD COLUMN provider VARCHAR(64) NOT NULL DEFAULT 'chatgpt'
                AFTER instructions;
            `);
            console.log('Added provider column to Agents table');
        } catch (err) {
            console.error('Failed to add provider column:', err.message);
        }
    }
};
