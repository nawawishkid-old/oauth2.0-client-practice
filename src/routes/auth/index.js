const router = require("express").Router();
const request = require("request-promise");
const qs = require("querystring");
const crypto = require("crypto");
const config = require("../../config");
const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const Cryptr = require("cryptr");
const { promisify } = require("util");
const User = require("../../models/user");

function getFacebookEndpoints(version = "3.3") {
  return {
    auth: `https://www.facebook.com/v${version}/dialog/oauth`,
    token: `https://graph.facebook.com/v${version}/oauth/access_token`,
    profile: `https://graph.facebook.com/v${version}/me`,
    debugToken: `https://graph.facebook.com/debug_token`
  };
}

router.get("/facebook", async (req, res) => {
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
});

router.get("/facebook/callback", async (req, res) => {
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
});

/**
 * @TODO try to display consent screen again
 * @TODO make request to Google API with obtained access_token
 * @TODO implement with Facebook
 */
/**
 * @see https://developers.google.com/identity/protocols/OpenIDConnect
 * @see https://developers.google.com/identity/protocols/OpenIDConnect#discovery
 */
router.get("/google", async (req, res) => {
  /**
   * @one Get authorization code
   */
  const { authorization_endpoint } = await getOpenIDInfo();
  const requestQueryParamsObject = getAuthCodeQueryParams();
  const url = makeAuthCodeURL(authorization_endpoint, requestQueryParamsObject);

  req.session.state = requestQueryParamsObject.state;

  res.redirect(url);
});

router.get("/google/callback", validateState, async (req, res) => {
  /**
   * @two Exchange authorization code for access token & id_token
   */
  const { code } = req.query;
  const { token_endpoint, jwks_uri, issuer } = await getOpenIDInfo();
  const tokens = await getTokens(token_endpoint, code);
  const jsonWebKeys = await getGoogleJWKs(jwks_uri);

  /**
   * @three Verify exchanged id_token
   */
  const payload = await verifyIDToken(tokens.id_token, jsonWebKeys, { issuer });
  const updatedData = {
    id: payload.sub,
    email: payload.email,
    firstName: payload.given_name,
    lastName: payload.family_name,
    picture: payload.picture,
    accessToken: tokens.access_token,
    oAuthProvider: "google"
  };

  if (tokens.refresh_token) {
    const cryptr = new Cryptr(config.app.secret);

    updatedData.refreshToken = cryptr.encrypt(tokens.refresh_token);
  }

  console.log("tokens: ", tokens);
  console.log("jsonWenKeys: ", jsonWebKeys);
  console.log("payload: ", payload);

  User.findOneAndUpdate({ id: payload.sub }, updatedData, { upsert: true })
    .then(result => {
      console.log("mongoose result: ", result);

      req.session.user = payload.sub;

      res.redirect("/app");
    })
    .catch(error => {
      console.error("mongoose error: ", error);
      res.redirect("/login");
    });
});

/**
 * ========= FUNCTIONS ========
 */

function makeAuthCodeURL(endpoint, queryParams) {
  return endpoint + "?" + qs.stringify(queryParams);
}

function getAuthCodeQueryParams() {
  const { clientID, callbackURL, scopes } = config.auth.google;

  return {
    client_id: clientID,
    response_type: "code",
    scope: scopes.join(" "),
    redirect_uri: callbackURL,
    nonce: crypto.randomBytes(16).toString("hex"),
    state: crypto.randomBytes(16).toString("hex")
  };
}

/**
 * Validate state
 *
 * @see https://developers.google.com/identity/protocols/OpenIDConnect#state-param
 */
function validateState(req, res, next) {
  const issuedState = req.session.state;
  const { state: receivedState } = req.query;

  if (receivedState !== issuedState) {
    console.error("State mismatched!");

    res.status(401);
    return res.redirect("/");
  }

  next();
}

/**
 * Get JWK for id_token verification
 *
 * @see https://developers.google.com/identity/protocols/OpenIDConnect#validatinganidtoken
 */
function getGoogleJWKs(jwks_uri) {
  /**
   * JSON Web Key
   * @see https://tools.ietf.org/html/rfc7517
   */
  return request.get(jwks_uri, { json: true }).then(result => result.keys);
}

/**
 * Exchange authorization code for access token and ID token
 *
 * @see https://developers.google.com/identity/protocols/OpenIDConnect#exchangecode
 */
function getTokens(token_endpoint, code) {
  const { clientID, clientSecret, callbackURL } = config.auth.google;
  const requestOptions = {
    method: "POST",
    uri: token_endpoint,
    form: {
      code,
      client_id: clientID,
      client_secret: clientSecret,
      redirect_uri: callbackURL,
      grant_type: "authorization_code"
    },
    json: true
  };

  return request(requestOptions).catch(console.error.bind(console, `error: `));
}

async function verifyIDToken(idToken, jwks, options = {}) {
  const jwtVerify = promisify(jwt.verify);
  const { clientID } = config.auth.google;
  let decoded;

  for (const index in jwks) {
    const pem = jwkToPem(jwks[index]);

    try {
      decoded = await jwtVerify(idToken, pem, {
        algorithms: ["RS256"],
        ...options,
        audience: clientID
      });

      break;
    } catch (err) {
      if (index + 1 === jwks.length) {
        console.error("jwk error: ", err);
      }
    }
  }

  return decoded;
}

function getOpenIDInfo() {
  return request("https://accounts.google.com/.well-known/openid-configuration")
    .then(response => JSON.parse(response))
    .catch(console.error.bind(console, `error: `));
}

module.exports = router;
