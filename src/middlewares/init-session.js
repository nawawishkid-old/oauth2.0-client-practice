const User = require("../models/user");

async function initSession(req, res, next) {
  console.log("session: ", req.session);
  if (!req.session.user) {
    console.log("-- no user");
    return next();
  }

  await User.findOne({ id: req.session.user })
    .then(user => {
      console.log("mongoose user: ", user);

      req.user = user;
    })
    .catch(err => {
      console.error("mongoose error: ", err);
    });

  next();
}

module.exports = initSession;
