const request = require("request-promise");
const qs = require("querystring");
const crypto = require("crypto");
const config = require("../../config");
const User = require("../../models/user");

async function auth(req, res) {
  const endpoints = getFacebookEndpoints();
  const { clientID, callbackURL, scopes } = config.auth.facebook;
  const state = crypto.randomBytes(16).toString("hex");

  req.session.state = state;

  /**
   * @one Get authorization code
   */
  const authCodeQueryParams = {
    client_id: clientID,
    redirect_uri: callbackURL,
    // scopes,
    state
  };
  const authCodeUrl = endpoints.auth + "?" + qs.stringify(authCodeQueryParams);

  console.log("authCodeQueryParams: ", authCodeQueryParams);
  console.log("authCodeUrl: ", authCodeUrl);

  res.redirect(authCodeUrl);
}

async function authCallback(req, res) {
  const { clientID, clientSecret, callbackURL } = config.auth.facebook;
  const endpoints = getFacebookEndpoints();

  /**
   * @two Exchange authorization code for access token
   */
  const { code } = req.query;
  console.log("code: ", code);
  const tokenUrl =
    endpoints.token +
    "?" +
    qs.stringify({
      client_id: clientID,
      client_secret: clientSecret,
      redirect_uri: callbackURL,
      code
    });
  console.log("tokenUrl: ", tokenUrl);
  const tokens = await request.get(tokenUrl, { json: true });

  console.log("tokens: ", tokens);

  /**
   * @three Verify exchenaged access token
   */
  // const debugUrl =
  //   endpoints.debugToken +
  //   "?" +
  //   qs.stringify({ input_token: tokens.access_token, access_token: "" });
  // const parsedToken = await request.get();

  /**
   * @four Get user profile
   */
  const profileUrl =
    endpoints.profile +
    "?" +
    qs.stringify({
      access_token: tokens.access_token,
      fields: ["picture", "email", "name"].join(",")
    });
  const profile = await request.get(profileUrl, { json: true });

  console.log("profile: ", profile);

  /**
   * @five Store/update user profile in session and database
   */
  const name = profile.name.split(" ");
  const updatedData = {
    id: profile.id,
    email: profile.email,
    firstName: name[0],
    lastName: name[1],
    picture: profile.picture.data.url,
    oAuthProvider: "facebook",
    accessToken: tokens.access_token
  };

  User.findOneAndUpdate({ id: profile.id }, updatedData, { upsert: true })
    .then(() => {
      req.session.user = profile.id;

      res.redirect("/app");
    })
    .catch(err => {
      console.log("mongoose error: ", err);

      res.redirect("/login");
    });
}

function getFacebookEndpoints(version = "3.3") {
  return {
    auth: `https://www.facebook.com/v${version}/dialog/oauth`,
    token: `https://graph.facebook.com/v${version}/oauth/access_token`,
    profile: `https://graph.facebook.com/v${version}/me`,
    debugToken: `https://graph.facebook.com/debug_token`
  };
}

module.exports = { auth, authCallback };
