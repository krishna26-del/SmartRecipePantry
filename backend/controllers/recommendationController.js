/**
 * controllers/recommendationController.js
 *
 * Exposes endpoints for Smart Recipe Recommendations and single-recipe availability checks.
 */

const recommendationService = require('../services/recommendationService');
const ApiResponse = require('../utils/ApiResponse');

// ─── GET /api/recommendations ─────────────────────────────────────────────────
const getRecommendations = async (req, res, next) => {
  const userId = req.user.user_id;
  const { category_id, difficulty, min_coverage, limit } = req.query;

  try {
    const recommendations = await recommendationService.getRecommendations(userId, {
      category_id,
      difficulty,
      min_coverage,
      limit,
    });

    return ApiResponse.success(res, 200, 'Recipe recommendations generated successfully', {
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/recommendations/:recipeId ───────────────────────────────────────
const getRecipeAvailability = async (req, res, next) => {
  const userId = req.user.user_id;
  const { recipeId } = req.params;

  try {
    const availability = await recommendationService.checkRecipeAvailability(userId, recipeId);

    if (!availability) {
      return ApiResponse.error(res, 404, `Recipe with ID ${recipeId} not found`);
    }

    return ApiResponse.success(res, 200, 'Recipe availability checked successfully', {
      availability,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
  getRecipeAvailability,
};
