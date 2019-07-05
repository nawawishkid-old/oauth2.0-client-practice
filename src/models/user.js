const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  id: { type: String, required: true },
  email: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  picture: { type: String, required: true },
  oAuthProvider: { type: String, required: true, select: false },
  accessToken: { type: String, select: false },
  refreshToken: { type: String, select: false }
});

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
