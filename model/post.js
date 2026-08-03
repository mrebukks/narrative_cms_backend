const { DataTypes } = require("sequelize");
const sequelize = require("../utility/sequelize"); // Import our connection from step 1

// Define the blueprint for a blog post
const Post = sequelize.define("Post", {
  // Sequelize automatically creates an 'id' field for us, so we don't need to add it here!
  title: {
    type: DataTypes.STRING,
    allowNull: false, // This means a post MUST have a title; it can't be empty
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false, // A post MUST have body text too
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true, // We make it true so older posts without images don't break
  },
  
  author: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Post;
