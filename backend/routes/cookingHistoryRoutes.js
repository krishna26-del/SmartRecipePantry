/**
 * routes/cookingHistoryRoutes.js
 *
 * GET    /api/cooking-history     → Get user's cooking history (paginated, filterable)
 * GET    /api/cooking-history/:id → Get single history entry
 * POST   /api/cooking-history     → Record cooked recipe
 * PUT    /api/cooking-history/:id → Update history entry
 * DELETE /api/cooking-history/:id → Delete history entry
 */

const express = require('express');
const router = express.Router();
const cookingHistoryController = require('../controllers/cookingHistoryController');
const cookingHistoryValidator = require('../validators/cookingHistoryValidator');
const validate = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', cookingHistoryController.getCookingHistory);
router.get('/:id', cookingHistoryController.getCookingHistoryById);
router.post('/', cookingHistoryValidator.create, validate, cookingHistoryController.createCookingHistory);
router.put('/:id', cookingHistoryValidator.update, validate, cookingHistoryController.updateCookingHistory);
router.delete('/:id', cookingHistoryController.deleteCookingHistory);

module.exports = router;
