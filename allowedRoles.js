const allowedRoles = (...roles) => {
  return (req, res, next) => {
    // check if the request has a user roles, if not drop an empty array
    const userRoles = req.user?.roles || [];
    // use the SOME method to check if roles passed is stored in the request
    // user roles
    const has = roles.some((role) => userRoles.includes(role));

    if (!has) {
      return res
        .status(403)
        .json({ error: "not having the permission to do this." });
    }

    next();
  };
};

module.exports = allowedRoles;
