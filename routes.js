const express = require("express");
const Post = require("./model/post");
const User = require("./model/user");
const upload = require("./config/uploads"); // mutler file.
const jwt = require("./Middleware");
const allowedRoles = require("./allowedRoles");
const path = require("path");

const router = express.Router();

router.get("/welcome", (req, res, next) => {
  res.status(200).json({ name: "Ebuka" });
});

//Route for uploading image to cloudinary
router.post(
  "/Upload-editorImage",
  upload.single("file"),
  async (req, res, next) => {
    try {
      //...code logic goes here.

      // check if there is a request file
      if (!req.file) {
        return res.status(400).json({ message: "no file uploaded" });
      }

      // store the file in a variable.
      const imageUrl = req.file.path;

      // TinyMCE expects a JSON object containing a property named "location".
      return res.status(201).json({ location: imageUrl });
      // so your response json must contain a location key with the image as value.
    } catch (error) {
      return res.status(500).json({ message: error });
    }
  },
);

// Route for adding data to the db
router.post("/post", jwt, upload.single("image"), async (req, res, next) => {
  try {
    // Receive the data from the client or client input
    const { title, content, article } = req.body;

    // Check if a file was actually uploaded.
    // Cloudinary provides the full secure URL directly in req.file.path
    const imagePath = req.file ? req.file.path : null;

    // grab the authenticated user
    const authorId = req.user.userId;

    // Use Sequelize to insert this new row into our MySQL database
    const newPost = await Post.create({
      title: title,
      content: content,
      image: imagePath, // Saving the file path text straight into MySQL!
      userId: authorId,
      article: article,
    });

    // 3. Send back the newly created post with a 201 "Created" success status
    return res.status(201).json(newPost);
  } catch (error) {
    res.status(500).send({ error: "Error: something bad happened." });
  }
});

// Getting All posts
router.get("/posts", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const offset = (page - 1) * limit;

    const { count, rows } = await Post.findAndCountAll({
      limit: limit,
      offset: offset,
      order: [["createdAt", "DESC"]], // Show newest posts first!
      // 🆕 JOIN THE USER TABLE! Include author's name and email
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"], // Hide the password hash!
        },
      ],
    });

    // 4. Calculate total pages
    const totalPages = Math.ceil(count / limit); // count represents total no of posts in the db.

    return res.status(200).json({
      posts: rows,
      meta: {
        totalPages: totalPages,
        count: count,
        currentpage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).send({ error: "Error in fetching all posts." });
  }
});

// Getting All posts from a particular user.
// Note that the middleware, jwt automatically assigns req.user
router.get("/post/me", jwt, async (req, res, next) => {
  try {
    // req.user.id is populated automatically from your authenticateToken middleware!
    const userPosts = await Post.findAll({
      where: { userId: req.user.userId },
      order: [["createdAt", "DESC"]],
    });

    return res.json({ posts: userPosts });
  } catch (error) {
    console.error(error);
  }
});

// Get one single post
router.get(["/post/:id", "/post/:id/:slug"], async (req, res, next) => {
  const id = req.params.id;
  try {
    const singlePost = await Post.findByPk(id);

    // What if the user asks for an ID that doesn't exist? (e.g., id 999)
    if (!singlePost) {
      return res.status(404).json({ error: "Oops! That post does not exist." });
    }

    return res.status(200).json(singlePost);
  } catch (error) {
    res.status(500).json({ error: "Error in fetching single post.", error });
  }
});

// Update a post
router.put("/post/:id", jwt, upload.single("image"), async (req, res, next) => {
  try {
    const id = req.params.id;
    // get the contents you would like to update from the client.
    const { title, content, article } = req.body;

    // Cloudinary provides the full secure URL directly in req.file.path
    const imagePath = req.file ? req.file.path : null;

    // find the particular post to update
    const postToUpdate = await Post.findByPk(id);

    if (!postToUpdate) {
      return res
        .status(400)
        .json({ error: "Could not find the post to update." });
    }

    if (postToUpdate.userId !== req.user.userId) {
      return res
        .status(403)
        .json({ error: "You are not authorized to do shite here" });
    }

    // Update the fields with the new incoming data
    postToUpdate.title = title || postToUpdate.title; // Keeps the old title if no new one is provided
    postToUpdate.content = content || postToUpdate.content;
    postToUpdate.image = imagePath || postToUpdate.image;
    postToUpdate.article = article || postToUpdate.article;

    // 3. Save the changes back into the MySQL database
    await postToUpdate.save();

    return res.status(200).json(postToUpdate);
  } catch (error) {
    res.status(500).json({ error: "Error in Updating the post.", error });
  }
});

// Deleting a post
router.delete("/post/:id", jwt, async (req, res, next) => {
  try {
    const id = req.params.id;
    // find the particular post to delete.
    const postToDel = await Post.findByPk(id);
    if (!postToDel) {
      return res.status(404).json({ error: "There was no post to delete" });
    }

    const userRoles = req.user.roles || [];
    const isAdmin = Array.isArray(userRoles)
      ? userRoles.includes("admin")
      : userRoles === "admin";

    if (postToDel.userId !== req.user.userId && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Forbidden: You can only delete your own posts!" });
    }

    // delete the post.
    await postToDel.destroy();

    return res.status(201).json({ message: "post successfully erased" });
  } catch (error) {
    res.status(500).json({
      error: "Could not delete the post in the end, check your server",
      error,
    });
  }
});

router.get("/users", jwt, allowedRoles("admin"), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role"],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error });
  }
});
module.exports = router;
