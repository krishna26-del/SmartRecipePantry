/**
 * routes/favoriteRoutes.js
 *
 * GET    /api/favorites                  → Get all favorites
 * GET    /api/favorites/:recipeId/check  → Check if recipe is favorited
 * POST   /api/favorites/:recipeId        → Add recipe to favorites
 * DELETE /api/favorites/:recipeId        → Remove recipe from favorites
 */

const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', favoriteController.getFavorites);
router.get('/:recipeId/check', favoriteController.checkFavorite);
router.post('/:recipeId', favoriteController.addFavorite);
router.delete('/:recipeId', favoriteController.removeFavorite);

module.exports = router;
