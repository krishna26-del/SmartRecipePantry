/**
 * controllers/authController.js
 *
 * Handles user registration, login, and profile retrieval.
 *
 * Security principles applied:
 *   - Passwords are hashed with bcryptjs (salt rounds = 12) before storage.
 *   - password_hash is NEVER returned to the client.
 *   - On login failure, a generic message is used — never revealing
 *     whether the email or password was specifically wrong.
 *   - user_id is ALWAYS taken from the verified JWT (req.user), never
 *     from the request body.
 *   - All DB errors are caught and forwarded to the global error handler
 *     via next(error) — raw DB errors are never exposed to the client.
 */

const bcrypt        = require('bcryptjs');
const { pool }      = require('../config/db');
const generateToken = require('../utils/generateToken');
const ApiResponse   = require('../utils/ApiResponse');

// ─── POST /api/auth/register ─────────────────────────────────────────────────
/**
 * Register a new user.
 *
 * Steps:
 *   1. Check if the email is already in use.
 *   2. Hash the password.
 *   3. Insert the new user record into the users table.
 *   4. Generate a JWT.
 *   5. Return the user object (without password_hash) and the token.
 */
const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    // 1. Check for duplicate email
    const [existing] = await pool.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return ApiResponse.error(res, 409, 'Email already registered');
    }

    // 2. Hash the password — salt rounds 12 is a good balance of security/speed
    const SALT_ROUNDS = 12;
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Insert the user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email, password_hash]
    );

    const newUserId = result.insertId;

    // 4. Fetch the newly created user (avoid returning password_hash)
    const [rows] = await pool.query(
      'SELECT user_id, name, email, created_at FROM users WHERE user_id = ?',
      [newUserId]
    );

    const user = rows[0];

    // 5. Generate JWT
    const token = generateToken(user.user_id);

    // 6. Respond
    return ApiResponse.success(res, 201, 'User registered successfully', {
      user,
      token,
    });

  } catch (error) {
    // Forward to centralized error handler — never expose raw DB errors
    next(error);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * Log in an existing user.
 *
 * Steps:
 *   1. Look up the user by email.
 *   2. Compare the provided password against the stored hash.
 *   3. On success, generate a JWT and return user data.
 *
 * SECURITY: Steps 1 and 2 share a single generic error message so an
 * attacker cannot distinguish between "email not found" and "wrong password".
 */
const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1. Find user by email (include password_hash for comparison only)
    const [rows] = await pool.query(
      'SELECT user_id, name, email, password_hash, created_at FROM users WHERE email = ?',
      [email]
    );

    // Generic message — do NOT reveal whether email or password was wrong
    const INVALID_CREDENTIALS_MSG = 'Invalid email or password';

    if (rows.length === 0) {
      return ApiResponse.error(res, 401, INVALID_CREDENTIALS_MSG);
    }

    const user = rows[0];

    // 2. Compare password against stored hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return ApiResponse.error(res, 401, INVALID_CREDENTIALS_MSG);
    }

    // 3. Generate JWT
    const token = generateToken(user.user_id);

    // Strip password_hash before sending response
    const { password_hash, ...safeUser } = user;

    return ApiResponse.success(res, 200, 'Login successful', {
      user: safeUser,
      token,
    });

  } catch (error) {
    next(error);
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
/**
 * Return the currently authenticated user's profile.
 *
 * The authMiddleware (protect) has already:
 *   - Verified the JWT.
 *   - Fetched the user from the DB.
 *   - Attached them to req.user (without password_hash).
 *
 * So this controller simply returns req.user.
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is set by the protect middleware — always from DB, never from body
    return ApiResponse.success(res, 200, 'User profile retrieved successfully', {
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
