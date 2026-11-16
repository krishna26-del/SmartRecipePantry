/**
 * routes/authRoutes.js
 * Phase 2: Authentication routes (register, login, me)
 * Stubbed for Phase 1 — will be fully implemented in Phase 2.
 */
const express = require('express');
const router = express.Router();

// Temporary health check for auth route group
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'Auth routes ready' });
});

module.exports = router;
