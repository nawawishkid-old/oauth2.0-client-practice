const request = require("request-promise");
const { promisify } = require("util");
const qs = require("querystring");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const Cryptr = require("cryptr");
const config = require("../../config");
const User = require("../../models/user");

/**
 * @TODO try to display consent screen again
 * @TODO make request to Google API with obtained access_token
 */
/**
 * @see https://developers.google.com/identity/protocols/OpenIDConnect
 * @see https://developers.google.com/identity/protocols/OpenIDConnect#discovery
 */

async function auth(req, res) {
  /**
   * @one Get authorization code
   */
  const { authorization_endpoint } = await getOpenIDInfo();
  const requestQueryParamsObject = getAuthCodeQueryParams();
  const { state, nonce } = requestQueryParamsObject;
  const url = makeAuthCodeURL(authorization_endpoint, requestQueryParamsObject);

  req.session.auth = { state, nonce };

  res.redirect(url);
}

async function authCallback(req, res) {
  /**
   * @two Exchange authorization code for access token & id_token
   */
  const { code } = req.query;
  const { token_endpoint, jwks_uri, issuer } = await getOpenIDInfo();
  const tokens = await getTokens(token_endpoint, code);
  const jsonWebKeys = await getGoogleJWKs(jwks_uri);

  console.log("jsonWenKeys: ", jsonWebKeys);

  /**
   * @three Verify exchanged id_token
   */
  const payload = await verifyIDToken(tokens.id_token, jsonWebKeys, { issuer });

  updateUser(payload, tokens)
    .then(result => {
      console.log("mongoose result: ", result);

      req.session.user = payload.sub;

      res.redirect("/app");
    })
    .catch(error => {
      console.error("mongoose error: ", error);
      res.redirect("/login");
    });
}

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

function updateUser(payload, tokens) {
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
  console.log("payload: ", payload);

  return User.findOneAndUpdate({ id: payload.sub }, updatedData, {
    upsert: true
  });
}

function getOpenIDInfo() {
  return request("https://accounts.google.com/.well-known/openid-configuration")
    .then(response => JSON.parse(response))
    .catch(console.error.bind(console, `error: `));
}

module.exports = { auth, authCallback };
