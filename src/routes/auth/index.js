const router = require("express").Router();
const validateState = require("../../middlewares/validate-oauth-state");
const controllers = require("../../controllers/auth");

const { facebook, google, github, line, twitter } = controllers;

router.get("/line", line.auth);
router.get("/line/callback", validateState, line.authCallback);

router.get("/facebook", facebook.auth);
router.get("/facebook/callback", facebook.authCallback);

router.get("/google", google.auth);
router.get("/google/callback", validateState, google.authCallback);

router.get("/github", github.auth);
router.get("/github/callback", validateState, github.authCallback);

// router.get("/twitter", twitter.auth);
// router.get("/twitter/callback", validateState, twitter.authCallback);

module.exports = router;
