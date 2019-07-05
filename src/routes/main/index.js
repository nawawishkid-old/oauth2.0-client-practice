const router = require("express").Router();

router.get("/", (req, res) => {
  res.render("main", { user: req.user });
});

router.get("/login", (req, res) => {
  if (req.user) {
    return res.redirect("/app");
  }

  res.render("login");
});

router.get("/logout", (req, res) => {
  if (req.user) {
    delete req.user;
  }

  if (req.session.user) {
    delete req.session;
  }

  res.redirect("/");
});

module.exports = router;
