/**
 * routes/analyticsRoutes.js
 * Stub — will be fully implemented in Phase 7.
 */
const express = require('express');
const router = express.Router();
router.get('/ping', (req, res) => res.json({ success: true, message: 'analyticsRoutes ready' }));
module.exports = router;
