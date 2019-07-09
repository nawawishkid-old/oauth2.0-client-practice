const router = require("express").Router();
const lineController = require("../../controllers/auth/line");
const facebookController = require("../../controllers/auth/facebook");
const googleController = require("../../controllers/auth/google");
const githubController = require("../../controllers/auth/github");
const validateState = require("../../middlewares/validate-oauth-state");

router.get("/line", lineController.auth);
router.get("/line/callback", validateState, lineController.authCallback);

router.get("/facebook", facebookController.auth);
router.get("/facebook/callback", facebookController.authCallback);

router.get("/google", googleController.auth);
router.get("/google/callback", validateState, googleController.authCallback);

router.get("/github", githubController.auth);
router.get("/github/callback", validateState, githubController.authCallback);

module.exports = router;
