/**
 * routes/authRoutes.js
 *
 * Maps HTTP methods + paths to controller functions.
 *
 * Route layout:
 *   POST /api/auth/register  — create a new account
 *   POST /api/auth/login     — authenticate and receive a JWT
 *   GET  /api/auth/me        — get the logged-in user's profile (protected)
 *
 * Middleware pipeline per route:
 *   validator array → validate (error collector) → controller function
 */

const express        = require('express');
const router         = express.Router();

const authController  = require('../controllers/authController');
const authValidator   = require('../validators/authValidator');
const validate        = require('../middleware/validateMiddleware');
const { protect }     = require('../middleware/authMiddleware');

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post(
  '/register',
  authValidator.register,  // Run express-validator rules
  validate,                // Collect errors; return 400 if any
  authController.register  // Business logic
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  authValidator.login,
  validate,
  authController.login
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// protect middleware verifies the JWT before the controller runs
router.get(
  '/me',
  protect,
  authController.getMe
);

module.exports = router;
