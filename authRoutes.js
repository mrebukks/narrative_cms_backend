const express = require("express");
const router = express.Router();
const User = require("./model/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const brevo = require("./utility/brevo");
const { where } = require("sequelize");

const jwtKey = process.env.JWT_SECRET || "My_Super_Secret_CMS_Key_2026";

// code to delete Unverified users after specific time
async function deleteExpiredUnverifiedUsers() {
  await User.destroy({
    where: {
      isVerified: false,
      tokenExpires: {
        [Op.lt]: Date.now(), // Deletes if tokenExpires is LESS THAN current time
      },
    },
  });
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    console.log(name, email, password);

    // 1. Basic validation
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide name, email, and password." });
    }

    // 2. Check if user exists
    const existingUser = await User.findOne({ where: { email: email } });

    if (existingUser && existingUser.isVerified) {
      return res
        .status(400)
        .json({ error: "A user with this email already exists." });
    }

    // Prepare token & expiration (5 minutes = 1000 * 60 * 5)
    const token = crypto.randomInt(100000, 999999).toString();
    const tokenExpires = Date.now() + 1000 * 60 * 5;

    // Hash password manually so both cases are identical

    if (existingUser && !existingUser.isVerified) {
      // Case B: Update existing unverified record
      existingUser.name = name;
      existingUser.password = password;
      existingUser.token = token;
      existingUser.tokenExpires = tokenExpires;

      await existingUser.save(); // FIXED: changed 'user' to 'existingUser'
    } else {
      // Case C: Create new user
      await User.create({
        // FIXED: removed undeclared 'user ='
        name: name,
        email: email,
        password: password, // FIXED: pass hashedPassword here too
        token: token,
        tokenExpires: tokenExpires,
      });
    }

    // Send email
    await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: "The Narrative CMS", email: "iamugonnaobi003@gmail.com" },
      to: [{ email: email }],
      subject: "Your Registration Verification Code - The Narrative CMS",
      htmlContent: `
        <h2>Welcome!</h2>
        <p>Your verification code is: <strong>${token}</strong></p>
        <p>This code will expire in 5 minutes.</p>
      `,
    });

    return res.status(200).json({
      message: "Registration almost successful, verify your email to login",
    });
  } catch (error) {
    console.error(error);

    if (
      error.name === "SequelizeValidationError" ||
      error.name === "SequelizeUniqueConstraintError"
    ) {
      return res.status(400).json({ error: error.errors[0].message });
    }

    res
      .status(500)
      .json({ error: "Something went wrong during registration." });
  }
});
//////////////////////// verification ////////////////////////////
router.post("/email/verification", async (req, res, next) => {
  const { email, token } = req.body;

  try {
    // Fetch pending user
    const pendingUser = await User.findOne({ where: { email: email } });

    // if No pending user
    if (!pendingUser) {
      return res
        .status(400)
        .json({ message: "No pending registration found for this email." });
    }

    // Check if token matches and is still valid
    if (String(pendingUser.token).trim() !== String(token).trim()) {
      // destroy the user
      await pendingUser.destroy();
      return res.status(400).json({ message: "Invalid token." });
    }

    if (Date.now() > Number(pendingUser.tokenExpires)) {
      await pendingUser.destroy();
      return res
        .status(400)
        .json({ message: "Token has expired. Please register again." });
    }

    pendingUser.isVerified = true;
    pendingUser.token = null;
    pendingUser.tokenExpires = null;

    // 🔴 MISSING PIECE: Persist changes to MySQL
    await pendingUser.save();

    return res
      .status(201)
      .json({ message: "Registration successful! You can now log in." });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({ message: "Failed to verify token." });
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post("/login", async (req, res, next) => {
  try {
    // get the password from the receiver.
    const password = req.body.password;
    const email = req.body.email;

    // in the case that there is no email or even a password.
    if (!password || !email) {
      return res
        .status(404)
        .json({ error: "Yu have to input your name and email." });
    }

    // 2. Look for the user in the database
    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      // Security tip: Keep error messages slightly generic so hackers don't know if the email exists
      return res.status(401).json({ error: "Invalid email or password." });
    }
    // 3. Compare the typed password with the hashed password in MySQL
    // bcrypt will automatically decrypt/compare them securely!
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "The password is incorrect." });
    }

    if (user.isVerified === false) {
      return res
        .status(403)
        .json({ message: "You must verify your email before entry" });
    }
    // 4. If password is correct, generate our digital ticket (JWT)
    // We store the user's ID and Email inside the payload
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Sign the token with our secret key and make it expire in 2 hours
    const token = jwt.sign(tokenPayload, jwtKey, {
      expiresIn: "2h",
    });

    //store the token in a cookie on the browser.
    res.cookie("cms_jwt_token", token, {
      httpOnly: true, // Blocks JavaScript/Console access completely
      secure: true, // ⚠️ Set to FALSE for localhost testing, TRUE for production HTTPS
      sameSite: "none", // Protects against CSRF attacks
      maxAge: 2 * 60 * 60 * 1000, // Cookie expires in 2 hours.
      path: "/",
    });

    // 5. Hand the ticket back to the client!
    res.status(200).json({
      message: "🔑 Login successful!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log(error, "something wrong with Your Post Login route");
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post("/logout", async (req, res) => {
  // This tells the browser to clear the cookie container immediately
  res.clearCookie("cms_jwt_token", {
    httpOnly: true,
    secure: false, // Set to true if you are testing on live HTTPS production
    sameSite: "strict",
    path: "/", // Explicitly define the root path
  });

  return res.status(200).json({ message: "👋 Logged out successfully!" });
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post("/forgot-password", async (req, res, next) => {
  try {
    // grab the email from the request.
    const { email } = req.body;

    // check if the email is in the db.
    const userexists = await User.findOne({
      where: {
        email: email,
      },
    });

    if (!userexists) {
      return res
        .status(401)
        .json({ message: "this user needs to be registered." });
    }

    // generate a token
    const passtoken = crypto.randomInt(1000000, 9999999).toString();

    userexists.token = passtoken;
    userexists.tokenExpires = Date.now() + 1000 * 60 * 7;

    // always save back to the DB once you have edited.
    await userexists.save();

    // verify they are the authentic email owners
    await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: "The Narrative CMS", email: "iamugonnaobi003@gmail.com" },
      to: [{ email: email }],
      subject: "Reset Your Password - The Narrative CMS",
      htmlContent: `
    <h2>Welcome!</h2>
        <p>Your verification code is: <strong>${passtoken}</strong></p>
        <p>This code will expire in 7 minutes.</p>
    `,
    });

    return res.status(201).json({
      message: "sent successfully to that email",
      expiry: userexists.tokenExpires,
    });
  } catch (error) {
    console.log(error, "failed to send email");
  }
});

// Reseting the Password
router.post("/reset-password", async (req, res, next) => {
  try {
    //grab the input from the request.
    const { email, newPassword, token } = req.body;

    // find the user.
    const user = await User.findOne({
      where: { email: email, isVerified: true },
    });

    if (!user) {
      return res.status(403).json({ message: "You are forbidden" });
    }

    if (Date.now() > Number(user.tokenExpires)) {
      return res.status(403).json({ message: "Expired token" });
    }

    // verify the tokens.
    if (String(user.token).trim() !== String(token).trim()) {
      return res.status(401).json({ message: "Token is wrong" });
    }

    //Update the password. // Remember our beforeCreate hook should be able to hash this password change.
    user.password = await bcrypt.hash(newPassword, 10);
    user.token = null;
    user.tokenExpires = null;
    user.save();

    // send your response.
    res.status(200).json({ message: "Password Update, successful ✅" });
  } catch (error) {
    console.log(error, "failed to reset the password.");
  }
});

module.exports = router;
