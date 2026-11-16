/**
 * utils/generateToken.js
 *
 * Creates a signed JWT for a given user.
 *
 * The token payload contains only user_id — just enough for the
 * auth middleware to identify who made the request. We fetch the
 * full user record from the DB in authMiddleware for fresh data.
 *
 * JWT_SECRET and JWT_EXPIRES_IN are read from .env — never hardcoded.
 */

const jwt = require('jsonwebtoken');

/**
 * @param {number} userId - The user_id from the Users table
 * @returns {string} Signed JWT string
 */
const generateToken = (userId) => {
  return jwt.sign(
    { user_id: userId },        // Payload — keep it minimal
    process.env.JWT_SECRET,     // Secret key from .env
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d', // e.g. "1d", "7d"
    }
  );
};

module.exports = generateToken;
