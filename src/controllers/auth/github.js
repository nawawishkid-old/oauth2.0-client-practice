const qs = require("querystring");
const request = require("request-promise");
const crypto = require("crypto");
const config = require("../../config");
const User = require("../../models/user");

async function auth(req, res) {
  const { clientID, callbackURL, scopes } = config.auth.github;
  const state = crypto.randomBytes(16).toString("hex");
  const authURL =
    endpoints.auth +
    "?" +
    qs.stringify({
      client_id: clientID,
      redirect_uri: callbackURL,
      scope: scopes.join(" "),
      state
    });

  req.session.auth = { state };

  res.redirect(authURL);
}

async function authCallback(req, res) {
  getCodeFromRequest(req, res)
    .then(getTokensByAuthCode(config.auth.github))
    .then(getUserProfile)
    .then(updateUser)
    .then(updateSession)
    .then(handleSuccess("/app"))
    .catch(handleFailure("/login"));
}

const endpoints = {
  auth: `https://github.com/login/oauth/authorize`,
  tokens: `https://github.com/login/oauth/access_token`,
  api: `https://api.github.com`
};

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

  return async function(store) {
    console.log(`>> getTokensByAuthCode()`);

    const { state } = store.req.session.auth;
    const body = {
      code: store.code,
      client_id: clientID,
      client_secret: clientSecret,
      redirect_uri: callbackURL,
      state
    };

    return await request
      .post({
        uri: endpoints.tokens,
        body,
        json: true
      })
      .then(tokens => {
        store.tokens = tokens;

        return store;
      })
      .catch(throwErrorStore(store));
  };
}

async function getUserProfile(store) {
  console.log(`>> getUserProfile()`);

  const { tokens } = store;
  const headers = {
    authorization: `token ${tokens.access_token}`,
    "user-agent": `nawawishkid`
  };
  const baseOptions = { headers, json: true };
  const profile = await request.get({
    ...baseOptions,
    uri: endpoints.api + "/user"
  });
  const emails = await request.get({
    ...baseOptions,
    uri: endpoints.api + `/user/emails`
  });

  console.log(`emails: `, emails);

  profile.email = emails[0].email;
  store.user = profile;

  return store;
}

async function updateUser(store) {
  console.log(`>> updateUser()`);

  const { user, tokens } = store;
  const name = user.name.split(" ");
  const updatedData = {
    id: user.id,
    email: user.email,
    oAuthProvider: "github",
    firstName: name[0],
    lastName: name[1],
    picture: user.avatar_url,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token
  };

  console.log(`updatedData: `, updatedData);

  return await User.findOneAndUpdate({ id: user.id }, updatedData, {
    upsert: true
  })
    .then(() => store)
    .catch(throwErrorStore(store));
}

function updateSession(store) {
  console.log(`>> updateSession()`);
  console.log(`user.id: `, store.user.id);

  store.req.session.user = store.user.id;

  return store;
}

function handleSuccess(redirect) {
  return function(store) {
    console.log(`>> handleSuccess()`);

    store.res.redirect(redirect);
  };
}

function handleFailure(redirect) {
  return function(store) {
    console.log(`>> handleFailure()`);
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

module.exports = { auth, authCallback };
