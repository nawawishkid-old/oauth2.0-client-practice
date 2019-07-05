const router = require("express").Router();
const validateUser = require("../../middlewares/validate-user");

router.get("/", validateUser(), (req, res) => {
  res.render("app/main", { user: req.user });
});

module.exports = router;
