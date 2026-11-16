/**
 * routes/shoppingListRoutes.js
 * Stub — will be fully implemented in Phase 5.
 */
const express = require('express');
const router = express.Router();
router.get('/ping', (req, res) => res.json({ success: true, message: 'shoppingListRoutes ready' }));
module.exports = router;
