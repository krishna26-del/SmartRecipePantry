/**
 * controllers/pantryController.js
 *
 * Handles pantry inventory management for authenticated users.
 * All operations are strictly scoped to req.user.user_id.
 */

const { pool } = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');

// ─── GET /api/pantry ──────────────────────────────────────────────────────────
const getPantry = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [rows] = await pool.query(
      `SELECT
         p.pantry_item_id,
         p.user_id,
         p.ingredient_id,
         i.ingredient_name,
         i.default_unit,
         p.quantity,
         p.unit,
         p.expiry_date,
         p.added_at,
         CASE
           WHEN p.expiry_date IS NULL THEN 'NO_EXPIRY'
           WHEN p.expiry_date < CURDATE() THEN 'EXPIRED'
           WHEN p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'EXPIRING_SOON'
           ELSE 'GOOD'
         END AS status
       FROM pantry_items p
       JOIN ingredients i ON i.ingredient_id = p.ingredient_id
       WHERE p.user_id = ?
       ORDER BY p.expiry_date ASC, p.added_at DESC`,
      [userId]
    );

    return ApiResponse.success(res, 200, 'Pantry items retrieved successfully', {
      pantry: rows.map((r) => ({ ...r, quantity: Number(r.quantity) })),
      count: rows.length,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/pantry/summary ──────────────────────────────────────────────────
const getPantrySummary = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [summaryRows] = await pool.query(
      `SELECT
         COUNT(*) AS total_items,
         COUNT(DISTINCT ingredient_id) AS distinct_ingredients,
         SUM(CASE WHEN expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired_items,
         SUM(CASE WHEN expiry_date >= CURDATE() AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS expiring_soon_items,
         SUM(CASE WHEN expiry_date IS NULL OR expiry_date >= CURDATE() THEN 1 ELSE 0 END) AS active_items
       FROM pantry_items
       WHERE user_id = ?`,
      [userId]
    );

    const summary = summaryRows[0] || {};

    return ApiResponse.success(res, 200, 'Pantry summary retrieved successfully', {
      total_items: Number(summary.total_items) || 0,
      distinct_ingredients: Number(summary.distinct_ingredients) || 0,
      expired_items: Number(summary.expired_items) || 0,
      expiring_soon_items: Number(summary.expiring_soon_items) || 0,
      active_items: Number(summary.active_items) || 0,
      expiry_warning_threshold_days: 7,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/pantry/expiring ─────────────────────────────────────────────────
const getExpiringItems = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [rows] = await pool.query(
      `SELECT
         p.pantry_item_id,
         p.user_id,
         p.ingredient_id,
         i.ingredient_name,
         p.quantity,
         p.unit,
         p.expiry_date,
         DATEDIFF(p.expiry_date, CURDATE()) AS days_remaining
       FROM pantry_items p
       JOIN ingredients i ON i.ingredient_id = p.ingredient_id
       WHERE p.user_id = ?
         AND p.expiry_date >= CURDATE()
         AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ORDER BY p.expiry_date ASC`,
      [userId]
    );

    return ApiResponse.success(res, 200, 'Expiring pantry items retrieved', {
      items: rows,
      count: rows.length,
      threshold_days: 7,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/pantry/expired ──────────────────────────────────────────────────
const getExpiredItems = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [rows] = await pool.query(
      `SELECT
         p.pantry_item_id,
         p.user_id,
         p.ingredient_id,
         i.ingredient_name,
         p.quantity,
         p.unit,
         p.expiry_date,
         DATEDIFF(CURDATE(), p.expiry_date) AS days_expired
       FROM pantry_items p
       JOIN ingredients i ON i.ingredient_id = p.ingredient_id
       WHERE p.user_id = ?
         AND p.expiry_date < CURDATE()
       ORDER BY p.expiry_date DESC`,
      [userId]
    );

    return ApiResponse.success(res, 200, 'Expired pantry items retrieved', {
      items: rows,
      count: rows.length,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/pantry/:id ──────────────────────────────────────────────────────
const getPantryItemById = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT
         p.pantry_item_id,
         p.user_id,
         p.ingredient_id,
         i.ingredient_name,
         i.default_unit,
         p.quantity,
         p.unit,
         p.expiry_date,
         p.added_at
       FROM pantry_items p
       JOIN ingredients i ON i.ingredient_id = p.ingredient_id
       WHERE p.pantry_item_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return ApiResponse.error(res, 404, `Pantry item with ID ${id} not found`);
    }

    const item = rows[0];

    // Ownership check
    if (item.user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to view this pantry item');
    }

    return ApiResponse.success(res, 200, 'Pantry item retrieved successfully', {
      item: { ...item, quantity: Number(item.quantity) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/pantry ─────────────────────────────────────────────────────────
const addPantryItem = async (req, res, next) => {
  const userId = req.user.user_id;
  const { ingredient_id, quantity, unit, expiry_date } = req.body;

  try {
    // 1. Verify ingredient exists
    const [ingRows] = await pool.query(
      'SELECT ingredient_id, ingredient_name FROM ingredients WHERE ingredient_id = ?',
      [ingredient_id]
    );

    if (ingRows.length === 0) {
      return ApiResponse.error(res, 400, `Ingredient ID ${ingredient_id} does not exist`);
    }

    const parsedExpiry = expiry_date ? expiry_date.split('T')[0] : null;

    // 2. Insert into pantry_items
    const [result] = await pool.query(
      `INSERT INTO pantry_items (user_id, ingredient_id, quantity, unit, expiry_date)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, ingredient_id, quantity, unit.trim(), parsedExpiry]
    );

    const [createdRows] = await pool.query(
      `SELECT
         p.pantry_item_id,
         p.user_id,
         p.ingredient_id,
         i.ingredient_name,
         p.quantity,
         p.unit,
         p.expiry_date,
         p.added_at
       FROM pantry_items p
       JOIN ingredients i ON i.ingredient_id = p.ingredient_id
       WHERE p.pantry_item_id = ?`,
      [result.insertId]
    );

    return ApiResponse.success(res, 201, 'Ingredient added to pantry successfully', {
      item: { ...createdRows[0], quantity: Number(createdRows[0].quantity) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/pantry/:id ──────────────────────────────────────────────────────
const updatePantryItem = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { quantity, unit, expiry_date } = req.body;

  try {
    const [existing] = await pool.query(
      'SELECT pantry_item_id, user_id FROM pantry_items WHERE pantry_item_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Pantry item with ID ${id} not found`);
    }

    if (existing[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to edit this pantry item');
    }

    const updates = [];
    const params = [];

    if (quantity !== undefined) {
      updates.push('quantity = ?');
      params.push(quantity);
    }
    if (unit !== undefined) {
      updates.push('unit = ?');
      params.push(unit.trim());
    }
    if (expiry_date !== undefined) {
      updates.push('expiry_date = ?');
      params.push(expiry_date ? expiry_date.split('T')[0] : null);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(
        `UPDATE pantry_items SET ${updates.join(', ')} WHERE pantry_item_id = ?`,
        params
      );
    }

    const [updatedRows] = await pool.query(
      `SELECT
         p.pantry_item_id,
         p.user_id,
         p.ingredient_id,
         i.ingredient_name,
         p.quantity,
         p.unit,
         p.expiry_date,
         p.added_at
       FROM pantry_items p
       JOIN ingredients i ON i.ingredient_id = p.ingredient_id
       WHERE p.pantry_item_id = ?`,
      [id]
    );

    return ApiResponse.success(res, 200, 'Pantry item updated successfully', {
      item: { ...updatedRows[0], quantity: Number(updatedRows[0].quantity) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/pantry/:id ───────────────────────────────────────────────────
const deletePantryItem = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  try {
    const [existing] = await pool.query(
      'SELECT pantry_item_id, user_id FROM pantry_items WHERE pantry_item_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Pantry item with ID ${id} not found`);
    }

    if (existing[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to delete this pantry item');
    }

    // Set pantry_item_id to NULL in food_waste if referenced, or allow deletion
    await pool.query('UPDATE food_waste SET pantry_item_id = NULL WHERE pantry_item_id = ?', [id]);
    await pool.query('DELETE FROM pantry_items WHERE pantry_item_id = ?', [id]);

    return ApiResponse.success(res, 200, 'Pantry item deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPantry,
  getPantrySummary,
  getExpiringItems,
  getExpiredItems,
  getPantryItemById,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
};
