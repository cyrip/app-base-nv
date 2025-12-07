module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Messages', 'fromUserId', {
      type: Sequelize.INTEGER,
      allowNull: true // Allow null for system messages
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Messages', 'fromUserId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};
