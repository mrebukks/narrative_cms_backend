require("dotenv").config();
const express = require("express");

const myRouter = require("./routes");
const sequelize = require("./utility/sequelize");
// const post = require("./model/post");
// const user = require("./model/user");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const authRoutes = require("./authRoutes");
const { User, Post } = require("./associations");
const cookieParser = require("cookie-parser");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://127.0.0.1:5500",
    credentials: true,
  }),
); // Allows your Netlify frontend to talk to this backend
app.use(express.json());
app.use(cookieParser());

// 🔓 Static Folder: This makes our uploads folder publicly accessible via URL
// E.g., http://localhost:7000/uploads/image.jpg will show the picture!
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res, next) => {
  res.send("Port 7000 is working perfectly.");
});

app.use(myRouter);
app.use(authRoutes);

const PORT = process.env.PORT || 7000;

async function startServer() {
  try {
    // .sync() looks at our models and automatically creates the tables in MySQL
    // { alter: true } updates the table safely if we make changes later
    await sequelize.sync();
    console.log("🧱 The Posts table has been successfully created in MySQL!");

    app.listen(PORT, () => {
      console.log("port now running on 7000");
    });
  } catch (error) {
    console.error("⛔ failed to sync", error);
  }
}

startServer();
