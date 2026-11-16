/**
 * middleware/authMiddleware.js
 *
 * Protects private routes by verifying the JWT sent in the
 * Authorization header.
 *
 * How it works:
 *   1. The client must send:  Authorization: Bearer <token>
 *   2. We extract the token from the header.
 *   3. We verify it using JWT_SECRET from .env.
 *   4. If valid, we look up the user in the database and attach
 *      the user record to req.user so controllers can use it.
 *   5. If invalid or expired, we return 401 Unauthorized.
 *
 * SECURITY: We NEVER trust user_id from the request body.
 *           We always use req.user.user_id (from the verified token).
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');

const protect = async (req, res, next) => {
  let token;

  // Look for the token in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return ApiResponse.error(
      res,
      401,
      'Access denied. No authentication token provided.'
    );
  }

  try {
    // Verify the token — throws if expired or tampered
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user from the database to ensure they still exist
    // and to get up-to-date user information.
    // We deliberately exclude password_hash from the query.
    const [rows] = await pool.query(
      'SELECT user_id, name, email, created_at FROM Users WHERE user_id = ?',
      [decoded.user_id]
    );

    if (rows.length === 0) {
      return ApiResponse.error(
        res,
        401,
        'Access denied. User account no longer exists.'
      );
    }

    // Attach user info to the request — controllers use req.user.user_id
    req.user = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 401, 'Session expired. Please log in again.');
    }
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.error(res, 401, 'Invalid token. Please log in again.');
    }
    // Unexpected error — log it and return generic 401
    console.error('Auth middleware error:', error);
    return ApiResponse.error(res, 401, 'Authentication failed.');
  }
};

module.exports = { protect };
