/**
 * controllers/foodWasteController.js
 *
 * Handles food waste tracking, categorization, and analytics.
 * Properly separates and groups quantities by unit to prevent unit distortion.
 */

const { pool } = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');

// ─── GET /api/food-waste ──────────────────────────────────────────────────────
const getFoodWaste = async (req, res, next) => {
  const userId = req.user.user_id;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const { ingredient_id, reason, from, to } = req.query;

  try {
    const conditions = ['fw.user_id = ?'];
    const params = [userId];

    if (ingredient_id) {
      conditions.push('fw.ingredient_id = ?');
      params.push(Number(ingredient_id));
    }
    if (reason) {
      conditions.push('fw.reason = ?');
      params.push(reason.trim());
    }
    if (from) {
      conditions.push('DATE(fw.wasted_at) >= ?');
      params.push(from.split('T')[0]);
    }
    if (to) {
      conditions.push('DATE(fw.wasted_at) <= ?');
      params.push(to.split('T')[0]);
    }

    const whereClause = conditions.join(' AND ');

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM food_waste fw WHERE ${whereClause}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT
         fw.waste_id,
         fw.user_id,
         fw.pantry_item_id,
         fw.ingredient_id,
         i.ingredient_name,
         i.default_unit,
         fw.quantity,
         fw.unit,
         fw.reason,
         fw.wasted_at,
         fw.notes
       FROM food_waste fw
       JOIN ingredients i ON i.ingredient_id = fw.ingredient_id
       WHERE ${whereClause}
       ORDER BY fw.wasted_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return ApiResponse.success(res, 200, 'Food waste records retrieved successfully', {
      waste: rows.map((r) => ({ ...r, quantity: Number(r.quantity) })),
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

// ─── GET /api/food-waste/summary ──────────────────────────────────────────────
const getFoodWasteSummary = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    // 1. Total records count
    const [[{ total_records }]] = await pool.query(
      'SELECT COUNT(*) AS total_records FROM food_waste WHERE user_id = ?',
      [userId]
    );

    // 2. Quantity grouped by unit (prevents invalid cross-unit addition)
    const [unitSummary] = await pool.query(
      `SELECT unit, SUM(quantity) AS total_quantity, COUNT(*) AS incident_count
       FROM food_waste
       WHERE user_id = ?
       GROUP BY unit
       ORDER BY incident_count DESC`,
      [userId]
    );

    // 3. Breakdown by reason
    const [reasonSummary] = await pool.query(
      `SELECT reason, COUNT(*) AS count
       FROM food_waste
       WHERE user_id = ?
       GROUP BY reason
       ORDER BY count DESC`,
      [userId]
    );

    // 4. Top wasted ingredients
    const [topIngredients] = await pool.query(
      `SELECT
         i.ingredient_id,
         i.ingredient_name,
         fw.unit,
         SUM(fw.quantity) AS total_quantity,
         COUNT(*) AS waste_occurrences
       FROM food_waste fw
       JOIN ingredients i ON i.ingredient_id = fw.ingredient_id
       WHERE fw.user_id = ?
       GROUP BY fw.ingredient_id, fw.unit
       ORDER BY waste_occurrences DESC, total_quantity DESC
       LIMIT 5`,
      [userId]
    );

    // 5. Waste over time (by month)
    const [monthlyTrend] = await pool.query(
      `SELECT
         DATE_FORMAT(wasted_at, '%Y-%m') AS month,
         COUNT(*) AS records_count
       FROM food_waste
       WHERE user_id = ?
       GROUP BY DATE_FORMAT(wasted_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 6`,
      [userId]
    );

    return ApiResponse.success(res, 200, 'Food waste summary retrieved successfully', {
      summary: {
        total_records: Number(total_records) || 0,
        waste_by_unit: unitSummary.map((u) => ({
          unit: u.unit,
          total_quantity: Number(u.total_quantity),
          incident_count: Number(u.incident_count),
        })),
        waste_by_reason: reasonSummary.map((r) => ({
          reason: r.reason,
          count: Number(r.count),
        })),
        top_wasted_ingredients: topIngredients.map((ing) => ({
          ...ing,
          total_quantity: Number(ing.total_quantity),
          waste_occurrences: Number(ing.waste_occurrences),
        })),
        waste_trend: monthlyTrend.map((m) => ({
          month: m.month,
          records_count: Number(m.records_count),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/food-waste/:id ──────────────────────────────────────────────────
const getFoodWasteById = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT
         fw.waste_id,
         fw.user_id,
         fw.pantry_item_id,
         fw.ingredient_id,
         i.ingredient_name,
         fw.quantity,
         fw.unit,
         fw.reason,
         fw.wasted_at,
         fw.notes
       FROM food_waste fw
       JOIN ingredients i ON i.ingredient_id = fw.ingredient_id
       WHERE fw.waste_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return ApiResponse.error(res, 404, `Food waste record with ID ${id} not found`);
    }

    const record = rows[0];
    if (record.user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to view this food waste record');
    }

    return ApiResponse.success(res, 200, 'Food waste record retrieved', {
      waste: { ...record, quantity: Number(record.quantity) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/food-waste ─────────────────────────────────────────────────────
const createFoodWaste = async (req, res, next) => {
  const userId = req.user.user_id;
  const { pantry_item_id, ingredient_id, quantity, unit, reason, notes, wasted_at } = req.body;

  try {
    // 1. Verify ingredient exists
    const [ingRows] = await pool.query(
      'SELECT ingredient_id, ingredient_name FROM ingredients WHERE ingredient_id = ?',
      [ingredient_id]
    );
    if (ingRows.length === 0) {
      return ApiResponse.error(res, 400, `Ingredient ID ${ingredient_id} does not exist`);
    }

    // 2. If pantry_item_id is provided, verify it belongs to user and matches ingredient
    if (pantry_item_id) {
      const [pantryRows] = await pool.query(
        'SELECT pantry_item_id, user_id, ingredient_id, quantity FROM pantry_items WHERE pantry_item_id = ?',
        [pantry_item_id]
      );
      if (pantryRows.length === 0) {
        return ApiResponse.error(res, 404, `Pantry item with ID ${pantry_item_id} not found`);
      }
      if (pantryRows[0].user_id !== userId) {
        return ApiResponse.error(res, 403, 'Pantry item does not belong to you');
      }
      if (pantryRows[0].ingredient_id !== Number(ingredient_id)) {
        return ApiResponse.error(res, 400, 'Pantry item does not match the specified ingredient');
      }
    }

    const wasteTime = wasted_at ? new Date(wasted_at) : new Date();

    const [result] = await pool.query(
      `INSERT INTO food_waste
         (user_id, pantry_item_id, ingredient_id, quantity, unit, reason, notes, wasted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        pantry_item_id || null,
        ingredient_id,
        quantity,
        unit.trim(),
        reason.trim().toUpperCase(),
        notes || null,
        wasteTime,
      ]
    );

    const [created] = await pool.query(
      `SELECT
         fw.waste_id, fw.user_id, fw.pantry_item_id, fw.ingredient_id,
         i.ingredient_name, fw.quantity, fw.unit, fw.reason, fw.wasted_at, fw.notes
       FROM food_waste fw
       JOIN ingredients i ON i.ingredient_id = fw.ingredient_id
       WHERE fw.waste_id = ?`,
      [result.insertId]
    );

    return ApiResponse.success(res, 201, 'Food waste recorded successfully', {
      waste: { ...created[0], quantity: Number(created[0].quantity) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/food-waste/:id ──────────────────────────────────────────────────
const updateFoodWaste = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { quantity, unit, reason, notes, wasted_at } = req.body;

  try {
    const [existing] = await pool.query(
      'SELECT waste_id, user_id FROM food_waste WHERE waste_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Food waste record with ID ${id} not found`);
    }
    if (existing[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to update this food waste record');
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
    if (reason !== undefined) {
      updates.push('reason = ?');
      params.push(reason.trim().toUpperCase());
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes || null);
    }
    if (wasted_at !== undefined) {
      updates.push('wasted_at = ?');
      params.push(new Date(wasted_at));
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(
        `UPDATE food_waste SET ${updates.join(', ')} WHERE waste_id = ?`,
        params
      );
    }

    const [updated] = await pool.query(
      `SELECT
         fw.waste_id, fw.user_id, fw.pantry_item_id, fw.ingredient_id,
         i.ingredient_name, fw.quantity, fw.unit, fw.reason, fw.wasted_at, fw.notes
       FROM food_waste fw
       JOIN ingredients i ON i.ingredient_id = fw.ingredient_id
       WHERE fw.waste_id = ?`,
      [id]
    );

    return ApiResponse.success(res, 200, 'Food waste record updated successfully', {
      waste: { ...updated[0], quantity: Number(updated[0].quantity) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/food-waste/:id ───────────────────────────────────────────────
const deleteFoodWaste = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  try {
    const [existing] = await pool.query(
      'SELECT waste_id, user_id FROM food_waste WHERE waste_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Food waste record with ID ${id} not found`);
    }
    if (existing[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to delete this food waste record');
    }

    await pool.query('DELETE FROM food_waste WHERE waste_id = ?', [id]);

    return ApiResponse.success(res, 200, 'Food waste record deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFoodWaste,
  getFoodWasteSummary,
  getFoodWasteById,
  createFoodWaste,
  updateFoodWaste,
  deleteFoodWaste,
};
