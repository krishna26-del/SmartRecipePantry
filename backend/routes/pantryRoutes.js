/**
 * routes/pantryRoutes.js
 *
 * GET    /api/pantry           → Get user's pantry
 * GET    /api/pantry/summary   → Get summary stats
 * GET    /api/pantry/expiring  → Get expiring items (next 7 days)
 * GET    /api/pantry/expired   → Get expired items
 * GET    /api/pantry/:id       → Get single item
 * POST   /api/pantry           → Add ingredient to pantry
 * PUT    /api/pantry/:id       → Update pantry item
 * DELETE /api/pantry/:id       → Delete pantry item
 */

const express = require('express');
const router = express.Router();
const pantryController = require('../controllers/pantryController');
const pantryValidator = require('../validators/pantryValidator');
const validate = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');

// All pantry routes require authentication
router.use(protect);

router.get('/', pantryController.getPantry);
router.get('/summary', pantryController.getPantrySummary);
router.get('/expiring', pantryController.getExpiringItems);
router.get('/expired', pantryController.getExpiredItems);
router.get('/:id', pantryController.getPantryItemById);

router.post('/', pantryValidator.add, validate, pantryController.addPantryItem);
router.put('/:id', pantryValidator.update, validate, pantryController.updatePantryItem);
router.delete('/:id', pantryController.deletePantryItem);

module.exports = router;
