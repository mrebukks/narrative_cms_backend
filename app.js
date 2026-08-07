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
const { dir } = require("console");

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
); // Allows your Netlify frontend to talk to this backend
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// 🔓 Static Folder: This makes our uploads folder publicly accessible via URL
// E.g., http://localhost:7000/uploads/image.jpg will show the picture!
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res, next) => {
  res.send("Port 7000 is working perfectly.");
});

app.use(myRouter);
app.use(authRoutes);

// fall back route for any url that did not exist.

// Matches any undefined route for any HTTP method
app.all(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 7000;

async function startServer() {
  try {
    // .sync() looks at our models and automatically creates the tables in MySQL
    // { alter: true } updates the table safely if we make changes later
    await sequelize.sync({ alter: true });
    console.log("🧱 The Posts table has been successfully created in MySQL!");

    app.listen(PORT, () => {
      console.log("port now running on 7000");
    });
  } catch (error) {
    console.error("⛔ failed to sync", error);
  }
}

startServer();
