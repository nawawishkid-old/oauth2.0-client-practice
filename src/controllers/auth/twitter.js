const request = require("request-promise");
const qs = require("querystring");
const crypto = require("crypto");
const config = require("../../config");

/**
 * @see https://developer.twitter.com/en/docs/twitter-for-websites/log-in-with-twitter/guides/implementing-sign-in-with-twitter
 */

async function auth(req, res) {}

async function authCallback(req, res) {}

const endpoints = {
  requestToken: `https://api.twitter.com/oauth/request_token`,
  auth: `https://api.twitter.com/oauth/authenticate`,
  accessToken: `https://api.twitter.com/oauth/access_token`
};

module.exports = { auth, authCallback };
