/**
 * routes/categoryRoutes.js
 *
 * GET /api/categories      → list all categories
 * GET /api/categories/:id  → get one category
 */

const express                           = require('express');
const router                            = express.Router();
const { getAllCategories, getCategoryById } = require('../controllers/categoryController');

router.get('/',    getAllCategories);
router.get('/:id', getCategoryById);

module.exports = router;
