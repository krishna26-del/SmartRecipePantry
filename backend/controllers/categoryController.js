/**
 * controllers/categoryController.js
 *
 * Public endpoints — no authentication required.
 *
 * GET /api/categories        → list all categories (sorted by name)
 * GET /api/categories/:id    → get one category by primary key
 */

const { pool }      = require('../config/db');
const ApiResponse   = require('../utils/ApiResponse');

// ─── GET /api/categories ─────────────────────────────────────────────────────
const getAllCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT category_id, category_name, description FROM categories ORDER BY category_name ASC'
    );

    return ApiResponse.success(res, 200, 'Categories retrieved successfully', {
      categories: rows,
      count: rows.length,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/categories/:id ─────────────────────────────────────────────────
const getCategoryById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT category_id, category_name, description FROM categories WHERE category_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return ApiResponse.error(res, 404, `Category with ID ${id} not found`);
    }

    return ApiResponse.success(res, 200, 'Category retrieved successfully', {
      category: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllCategories, getCategoryById };
