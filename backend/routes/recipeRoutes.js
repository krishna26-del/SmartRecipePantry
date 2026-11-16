/**
 * routes/recipeRoutes.js
 * Stub — will be fully implemented in Phase 3.
 */
const express = require('express');
const router = express.Router();
router.get('/ping', (req, res) => res.json({ success: true, message: 'recipeRoutes ready' }));
module.exports = router;
