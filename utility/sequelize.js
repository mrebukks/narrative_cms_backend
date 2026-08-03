const Sequelize = require("sequelize");

// Replace 'root' and 'your_password' with your actual MySQL credentials!
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
  },
);

// Test the connection using async/await
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("👶 Success! We successfully connected to the database.");
  } catch (error) {
    console.error("❌ Oh no! Unable to connect to the database:", error);
  }
}

testConnection();

module.exports = sequelize;
