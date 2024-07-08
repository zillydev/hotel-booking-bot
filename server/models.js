const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'chat_history.sqlite'
});

const ChatHistory = sequelize.define('ChatHistory', {
  role: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});

module.exports = {
  sequelize,
  ChatHistory
};
