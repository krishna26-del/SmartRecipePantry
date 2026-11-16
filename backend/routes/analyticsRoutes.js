/**
 * routes/analyticsRoutes.js
 *
 * GET /api/analytics/dashboard      → Main aggregate dashboard stats
 * GET /api/analytics/pantry         → Detailed pantry analytics & unit distribution
 * GET /api/analytics/recipes        → Recipe popularity, category & difficulty breakdown
 * GET /api/analytics/cooking        → Cooking volume, trends (7d/30d), and frequency
 * GET /api/analytics/food-waste     → Food waste metrics, by unit & by reason
 * GET /api/analytics/shopping       → Shopping list completion rates & items breakdown
 * GET /api/analytics/meal-planning  → Meal schedule counts, types & status
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard', analyticsController.getDashboardAnalytics);
router.get('/pantry', analyticsController.getPantryAnalytics);
router.get('/recipes', analyticsController.getRecipeAnalytics);
router.get('/cooking', analyticsController.getCookingAnalytics);
router.get('/food-waste', analyticsController.getFoodWasteAnalytics);
router.get('/shopping', analyticsController.getShoppingAnalytics);
router.get('/meal-planning', analyticsController.getMealPlanningAnalytics);

module.exports = router;
