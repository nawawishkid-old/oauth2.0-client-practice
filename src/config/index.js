const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

module.exports = {
  app: {
    port: process.env.PORT,
    view: {
      engine: "pug",
      path: path.resolve("src", "views")
    },
    staticFilesPath: path.resolve("src", "assets"),
    secret: process.env.APP_SECRET
  },
  auth: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scopes: [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/spreadsheets"
        // "https://www.googleapis.com/auth/userinfo.profile"
      ]
    },
    facebook: {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      scopes: ["email", "public_profile"]
    }
  },
  db: {
    mongodb: {
      url: process.env.MONGODB_URL
    }
  }
};
