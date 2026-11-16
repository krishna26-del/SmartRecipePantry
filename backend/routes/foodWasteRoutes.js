/**
 * routes/foodWasteRoutes.js
 *
 * GET    /api/food-waste         → Get all waste records (paginated, filterable)
 * GET    /api/food-waste/summary → Get waste summary statistics (by unit, reason, trend)
 * GET    /api/food-waste/:id     → Get single waste record
 * POST   /api/food-waste         → Record food waste
 * PUT    /api/food-waste/:id     → Update waste record
 * DELETE /api/food-waste/:id     → Delete waste record
 */

const express = require('express');
const router = express.Router();
const foodWasteController = require('../controllers/foodWasteController');
const foodWasteValidator = require('../validators/foodWasteValidator');
const validate = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', foodWasteController.getFoodWaste);
router.get('/summary', foodWasteController.getFoodWasteSummary);
router.get('/:id', foodWasteController.getFoodWasteById);

router.post('/', foodWasteValidator.create, validate, foodWasteController.createFoodWaste);
router.put('/:id', foodWasteValidator.update, validate, foodWasteController.updateFoodWaste);
router.delete('/:id', foodWasteController.deleteFoodWaste);

module.exports = router;
