/**
 * routes/ingredientRoutes.js
 *
 * GET    /api/ingredients            → list all (paginated)
 * GET    /api/ingredients/search?q=  → search by name
 * GET    /api/ingredients/:id        → get one
 * POST   /api/ingredients            → create  [protected]
 * PUT    /api/ingredients/:id        → update  [protected]
 * DELETE /api/ingredients/:id        → delete  [protected]
 *
 * IMPORTANT: /search MUST be registered BEFORE /:id
 * so Express does not interpret "search" as an :id parameter.
 */

const express             = require('express');
const router              = express.Router();
const {
  getAllIngredients,
  searchIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
}                         = require('../controllers/ingredientController');
const ingredientValidator = require('../validators/ingredientValidator');
const validate            = require('../middleware/validateMiddleware');
const { protect }         = require('../middleware/authMiddleware');

router.get('/',        getAllIngredients);
router.get('/search',  searchIngredients);    // ← before /:id
router.get('/:id',     getIngredientById);

router.post('/',       protect, ingredientValidator.create, validate, createIngredient);
router.put('/:id',     protect, ingredientValidator.update, validate, updateIngredient);
router.delete('/:id',  protect,                                        deleteIngredient);

module.exports = router;
