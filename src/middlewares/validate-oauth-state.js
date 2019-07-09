/**
 * Validate state
 *
 * @see https://developers.google.com/identity/protocols/OpenIDConnect#state-param
 */
function validateState(req, res, next) {
  const issuedState = req.session.auth && req.session.auth.state;
  const { state: receivedState } = req.query;

  if (receivedState !== issuedState) {
    console.error("State mismatched!");

    res.status(401);

    return res.redirect("/");
  }

  next();
}

module.exports = validateState;
