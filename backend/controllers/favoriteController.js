/**
 * controllers/favoriteController.js
 *
 * Handles user favorite recipes with complete recipe metadata.
 * Uses composite primary key (user_id, recipe_id).
 */

const { pool } = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');

// ─── GET /api/favorites ───────────────────────────────────────────────────────
const getFavorites = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [recipes] = await pool.query(
      `SELECT
         r.recipe_id, r.recipe_name, r.description, r.instructions,
         r.prep_time, r.cook_time, r.difficulty, r.servings,
         r.source_type, r.created_at, r.user_id,
         c.category_id, c.category_name,
         f.added_at AS favorited_at
       FROM favorites f
       JOIN recipes r ON r.recipe_id = f.recipe_id
       JOIN categories c ON c.category_id = r.category_id
       WHERE f.user_id = ?
       ORDER BY f.added_at DESC`,
      [userId]
    );

    if (recipes.length === 0) {
      return ApiResponse.success(res, 200, 'Favorites retrieved successfully', {
        favorites: [],
        count: 0,
      });
    }

    const recipeIds = recipes.map((r) => r.recipe_id);
    const placeholders = recipeIds.map(() => '?').join(',');

    const [ingRows] = await pool.query(
      `SELECT ri.recipe_id, ri.ingredient_id, i.ingredient_name, ri.quantity, ri.unit, ri.notes
       FROM recipeingredients ri
       JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
       WHERE ri.recipe_id IN (${placeholders})`,
      recipeIds
    );

    const [tagRows] = await pool.query(
      `SELECT rdt.recipe_id, dt.tag_id, dt.tag_name
       FROM recipe_dietary_tags rdt
       JOIN dietary_tags dt ON dt.tag_id = rdt.tag_id
       WHERE rdt.recipe_id IN (${placeholders})`,
      recipeIds
    );

    const ingMap = new Map();
    for (const ing of ingRows) {
      if (!ingMap.has(ing.recipe_id)) ingMap.set(ing.recipe_id, []);
      ingMap.get(ing.recipe_id).push(ing);
    }

    const tagMap = new Map();
    for (const tag of tagRows) {
      if (!tagMap.has(tag.recipe_id)) tagMap.set(tag.recipe_id, []);
      tagMap.get(tag.recipe_id).push(tag);
    }

    const enriched = recipes.map((r) => ({
      recipe_id: r.recipe_id,
      recipe_name: r.recipe_name,
      description: r.description,
      instructions: r.instructions,
      prep_time: r.prep_time,
      cook_time: r.cook_time,
      difficulty: r.difficulty,
      servings: r.servings,
      source_type: r.source_type,
      category: {
        category_id: r.category_id,
        category_name: r.category_name,
      },
      favorited_at: r.favorited_at,
      ingredients: ingMap.get(r.recipe_id) || [],
      dietary_tags: tagMap.get(r.recipe_id) || [],
    }));

    return ApiResponse.success(res, 200, 'Favorites retrieved successfully', {
      favorites: enriched,
      count: enriched.length,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/favorites/:recipeId ───────────────────────────────────────────
const addFavorite = async (req, res, next) => {
  const userId = req.user.user_id;
  const { recipeId } = req.params;

  try {
    // 1. Verify recipe exists
    const [recipeRows] = await pool.query(
      'SELECT recipe_id, recipe_name FROM recipes WHERE recipe_id = ?',
      [recipeId]
    );
    if (recipeRows.length === 0) {
      return ApiResponse.error(res, 404, `Recipe with ID ${recipeId} not found`);
    }

    // 2. Prevent duplicate favorites
    const [existing] = await pool.query(
      'SELECT user_id, recipe_id FROM favorites WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );
    if (existing.length > 0) {
      return ApiResponse.error(res, 409, 'Recipe is already in your favorites');
    }

    await pool.query(
      'INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)',
      [userId, recipeId]
    );

    return ApiResponse.success(res, 201, 'Recipe added to favorites', {
      recipe_id: Number(recipeId),
      recipe_name: recipeRows[0].recipe_name,
      is_favorite: true,
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/favorites/:recipeId ─────────────────────────────────────────
const removeFavorite = async (req, res, next) => {
  const userId = req.user.user_id;
  const { recipeId } = req.params;

  try {
    const [existing] = await pool.query(
      'SELECT user_id, recipe_id FROM favorites WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );
    if (existing.length === 0) {
      return ApiResponse.error(res, 404, 'Recipe is not in your favorites');
    }

    await pool.query(
      'DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );

    return ApiResponse.success(res, 200, 'Recipe removed from favorites', {
      recipe_id: Number(recipeId),
      is_favorite: false,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/favorites/:recipeId/check ───────────────────────────────────────
const checkFavorite = async (req, res, next) => {
  const userId = req.user.user_id;
  const { recipeId } = req.params;

  try {
    const [existing] = await pool.query(
      'SELECT user_id FROM favorites WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );

    return ApiResponse.success(res, 200, 'Favorite status checked', {
      recipe_id: Number(recipeId),
      is_favorite: existing.length > 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
};
