/**
 * controllers/cookingHistoryController.js
 *
 * Handles recording and querying cooking history for authenticated users.
 * Supports date filtering, recipe filtering, and pagination.
 */

const { pool } = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');

// ─── GET /api/cooking-history ─────────────────────────────────────────────────
const getCookingHistory = async (req, res, next) => {
  const userId = req.user.user_id;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const { recipe_id, from, to } = req.query;

  try {
    const conditions = ['ch.user_id = ?'];
    const params = [userId];

    if (recipe_id) {
      conditions.push('ch.recipe_id = ?');
      params.push(Number(recipe_id));
    }
    if (from) {
      conditions.push('DATE(ch.cooked_at) >= ?');
      params.push(from.split('T')[0]);
    }
    if (to) {
      conditions.push('DATE(ch.cooked_at) <= ?');
      params.push(to.split('T')[0]);
    }

    const whereClause = conditions.join(' AND ');

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM cooking_history ch WHERE ${whereClause}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT
         ch.history_id,
         ch.user_id,
         ch.recipe_id,
         r.recipe_name,
         r.difficulty,
         c.category_name,
         ch.cooked_at,
         ch.servings_made,
         ch.notes
       FROM cooking_history ch
       JOIN recipes r ON r.recipe_id = ch.recipe_id
       LEFT JOIN categories c ON c.category_id = r.category_id
       WHERE ${whereClause}
       ORDER BY ch.cooked_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return ApiResponse.success(res, 200, 'Cooking history retrieved successfully', {
      history: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cooking-history/:id ─────────────────────────────────────────────
const getCookingHistoryById = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT
         ch.history_id,
         ch.user_id,
         ch.recipe_id,
         r.recipe_name,
         r.description,
         r.prep_time,
         r.cook_time,
         r.difficulty,
         c.category_name,
         ch.cooked_at,
         ch.servings_made,
         ch.notes
       FROM cooking_history ch
       JOIN recipes r ON r.recipe_id = ch.recipe_id
       LEFT JOIN categories c ON c.category_id = r.category_id
       WHERE ch.history_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return ApiResponse.error(res, 404, `Cooking history entry with ID ${id} not found`);
    }

    const entry = rows[0];
    if (entry.user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to view this cooking history record');
    }

    return ApiResponse.success(res, 200, 'Cooking history entry retrieved', { history: entry });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/cooking-history ────────────────────────────────────────────────
const createCookingHistory = async (req, res, next) => {
  const userId = req.user.user_id;
  const { recipe_id, servings_made, notes, cooked_at } = req.body;

  try {
    // Verify recipe exists
    const [recipeRows] = await pool.query(
      'SELECT recipe_id, recipe_name FROM recipes WHERE recipe_id = ?',
      [recipe_id]
    );
    if (recipeRows.length === 0) {
      return ApiResponse.error(res, 400, `Recipe ID ${recipe_id} does not exist`);
    }

    const cookedTime = cooked_at ? new Date(cooked_at) : new Date();

    const [result] = await pool.query(
      `INSERT INTO cooking_history (user_id, recipe_id, servings_made, notes, cooked_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, recipe_id, servings_made, notes || null, cookedTime]
    );

    const [created] = await pool.query(
      `SELECT
         ch.history_id, ch.user_id, ch.recipe_id, r.recipe_name,
         ch.cooked_at, ch.servings_made, ch.notes
       FROM cooking_history ch
       JOIN recipes r ON r.recipe_id = ch.recipe_id
       WHERE ch.history_id = ?`,
      [result.insertId]
    );

    return ApiResponse.success(res, 201, 'Cooking activity recorded successfully', {
      history: created[0],
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/cooking-history/:id ─────────────────────────────────────────────
const updateCookingHistory = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { servings_made, notes, cooked_at } = req.body;

  try {
    const [existing] = await pool.query(
      'SELECT history_id, user_id FROM cooking_history WHERE history_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Cooking history entry with ID ${id} not found`);
    }
    if (existing[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to update this cooking history record');
    }

    const updates = [];
    const params = [];

    if (servings_made !== undefined) {
      updates.push('servings_made = ?');
      params.push(servings_made);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes || null);
    }
    if (cooked_at !== undefined) {
      updates.push('cooked_at = ?');
      params.push(new Date(cooked_at));
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(
        `UPDATE cooking_history SET ${updates.join(', ')} WHERE history_id = ?`,
        params
      );
    }

    const [updated] = await pool.query(
      `SELECT
         ch.history_id, ch.user_id, ch.recipe_id, r.recipe_name,
         ch.cooked_at, ch.servings_made, ch.notes
       FROM cooking_history ch
       JOIN recipes r ON r.recipe_id = ch.recipe_id
       WHERE ch.history_id = ?`,
      [id]
    );

    return ApiResponse.success(res, 200, 'Cooking history entry updated successfully', {
      history: updated[0],
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/cooking-history/:id ──────────────────────────────────────────
const deleteCookingHistory = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  try {
    const [existing] = await pool.query(
      'SELECT history_id, user_id FROM cooking_history WHERE history_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Cooking history entry with ID ${id} not found`);
    }
    if (existing[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to delete this cooking history record');
    }

    await pool.query('DELETE FROM cooking_history WHERE history_id = ?', [id]);

    return ApiResponse.success(res, 200, 'Cooking history record deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCookingHistory,
  getCookingHistoryById,
  createCookingHistory,
  updateCookingHistory,
  deleteCookingHistory,
};
