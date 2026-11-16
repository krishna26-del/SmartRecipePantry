/**
 * controllers/dietaryTagController.js
 *
 * Public endpoints — no authentication required.
 *
 * GET /api/dietary-tags       → list all tags
 * GET /api/dietary-tags/:id   → get one tag by ID
 */

const { pool }    = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');

// ─── GET /api/dietary-tags ────────────────────────────────────────────────────
const getAllDietaryTags = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT tag_id, tag_name FROM dietary_tags ORDER BY tag_name ASC'
    );

    return ApiResponse.success(res, 200, 'Dietary tags retrieved successfully', {
      dietary_tags: rows,
      count: rows.length,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/dietary-tags/:id ───────────────────────────────────────────────
const getDietaryTagById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT tag_id, tag_name FROM dietary_tags WHERE tag_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return ApiResponse.error(res, 404, `Dietary tag with ID ${id} not found`);
    }

    return ApiResponse.success(res, 200, 'Dietary tag retrieved successfully', {
      dietary_tag: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllDietaryTags, getDietaryTagById };
