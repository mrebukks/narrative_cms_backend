const jwt = require("jsonwebtoken");

// 🔒 This function intercepts requests and checks for a valid JWT ticket
const requireAuth = (req, res, next) => {
  // 1. Grab the tokens from the incoming request

  const token = req.cookies.cms_jwt_token;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Access denied. Malformed token format." });
  }

  try {
    // 3. Verify the token using our super-secret key!
    // If verification succeeds, it returns the decoded payload (userId, email)
    const decodedPayload = jwt.verify(token, "My_Super_Secret_CMS_Key_2026");

    // 4. Attach the user's data directly to the 'req' object
    // This makes it instantly accessible inside any route that uses this middleware!
    req.user = decodedPayload;

    // 5. Let the request pass through to the actual route handler
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    res
      .status(403)
      .json({ error: "Invalid or expired authentication ticket." });
  }
};

module.exports = requireAuth;
