/**
 * routes/pantryRoutes.js
 * Stub — will be fully implemented in Phase 4.
 */
const express = require('express');
const router = express.Router();
router.get('/ping', (req, res) => res.json({ success: true, message: 'pantryRoutes ready' }));
module.exports = router;
