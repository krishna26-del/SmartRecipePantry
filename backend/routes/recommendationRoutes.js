/**
 * routes/recommendationRoutes.js
 *
 * GET /api/recommendations           → Get smart recipe recommendations
 * GET /api/recommendations/:recipeId → Check availability for specific recipe
 */

const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', recommendationController.getRecommendations);
router.get('/:recipeId', recommendationController.getRecipeAvailability);

module.exports = router;
