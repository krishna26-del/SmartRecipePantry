/**
 * routes/shoppingListRoutes.js
 *
 * GET    /api/shopping-lists                                       → Get all user's lists
 * GET    /api/shopping-lists/:id                                   → Get list with items
 * POST   /api/shopping-lists                                       → Create list
 * PUT    /api/shopping-lists/:id                                   → Update list name/status
 * DELETE /api/shopping-lists/:id                                   → Delete list
 * POST   /api/shopping-lists/:id/items                             → Add item
 * PUT    /api/shopping-lists/:id/items/:itemId                     → Update item
 * DELETE /api/shopping-lists/:id/items/:itemId                     → Remove item
 * PATCH  /api/shopping-lists/:id/items/:itemId/purchase            → Toggle purchased
 * POST   /api/shopping-lists/:id/generate-from-recipe/:recipeId    → Generate missing items from recipe
 */

const express = require('express');
const router = express.Router();
const shoppingListController = require('../controllers/shoppingListController');
const shoppingListValidator = require('../validators/shoppingListValidator');
const validate = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', shoppingListController.getShoppingLists);
router.get('/:id', shoppingListController.getShoppingListById);
router.post('/', shoppingListValidator.createList, validate, shoppingListController.createShoppingList);
router.put('/:id', shoppingListValidator.updateList, validate, shoppingListController.updateShoppingList);
router.delete('/:id', shoppingListController.deleteShoppingList);

// Nested Item Routes
router.post('/:id/items', shoppingListValidator.addItem, validate, shoppingListController.addItem);
router.put('/:id/items/:itemId', shoppingListValidator.updateItem, validate, shoppingListController.updateItem);
router.delete('/:id/items/:itemId', shoppingListController.deleteItem);
router.patch('/:id/items/:itemId/purchase', shoppingListController.togglePurchase);

// Recipe Generation Route
router.post('/:id/generate-from-recipe/:recipeId', shoppingListController.generateFromRecipe);

module.exports = router;
