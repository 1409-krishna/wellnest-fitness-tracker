const jwt = require('jsonwebtoken');

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    preferences: user.preferences,
  };
}

module.exports = { signToken, publicUser };
