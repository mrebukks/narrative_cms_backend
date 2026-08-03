const bcrypt = require("bcrypt");
const { DataTypes } = require("sequelize");
const sequelize = require("../utility/sequelize");
const { Hooks } = require("sequelize/lib/hooks");

const User = sequelize.define(
  "User",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Example Sequelize User definition snippet:
    role: {
      type: DataTypes.ENUM("admin", "editor", "author"),
      defaultValue: "author",
    },

    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },

    token: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    tokenExpires: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    hooks: {
      // this runs automatically right before a record is saved in mysql.
      beforeCreate: async (user) => {
        if (user.password) {
          // Generate a secure salt (essentially random data added to make the hash unique)
          const salt = await bcrypt.genSalt(10);

          // Turn the plain text password into an unreadable hash
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  },
);

module.exports = User;
