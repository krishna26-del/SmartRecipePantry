/**
 * routes/mealPlanRoutes.js
 *
 * GET    /api/meal-plans                         → Get user's meal plans
 * GET    /api/meal-plans/:id                     → Get meal plan with items
 * POST   /api/meal-plans                         → Create meal plan
 * PUT    /api/meal-plans/:id                     → Update meal plan
 * DELETE /api/meal-plans/:id                     → Delete meal plan
 * POST   /api/meal-plans/:id/items               → Add planned meal
 * PUT    /api/meal-plans/:id/items/:itemId       → Update planned meal
 * DELETE /api/meal-plans/:id/items/:itemId       → Remove planned meal
 * GET    /api/meal-plans/:id/items               → Get all items in a plan
 */

const express = require('express');
const router = express.Router();
const mealPlanController = require('../controllers/mealPlanController');
const mealPlanValidator = require('../validators/mealPlanValidator');
const validate = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', mealPlanController.getMealPlans);
router.get('/:id', mealPlanController.getMealPlanById);
router.post('/', mealPlanValidator.createPlan, validate, mealPlanController.createMealPlan);
router.put('/:id', mealPlanValidator.updatePlan, validate, mealPlanController.updateMealPlan);
router.delete('/:id', mealPlanController.deleteMealPlan);

// Meal Plan Item Routes
router.post('/:id/items', mealPlanValidator.addMealItem, validate, mealPlanController.addMealPlanItem);
router.put('/:id/items/:itemId', mealPlanValidator.updateMealItem, validate, mealPlanController.updateMealPlanItem);
router.delete('/:id/items/:itemId', mealPlanController.deleteMealPlanItem);
router.get('/:id/items', mealPlanController.getMealPlanItems);

module.exports = router;
