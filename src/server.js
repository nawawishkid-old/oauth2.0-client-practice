const express = require("express");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const mongoose = require("mongoose");

const config = require("./config");
const routes = require("./routes");
const initSession = require("./middlewares/init-session");

const app = express();

mongoose.connect(
  config.db.mongodb.url,
  { useNewUrlParser: true, useFindAndModify: false },
  err => err && console.error(`mongodb error: `, err)
);

const sessionOptions = {
  store: new FileStore(), // ttl defaults to 3600
  secret: config.app.secret,
  resave: true,
  saveUninitialized: true,
  unset: "destroy"
};

app.set("view engine", config.app.view.engine);
app.set("views", config.app.view.path);

app.use(express.static(config.app.staticFilesPath));

app.use(session(sessionOptions));
app.use(initSession);

app.use("/", routes.main);
app.use("/auth", routes.auth);
app.use("/app", routes.app);

app.listen(
  config.app.port,
  console.log.bind(console, `Ready at http://localhost:${config.app.port}`)
);
