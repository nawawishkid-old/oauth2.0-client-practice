const qs = require("querystring");
const { promisify } = require("util");
const crypto = require("crypto");
const request = require("request-promise");
const jwt = require("jsonwebtoken");
const config = require("../../config");
const User = require("../../models/user");

/**
 * @see https://developers.line.biz/en/reference/social-api/
 * @see https://developers.line.biz/en/docs/social-api/logging-out-users/
 * @see https://developers.line.biz/en/docs/social-api/managing-access-tokens/
 */

async function auth(req, res) {
  const { clientID, callbackURL, scopes } = config.auth.line;

  console.log("config: ", config.auth.line);

  /**
   * @one Get authorization code
   */
  const state = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");
  const endpoints = getLineEndpoints();
  const authUrl =
    endpoints.auth +
    "?" +
    qs.stringify({
      response_type: "code",
      client_id: clientID,
      redirect_uri: callbackURL,
      state,
      nonce,
      scope: scopes.join(" ")
    });

  console.log(`url: `, authUrl);

  req.session.auth = { state, nonce };

  res.redirect(authUrl);
}

async function authCallback(req, res) {
  const { clientID, clientSecret } = config.auth.line;
  /**
   * @two Exchange authorization code for access token
   * @three Verify id_token to get user profile information.
   * @foure Store user profile in database and session.
   */
  getCodeFromRequest(req, res)
    .then(getTokensByAuthCode(config.auth.line))
    .then(getPayload(clientID, clientSecret))
    .then(validateNonce)
    .then(updateUser)
    .then(updateSession)
    .then(handleSuccess("/app"))
    .catch(handleFailure("/login"));
}

function getCodeFromRequest(req, res) {
  const { code, error, error_description } = req.query;
  const store = { req, res };

  return new Promise((resolve, reject) => {
    if (error) {
      store.error = error_description;

      reject(store);
    }

    console.log("code: ", code);

    store.code = code;

    resolve(store);
  });
}

function getTokensByAuthCode(credentials) {
  const { clientID, clientSecret, callbackURL } = credentials;
  const endpoints = getLineEndpoints();

  return async function(store) {
    console.log(`getTokensByAuthCode()`);

    const form = {
      grant_type: "authorization_code",
      code: store.code,
      client_id: clientID,
      client_secret: clientSecret,
      redirect_uri: callbackURL
    };

    return await request
      .post({ uri: endpoints.token, form, json: true })
      .then(tokens => {
        store.tokens = tokens;

        return store;
      })
      .catch(throwErrorStore(store));
  };
}

function getPayload(clientID, clientSecret) {
  const verify = promisify(jwt.verify);

  return function(store) {
    console.log(`getPayload()`);

    return verify(store.tokens.id_token, clientSecret, {
      audience: clientID,
      issuer: "https://access.line.me",
      algorithms: ["HS256"]
    })
      .then(payload => {
        console.log(`payload: `, payload);

        store.payload = payload;

        return store;
      })
      .catch(throwErrorStore(store));
  };
}

function validateNonce(store) {
  console.log("validateNonce()");

  const { req, payload } = store;

  if (req.session.auth && req.session.auth.nonce !== payload.nonce) {
    store.error = new Error(`nonce mismatched!`);

    throw store;
  }

  return store;
}

async function updateUser(store) {
  console.log(`updateUser()`);

  const { payload, tokens } = store;
  const name = payload.name.split(" ");
  const updatedData = {
    id: payload.sub,
    email: payload.email,
    oAuthProvider: "line",
    firstName: name[0],
    lastName: name[1],
    picture: payload.picture,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token
  };

  console.log(`updatedData: `, updatedData);

  return await User.findOneAndUpdate({ id: payload.sub }, updatedData, {
    upsert: true
  })
    .then(() => store)
    .catch(throwErrorStore(store));
}

function updateSession(store) {
  console.log(`updateSession()`);
  console.log(`payload.sub: `, store.payload.sub);

  store.req.session.user = store.payload.sub;

  return store;
}

function handleSuccess(redirect) {
  return function(store) {
    console.log(`handleSuccess()`);

    store.res.redirect(redirect);
  };
}

function handleFailure(redirect) {
  return function(store) {
    console.log(`handleFailure()`);
    console.log(`store: `, store);
    console.error(`error: `, store.error);
    store.res.status(500).redirect(redirect);
  };
}

function throwErrorStore(store) {
  return error => {
    store.error = error;

    throw store;
  };
}

function getLineEndpoints(version = "2.1") {
  return {
    auth: `https://access.line.me/oauth2/v${version}/authorize`,
    token: `https://api.line.me/oauth2/v${version}/token`
  };
}

module.exports = { auth, authCallback };
