/**
 * controllers/ingredientController.js
 *
 * GET  /api/ingredients            → list all (paginated)
 * GET  /api/ingredients/search?q=  → search by name (case-insensitive, paginated)
 * GET  /api/ingredients/:id        → get one by ID
 * POST /api/ingredients            → create  [protected]
 * PUT  /api/ingredients/:id        → update  [protected]
 * DELETE /api/ingredients/:id      → delete  [protected]
 */

const { pool }    = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse and clamp pagination query params */
const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// ─── GET /api/ingredients ────────────────────────────────────────────────────
const getAllIngredients = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req.query);

  try {
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM ingredients'
    );

    const [rows] = await pool.query(
      'SELECT ingredient_id, ingredient_name, default_unit FROM ingredients ORDER BY ingredient_name ASC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    return ApiResponse.success(res, 200, 'Ingredients retrieved successfully', {
      ingredients: rows,
      pagination: { page, limit, total: Number(total), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/ingredients/search?q= ─────────────────────────────────────────
const searchIngredients = async (req, res, next) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return ApiResponse.error(res, 400, 'Query parameter "q" is required');
  }

  const { page, limit, offset } = parsePagination(req.query);
  const pattern = `%${q}%`;

  try {
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM ingredients WHERE ingredient_name LIKE ?',
      [pattern]
    );

    const [rows] = await pool.query(
      'SELECT ingredient_id, ingredient_name, default_unit FROM ingredients WHERE ingredient_name LIKE ? ORDER BY ingredient_name ASC LIMIT ? OFFSET ?',
      [pattern, limit, offset]
    );

    return ApiResponse.success(res, 200, 'Ingredient search results', {
      query: q,
      ingredients: rows,
      pagination: { page, limit, total: Number(total), totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/ingredients/:id ────────────────────────────────────────────────
const getIngredientById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT ingredient_id, ingredient_name, default_unit FROM ingredients WHERE ingredient_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return ApiResponse.error(res, 404, `Ingredient with ID ${id} not found`);
    }

    return ApiResponse.success(res, 200, 'Ingredient retrieved successfully', {
      ingredient: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/ingredients ───────────────────────────────────────────────────
const createIngredient = async (req, res, next) => {
  const { ingredient_name, default_unit } = req.body;

  try {
    // Duplicate name check (case-insensitive)
    const [existing] = await pool.query(
      'SELECT ingredient_id FROM ingredients WHERE LOWER(ingredient_name) = LOWER(?)',
      [ingredient_name.trim()]
    );

    if (existing.length > 0) {
      return ApiResponse.error(res, 409, `Ingredient "${ingredient_name.trim()}" already exists`);
    }

    const [result] = await pool.query(
      'INSERT INTO ingredients (ingredient_name, default_unit) VALUES (?, ?)',
      [ingredient_name.trim(), default_unit.trim()]
    );

    const [rows] = await pool.query(
      'SELECT ingredient_id, ingredient_name, default_unit FROM ingredients WHERE ingredient_id = ?',
      [result.insertId]
    );

    return ApiResponse.success(res, 201, 'Ingredient created successfully', {
      ingredient: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/ingredients/:id ────────────────────────────────────────────────
const updateIngredient = async (req, res, next) => {
  const { id } = req.params;
  const { ingredient_name, default_unit } = req.body;

  try {
    // Check it exists
    const [existing] = await pool.query(
      'SELECT ingredient_id FROM ingredients WHERE ingredient_id = ?',
      [id]
    );
    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Ingredient with ID ${id} not found`);
    }

    // Check no duplicate name (excluding itself)
    const [dup] = await pool.query(
      'SELECT ingredient_id FROM ingredients WHERE LOWER(ingredient_name) = LOWER(?) AND ingredient_id != ?',
      [ingredient_name.trim(), id]
    );
    if (dup.length > 0) {
      return ApiResponse.error(res, 409, `Ingredient name "${ingredient_name.trim()}" is already taken`);
    }

    await pool.query(
      'UPDATE ingredients SET ingredient_name = ?, default_unit = ? WHERE ingredient_id = ?',
      [ingredient_name.trim(), default_unit.trim(), id]
    );

    const [rows] = await pool.query(
      'SELECT ingredient_id, ingredient_name, default_unit FROM ingredients WHERE ingredient_id = ?',
      [id]
    );

    return ApiResponse.success(res, 200, 'Ingredient updated successfully', {
      ingredient: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/ingredients/:id ─────────────────────────────────────────────
const deleteIngredient = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query(
      'SELECT ingredient_id FROM ingredients WHERE ingredient_id = ?',
      [id]
    );
    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Ingredient with ID ${id} not found`);
    }

    // Check FK references — cannot delete if used in recipes, pantry, etc.
    const [recipeRefs] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM recipeingredients WHERE ingredient_id = ?',
      [id]
    );
    if (Number(recipeRefs[0].cnt) > 0) {
      return ApiResponse.error(
        res, 409,
        `Cannot delete ingredient — it is used in ${recipeRefs[0].cnt} recipe(s). Remove it from those recipes first.`
      );
    }

    await pool.query('DELETE FROM ingredients WHERE ingredient_id = ?', [id]);

    return ApiResponse.success(res, 200, 'Ingredient deleted successfully', null);
  } catch (error) {
    // MySQL FK violation fallback
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return ApiResponse.error(res, 409, 'Cannot delete — ingredient is referenced by existing records');
    }
    next(error);
  }
};

module.exports = {
  getAllIngredients,
  searchIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
};
