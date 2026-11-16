/**
 * controllers/mealPlanController.js
 *
 * Handles meal planning calendar and planned meal items.
 * Validates date ranges and recipe existence with transaction-backed deletes.
 */

const { pool } = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');

// ─── GET /api/meal-plans ──────────────────────────────────────────────────────
const getMealPlans = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [rows] = await pool.query(
      `SELECT
         mp.meal_plan_id,
         mp.user_id,
         mp.plan_name,
         mp.start_date,
         mp.end_date,
         mp.created_at,
         COUNT(mpi.meal_item_id) AS total_meals
       FROM meal_plans mp
       LEFT JOIN meal_plan_items mpi ON mpi.meal_plan_id = mp.meal_plan_id
       WHERE mp.user_id = ?
       GROUP BY mp.meal_plan_id
       ORDER BY mp.start_date DESC`,
      [userId]
    );

    const plans = rows.map((r) => ({
      ...r,
      total_meals: Number(r.total_meals) || 0,
    }));

    return ApiResponse.success(res, 200, 'Meal plans retrieved successfully', {
      plans,
      count: plans.length,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/meal-plans/:id ──────────────────────────────────────────────────
const getMealPlanById = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  try {
    const [planRows] = await pool.query(
      'SELECT meal_plan_id, user_id, plan_name, start_date, end_date, created_at FROM meal_plans WHERE meal_plan_id = ?',
      [id]
    );

    if (planRows.length === 0) {
      return ApiResponse.error(res, 404, `Meal plan with ID ${id} not found`);
    }

    const plan = planRows[0];
    if (plan.user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to view this meal plan');
    }

    const [itemRows] = await pool.query(
      `SELECT
         mpi.meal_item_id,
         mpi.meal_plan_id,
         mpi.recipe_id,
         r.recipe_name,
         r.description AS recipe_description,
         r.prep_time,
         r.cook_time,
         r.difficulty,
         c.category_name,
         mpi.planned_date,
         mpi.meal_type,
         mpi.planned_servings,
         mpi.status
       FROM meal_plan_items mpi
       JOIN recipes r ON r.recipe_id = mpi.recipe_id
       LEFT JOIN categories c ON c.category_id = r.category_id
       WHERE mpi.meal_plan_id = ?
       ORDER BY mpi.planned_date ASC, mpi.meal_type ASC`,
      [id]
    );

    return ApiResponse.success(res, 200, 'Meal plan retrieved successfully', {
      plan: {
        ...plan,
        items: itemRows,
        total_meals: itemRows.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/meal-plans ─────────────────────────────────────────────────────
const createMealPlan = async (req, res, next) => {
  const userId = req.user.user_id;
  const { plan_name, start_date, end_date } = req.body;

  try {
    const cleanStart = start_date.split('T')[0];
    const cleanEnd = end_date.split('T')[0];

    const [result] = await pool.query(
      'INSERT INTO meal_plans (user_id, plan_name, start_date, end_date) VALUES (?, ?, ?, ?)',
      [userId, plan_name.trim(), cleanStart, cleanEnd]
    );

    const [created] = await pool.query(
      'SELECT meal_plan_id, user_id, plan_name, start_date, end_date, created_at FROM meal_plans WHERE meal_plan_id = ?',
      [result.insertId]
    );

    return ApiResponse.success(res, 201, 'Meal plan created successfully', {
      plan: {
        ...created[0],
        items: [],
        total_meals: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/meal-plans/:id ──────────────────────────────────────────────────
const updateMealPlan = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { plan_name, start_date, end_date } = req.body;

  try {
    const [existing] = await pool.query(
      'SELECT meal_plan_id, user_id, start_date, end_date FROM meal_plans WHERE meal_plan_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Meal plan with ID ${id} not found`);
    }
    if (existing[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to update this meal plan');
    }

    const updates = [];
    const params = [];

    if (plan_name !== undefined) {
      updates.push('plan_name = ?');
      params.push(plan_name.trim());
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(start_date.split('T')[0]);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(end_date.split('T')[0]);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(
        `UPDATE meal_plans SET ${updates.join(', ')} WHERE meal_plan_id = ?`,
        params
      );
    }

    const [updated] = await pool.query(
      'SELECT meal_plan_id, user_id, plan_name, start_date, end_date, created_at FROM meal_plans WHERE meal_plan_id = ?',
      [id]
    );

    return ApiResponse.success(res, 200, 'Meal plan updated successfully', {
      plan: updated[0],
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/meal-plans/:id ───────────────────────────────────────────────
const deleteMealPlan = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  let connection;
  try {
    const [existing] = await pool.query(
      'SELECT meal_plan_id, user_id FROM meal_plans WHERE meal_plan_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Meal plan with ID ${id} not found`);
    }
    if (existing[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to delete this meal plan');
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query('DELETE FROM meal_plan_items WHERE meal_plan_id = ?', [id]);
    await connection.query('DELETE FROM meal_plans WHERE meal_plan_id = ?', [id]);

    await connection.commit();

    return ApiResponse.success(res, 200, 'Meal plan deleted successfully', null);
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

// ─── POST /api/meal-plans/:id/items ───────────────────────────────────────────
const addMealPlanItem = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { recipe_id, planned_date, meal_type, planned_servings, status } = req.body;

  try {
    // 1. Verify meal plan exists and belongs to user
    const [planRows] = await pool.query(
      'SELECT meal_plan_id, user_id, start_date, end_date FROM meal_plans WHERE meal_plan_id = ?',
      [id]
    );
    if (planRows.length === 0) {
      return ApiResponse.error(res, 404, `Meal plan with ID ${id} not found`);
    }
    if (planRows[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to modify this meal plan');
    }

    const plan = planRows[0];
    const cleanDate = planned_date.split('T')[0];

    // 2. Validate planned_date falls within the meal plan range
    const planStart = new Date(plan.start_date).toISOString().split('T')[0];
    const planEnd = new Date(plan.end_date).toISOString().split('T')[0];

    if (cleanDate < planStart || cleanDate > planEnd) {
      return ApiResponse.error(
        res,
        400,
        `Planned date (${cleanDate}) must be between ${planStart} and ${planEnd}`
      );
    }

    // 3. Verify recipe exists
    const [recipeRows] = await pool.query(
      'SELECT recipe_id, recipe_name FROM recipes WHERE recipe_id = ?',
      [recipe_id]
    );
    if (recipeRows.length === 0) {
      return ApiResponse.error(res, 400, `Recipe ID ${recipe_id} does not exist`);
    }

    const [result] = await pool.query(
      `INSERT INTO meal_plan_items
         (meal_plan_id, recipe_id, planned_date, meal_type, planned_servings, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        recipe_id,
        cleanDate,
        meal_type.toUpperCase(),
        planned_servings,
        (status || 'PLANNED').toUpperCase(),
      ]
    );

    const [itemRows] = await pool.query(
      `SELECT
         mpi.meal_item_id, mpi.meal_plan_id, mpi.recipe_id,
         r.recipe_name, mpi.planned_date, mpi.meal_type,
         mpi.planned_servings, mpi.status
       FROM meal_plan_items mpi
       JOIN recipes r ON r.recipe_id = mpi.recipe_id
       WHERE mpi.meal_item_id = ?`,
      [result.insertId]
    );

    return ApiResponse.success(res, 201, 'Planned meal added successfully', {
      item: itemRows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/meal-plans/:id/items/:itemId ────────────────────────────────────
const updateMealPlanItem = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id, itemId } = req.params;
  const { planned_date, meal_type, planned_servings, status } = req.body;

  try {
    // 1. Verify plan ownership
    const [planRows] = await pool.query(
      'SELECT meal_plan_id, user_id, start_date, end_date FROM meal_plans WHERE meal_plan_id = ?',
      [id]
    );
    if (planRows.length === 0) {
      return ApiResponse.error(res, 404, `Meal plan with ID ${id} not found`);
    }
    if (planRows[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to modify this meal plan');
    }

    // 2. Verify item exists in this plan
    const [itemRows] = await pool.query(
      'SELECT meal_item_id FROM meal_plan_items WHERE meal_item_id = ? AND meal_plan_id = ?',
      [itemId, id]
    );
    if (itemRows.length === 0) {
      return ApiResponse.error(res, 404, `Meal item with ID ${itemId} not found in this meal plan`);
    }

    const updates = [];
    const params = [];

    if (planned_date !== undefined) {
      const cleanDate = planned_date.split('T')[0];
      const planStart = new Date(planRows[0].start_date).toISOString().split('T')[0];
      const planEnd = new Date(planRows[0].end_date).toISOString().split('T')[0];

      if (cleanDate < planStart || cleanDate > planEnd) {
        return ApiResponse.error(
          res,
          400,
          `Planned date (${cleanDate}) must be between ${planStart} and ${planEnd}`
        );
      }
      updates.push('planned_date = ?');
      params.push(cleanDate);
    }

    if (meal_type !== undefined) {
      updates.push('meal_type = ?');
      params.push(meal_type.toUpperCase());
    }
    if (planned_servings !== undefined) {
      updates.push('planned_servings = ?');
      params.push(planned_servings);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status.toUpperCase());
    }

    if (updates.length > 0) {
      params.push(itemId);
      await pool.query(
        `UPDATE meal_plan_items SET ${updates.join(', ')} WHERE meal_item_id = ?`,
        params
      );
    }

    const [updated] = await pool.query(
      `SELECT
         mpi.meal_item_id, mpi.meal_plan_id, mpi.recipe_id,
         r.recipe_name, mpi.planned_date, mpi.meal_type,
         mpi.planned_servings, mpi.status
       FROM meal_plan_items mpi
       JOIN recipes r ON r.recipe_id = mpi.recipe_id
       WHERE mpi.meal_item_id = ?`,
      [itemId]
    );

    return ApiResponse.success(res, 200, 'Planned meal updated successfully', {
      item: updated[0],
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/meal-plans/:id/items/:itemId ─────────────────────────────────
const deleteMealPlanItem = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id, itemId } = req.params;

  try {
    const [planRows] = await pool.query(
      'SELECT meal_plan_id, user_id FROM meal_plans WHERE meal_plan_id = ?',
      [id]
    );
    if (planRows.length === 0) {
      return ApiResponse.error(res, 404, `Meal plan with ID ${id} not found`);
    }
    if (planRows[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to modify this meal plan');
    }

    const [itemRows] = await pool.query(
      'SELECT meal_item_id FROM meal_plan_items WHERE meal_item_id = ? AND meal_plan_id = ?',
      [itemId, id]
    );
    if (itemRows.length === 0) {
      return ApiResponse.error(res, 404, `Meal item with ID ${itemId} not found in this meal plan`);
    }

    await pool.query('DELETE FROM meal_plan_items WHERE meal_item_id = ?', [itemId]);

    return ApiResponse.success(res, 200, 'Planned meal removed successfully', null);
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/meal-plans/:id/items ────────────────────────────────────────────
const getMealPlanItems = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  try {
    const [planRows] = await pool.query(
      'SELECT meal_plan_id, user_id FROM meal_plans WHERE meal_plan_id = ?',
      [id]
    );
    if (planRows.length === 0) {
      return ApiResponse.error(res, 404, `Meal plan with ID ${id} not found`);
    }
    if (planRows[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to view this meal plan');
    }

    const [items] = await pool.query(
      `SELECT
         mpi.meal_item_id, mpi.meal_plan_id, mpi.recipe_id,
         r.recipe_name, r.difficulty, c.category_name,
         mpi.planned_date, mpi.meal_type, mpi.planned_servings, mpi.status
       FROM meal_plan_items mpi
       JOIN recipes r ON r.recipe_id = mpi.recipe_id
       LEFT JOIN categories c ON c.category_id = r.category_id
       WHERE mpi.meal_plan_id = ?
       ORDER BY mpi.planned_date ASC, mpi.meal_type ASC`,
      [id]
    );

    return ApiResponse.success(res, 200, 'Planned meals retrieved successfully', {
      items,
      count: items.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMealPlans,
  getMealPlanById,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  addMealPlanItem,
  updateMealPlanItem,
  deleteMealPlanItem,
  getMealPlanItems,
};
