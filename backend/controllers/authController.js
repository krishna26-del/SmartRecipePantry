/**
 * controllers/authController.js
 * Phase 2 — Authentication controller stub.
 * Register, Login, and GetMe will be implemented in Phase 2.
 */

const register = async (req, res, next) => {
  res.status(501).json({ success: false, message: 'Not implemented yet — Phase 2' });
};

const login = async (req, res, next) => {
  res.status(501).json({ success: false, message: 'Not implemented yet — Phase 2' });
};

const getMe = async (req, res, next) => {
  res.status(501).json({ success: false, message: 'Not implemented yet — Phase 2' });
};

module.exports = { register, login, getMe };
