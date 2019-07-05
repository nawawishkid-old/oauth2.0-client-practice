function validateUser(options = {}) {
  const { successRedirect, failureRedirect } = options;

  return function(req, res, next) {
    console.log("req.user: ", req.user);

    if (req.user) {
      return successRedirect ? res.redirect(successRedirect) : next();
    }

    res.redirect(failureRedirect || "/login");
  };
}

module.exports = validateUser;
