/**
 * routes/dietaryTagRoutes.js
 *
 * GET /api/dietary-tags      → list all
 * GET /api/dietary-tags/:id  → get one
 */

const express                                   = require('express');
const router                                    = express.Router();
const { getAllDietaryTags, getDietaryTagById }  = require('../controllers/dietaryTagController');

router.get('/',    getAllDietaryTags);
router.get('/:id', getDietaryTagById);

module.exports = router;
