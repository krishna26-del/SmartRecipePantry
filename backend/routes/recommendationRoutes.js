/**
 * routes/recommendationRoutes.js
 * Stub — will be fully implemented in Phase 5.
 */
const express = require('express');
const router = express.Router();
router.get('/ping', (req, res) => res.json({ success: true, message: 'recommendationRoutes ready' }));
module.exports = router;
