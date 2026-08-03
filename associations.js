const User = require("./model/user");
const Post = require("./model/post");

// Defining the Relationships

User.hasMany(Post, {
  foreignKey: "userId",
  onDelete: "CASCADE",
});

// 2. A Post belongs to one User
Post.belongsTo(User, {
  foreignKey: "userId",
});

module.exports = { User, Post };
