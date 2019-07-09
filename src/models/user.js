const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  id: { type: String, required: true },
  email: {
    type: String,
    required: v => v != null,
    lowercase: true,
    validate: {
      validator: v => /^[a-z0-9-_\.]+@[a-z]{1,}$/.test(v),
      msg: `Invalid email pattern`
    }
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  picture: { type: String, required: true },
  oAuthProvider: {
    type: String,
    required: true,
    enum: ["google", "facebook", "line", "github", "twitter"],
    select: false
  },
  accessToken: { type: String, select: false },
  refreshToken: { type: String, select: false }
});

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
