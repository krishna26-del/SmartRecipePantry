/**
 * routes/recipeRoutes.js
 *
 * GET    /api/recipes              → list all (public, paginated, filterable)
 * GET    /api/recipes/my-recipes   → authenticated user's recipes
 * GET    /api/recipes/:id          → full recipe (public)
 * POST   /api/recipes              → create   [protected]
 * PUT    /api/recipes/:id          → update   [protected, owner only]
 * DELETE /api/recipes/:id          → delete   [protected, owner only]
 *
 * IMPORTANT: /my-recipes MUST come BEFORE /:id
 */

const express           = require('express');
const router            = express.Router();
const {
  getAllRecipes,
  getMyRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
}                       = require('../controllers/recipeController');
const recipeValidator   = require('../validators/recipeValidator');
const validate          = require('../middleware/validateMiddleware');
const { protect }       = require('../middleware/authMiddleware');

router.get('/',             getAllRecipes);
router.get('/my-recipes',   protect, getMyRecipes);   // ← before /:id
router.get('/:id',          getRecipeById);

router.post('/',            protect, recipeValidator.create, validate, createRecipe);
router.put('/:id',          protect, recipeValidator.update, validate, updateRecipe);
router.delete('/:id',       protect, deleteRecipe);

module.exports = router;
