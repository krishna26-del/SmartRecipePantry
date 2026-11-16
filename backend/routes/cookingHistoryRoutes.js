/**
 * routes/cookingHistoryRoutes.js
 * Stub — will be fully implemented in Phase 6.
 */
const express = require('express');
const router = express.Router();
router.get('/ping', (req, res) => res.json({ success: true, message: 'cookingHistoryRoutes ready' }));
module.exports = router;
