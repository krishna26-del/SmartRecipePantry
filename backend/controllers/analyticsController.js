/**
 * controllers/analyticsController.js
 *
 * Provides comprehensive analytical insights across all project modules:
 * Pantry, Recipes, Shopping Lists, Meal Planning, Cooking History, and Food Waste.
 *
 * All metrics are strictly calculated from real database records for req.user.user_id.
 */

const { pool } = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');

// ─── GET /api/analytics/dashboard ─────────────────────────────────────────────
const getDashboardAnalytics = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    // 1. Pantry Statistics
    const [pantryRows] = await pool.query(
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

    // 2. Recipe Statistics
    const [recipeRows] = await pool.query(
      `SELECT
         COUNT(CASE WHEN source_type = 'PREDEFINED' OR user_id = ? THEN 1 END) AS total_available,
         COUNT(CASE WHEN user_id = ? THEN 1 END) AS user_created,
         COUNT(CASE WHEN source_type = 'PREDEFINED' THEN 1 END) AS predefined
       FROM recipes`,
      [userId, userId]
    );

    const [[{ favorite_count }]] = await pool.query(
      'SELECT COUNT(*) AS favorite_count FROM favorites WHERE user_id = ?',
      [userId]
    );

    // 3. Shopping Statistics
    const [shoppingRows] = await pool.query(
      `SELECT
         COUNT(DISTINCT sl.list_id) AS total_lists,
         COUNT(sli.list_item_id) AS total_items,
         SUM(CASE WHEN sli.is_purchased = 1 THEN 1 ELSE 0 END) AS purchased_items,
         SUM(CASE WHEN sli.list_item_id IS NOT NULL AND (sli.is_purchased = 0 OR sli.is_purchased IS NULL) THEN 1 ELSE 0 END) AS pending_items
       FROM shopping_lists sl
       LEFT JOIN shopping_list_items sli ON sli.list_id = sl.list_id
       WHERE sl.user_id = ?`,
      [userId]
    );

    // 4. Meal Planning Statistics
    const [mealRows] = await pool.query(
      `SELECT
         COUNT(DISTINCT mp.meal_plan_id) AS total_plans,
         COUNT(mpi.meal_item_id) AS total_planned_meals,
         SUM(CASE WHEN mpi.planned_date >= CURDATE() THEN 1 ELSE 0 END) AS upcoming_meals
       FROM meal_plans mp
       LEFT JOIN meal_plan_items mpi ON mpi.meal_plan_id = mp.meal_plan_id
       WHERE mp.user_id = ?`,
      [userId]
    );

    // 5. Cooking Statistics
    const [cookingSummary] = await pool.query(
      `SELECT
         COUNT(*) AS total_history_records,
         COUNT(DISTINCT recipe_id) AS distinct_recipes_cooked,
         SUM(servings_made) AS total_servings_made
       FROM cooking_history
       WHERE user_id = ?`,
      [userId]
    );

    const [recentCooked] = await pool.query(
      `SELECT
         ch.history_id,
         ch.recipe_id,
         r.recipe_name,
         c.category_name,
         ch.cooked_at,
         ch.servings_made
       FROM cooking_history ch
       JOIN recipes r ON r.recipe_id = ch.recipe_id
       LEFT JOIN categories c ON c.category_id = r.category_id
       WHERE ch.user_id = ?
       ORDER BY ch.cooked_at DESC
       LIMIT 5`,
      [userId]
    );

    // 6. Food Waste Statistics
    const [[{ total_waste_records }]] = await pool.query(
      'SELECT COUNT(*) AS total_waste_records FROM food_waste WHERE user_id = ?',
      [userId]
    );

    const [wasteByUnit] = await pool.query(
      `SELECT unit, SUM(quantity) AS total_quantity, COUNT(*) AS count
       FROM food_waste
       WHERE user_id = ?
       GROUP BY unit
       ORDER BY count DESC`,
      [userId]
    );

    const [mostWasted] = await pool.query(
      `SELECT
         i.ingredient_id,
         i.ingredient_name,
         fw.unit,
         SUM(fw.quantity) AS total_quantity,
         COUNT(*) AS occurrences
       FROM food_waste fw
       JOIN ingredients i ON i.ingredient_id = fw.ingredient_id
       WHERE fw.user_id = ?
       GROUP BY fw.ingredient_id, fw.unit
       ORDER BY occurrences DESC, total_quantity DESC
       LIMIT 5`,
      [userId]
    );

    const [wasteByReason] = await pool.query(
      `SELECT reason, COUNT(*) AS count
       FROM food_waste
       WHERE user_id = ?
       GROUP BY reason
       ORDER BY count DESC`,
      [userId]
    );

    const p = pantryRows[0] || {};
    const r = recipeRows[0] || {};
    const s = shoppingRows[0] || {};
    const m = mealRows[0] || {};
    const c = cookingSummary[0] || {};

    const totalShopItems = Number(s.total_items) || 0;
    const purchasedShopItems = Number(s.purchased_items) || 0;
    const shoppingCompletionPct = totalShopItems > 0 ? Math.round((purchasedShopItems / totalShopItems) * 100) : 0;

    return ApiResponse.success(res, 200, 'Main dashboard analytics retrieved successfully', {
      pantry: {
        total_items: Number(p.total_items) || 0,
        distinct_ingredients: Number(p.distinct_ingredients) || 0,
        expired_items: Number(p.expired_items) || 0,
        expiring_soon_items: Number(p.expiring_soon_items) || 0,
        active_items: Number(p.active_items) || 0,
      },
      recipes: {
        total_available: Number(r.total_available) || 0,
        user_created: Number(r.user_created) || 0,
        predefined: Number(r.predefined) || 0,
        favorite_count: Number(favorite_count) || 0,
      },
      shopping: {
        total_lists: Number(s.total_lists) || 0,
        total_items: totalShopItems,
        purchased_items: purchasedShopItems,
        pending_items: Number(s.pending_items) || 0,
        completion_percentage: shoppingCompletionPct,
      },
      meal_planning: {
        total_plans: Number(m.total_plans) || 0,
        total_planned_meals: Number(m.total_planned_meals) || 0,
        upcoming_meals: Number(m.upcoming_meals) || 0,
      },
      cooking: {
        total_history_records: Number(c.total_history_records) || 0,
        distinct_recipes_cooked: Number(c.distinct_recipes_cooked) || 0,
        total_servings_made: Number(c.total_servings_made) || 0,
        recent_cooked: recentCooked,
      },
      food_waste: {
        total_records: Number(total_waste_records) || 0,
        waste_by_unit: wasteByUnit.map((u) => ({
          unit: u.unit,
          total_quantity: Number(u.total_quantity),
          count: Number(u.count),
        })),
        most_wasted_ingredients: mostWasted.map((w) => ({
          ...w,
          total_quantity: Number(w.total_quantity),
          occurrences: Number(w.occurrences),
        })),
        waste_by_reason: wasteByReason.map((w) => ({
          reason: w.reason,
          count: Number(w.count),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/pantry ────────────────────────────────────────────────
const getPantryAnalytics = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [pantrySummary] = await pool.query(
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

    const [quantitiesByUnit] = await pool.query(
      `SELECT unit, SUM(quantity) AS total_quantity, COUNT(*) AS item_count
       FROM pantry_items
       WHERE user_id = ?
       GROUP BY unit
       ORDER BY item_count DESC`,
      [userId]
    );

    const [categoryDistribution] = await pool.query(
      `SELECT
         c.category_name,
         COUNT(DISTINCT p.ingredient_id) AS ingredient_count
       FROM pantry_items p
       JOIN recipeingredients ri ON ri.ingredient_id = p.ingredient_id
       JOIN recipes r ON r.recipe_id = ri.recipe_id
       JOIN categories c ON c.category_id = r.category_id
       WHERE p.user_id = ?
       GROUP BY c.category_id, c.category_name
       ORDER BY ingredient_count DESC`,
      [userId]
    );

    const p = pantrySummary[0] || {};

    return ApiResponse.success(res, 200, 'Pantry analytics retrieved', {
      total_items: Number(p.total_items) || 0,
      distinct_ingredients: Number(p.distinct_ingredients) || 0,
      expired_items: Number(p.expired_items) || 0,
      expiring_soon_items: Number(p.expiring_soon_items) || 0,
      active_items: Number(p.active_items) || 0,
      quantities_by_unit: quantitiesByUnit.map((u) => ({
        unit: u.unit,
        total_quantity: Number(u.total_quantity),
        item_count: Number(u.item_count),
      })),
      category_distribution: categoryDistribution,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/recipes ───────────────────────────────────────────────
const getRecipeAnalytics = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [counts] = await pool.query(
      `SELECT
         COUNT(CASE WHEN source_type = 'PREDEFINED' OR user_id = ? THEN 1 END) AS total_available,
         COUNT(CASE WHEN user_id = ? THEN 1 END) AS user_created,
         COUNT(CASE WHEN source_type = 'PREDEFINED' THEN 1 END) AS predefined
       FROM recipes`,
      [userId, userId]
    );

    const [mostCooked] = await pool.query(
      `SELECT
         r.recipe_id,
         r.recipe_name,
         c.category_name,
         COUNT(ch.history_id) AS cook_count,
         SUM(ch.servings_made) AS total_servings
       FROM cooking_history ch
       JOIN recipes r ON r.recipe_id = ch.recipe_id
       LEFT JOIN categories c ON c.category_id = r.category_id
       WHERE ch.user_id = ?
       GROUP BY r.recipe_id, r.recipe_name, c.category_name
       ORDER BY cook_count DESC
       LIMIT 5`,
      [userId]
    );

    const [mostFavorited] = await pool.query(
      `SELECT
         r.recipe_id,
         r.recipe_name,
         c.category_name,
         COUNT(f.user_id) AS favorite_count
       FROM favorites f
       JOIN recipes r ON r.recipe_id = f.recipe_id
       LEFT JOIN categories c ON c.category_id = r.category_id
       GROUP BY r.recipe_id, r.recipe_name, c.category_name
       ORDER BY favorite_count DESC
       LIMIT 5`,
      []
    );

    const [byCategory] = await pool.query(
      `SELECT
         c.category_id,
         c.category_name,
         COUNT(r.recipe_id) AS recipe_count
       FROM categories c
       LEFT JOIN recipes r ON r.category_id = c.category_id
         AND (r.source_type = 'PREDEFINED' OR r.user_id = ?)
       GROUP BY c.category_id, c.category_name
       ORDER BY recipe_count DESC`,
      [userId]
    );

    const [byDifficulty] = await pool.query(
      `SELECT
         difficulty,
         COUNT(*) AS count
       FROM recipes
       WHERE source_type = 'PREDEFINED' OR user_id = ?
       GROUP BY difficulty
       ORDER BY count DESC`,
      [userId]
    );

    const c = counts[0] || {};

    return ApiResponse.success(res, 200, 'Recipe analytics retrieved', {
      total_available: Number(c.total_available) || 0,
      user_created: Number(c.user_created) || 0,
      predefined: Number(c.predefined) || 0,
      most_frequently_cooked: mostCooked.map((m) => ({
        ...m,
        cook_count: Number(m.cook_count),
        total_servings: Number(m.total_servings),
      })),
      most_favorited: mostFavorited.map((f) => ({
        ...f,
        favorite_count: Number(f.favorite_count),
      })),
      recipes_by_category: byCategory.map((cat) => ({
        ...cat,
        recipe_count: Number(cat.recipe_count),
      })),
      recipes_by_difficulty: byDifficulty.map((d) => ({
        difficulty: d.difficulty,
        count: Number(d.count),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/cooking ───────────────────────────────────────────────
const getCookingAnalytics = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [summary] = await pool.query(
      `SELECT
         COUNT(*) AS total_cooking_records,
         COUNT(DISTINCT recipe_id) AS distinct_recipes_cooked,
         SUM(servings_made) AS total_servings_made,
         SUM(CASE WHEN cooked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS count_last_7_days,
         SUM(CASE WHEN cooked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS count_last_30_days
       FROM cooking_history
       WHERE user_id = ?`,
      [userId]
    );

    const [recentCooked] = await pool.query(
      `SELECT
         ch.history_id,
         ch.recipe_id,
         r.recipe_name,
         ch.cooked_at,
         ch.servings_made,
         ch.notes
       FROM cooking_history ch
       JOIN recipes r ON r.recipe_id = ch.recipe_id
       WHERE ch.user_id = ?
       ORDER BY ch.cooked_at DESC
       LIMIT 5`,
      [userId]
    );

    const [mostCooked] = await pool.query(
      `SELECT
         r.recipe_id,
         r.recipe_name,
         COUNT(ch.history_id) AS times_cooked,
         SUM(ch.servings_made) AS total_servings
       FROM cooking_history ch
       JOIN recipes r ON r.recipe_id = ch.recipe_id
       WHERE ch.user_id = ?
       GROUP BY r.recipe_id, r.recipe_name
       ORDER BY times_cooked DESC
       LIMIT 5`,
      [userId]
    );

    const [activityByDate] = await pool.query(
      `SELECT
         DATE(cooked_at) AS date,
         COUNT(*) AS count,
         SUM(servings_made) AS servings
       FROM cooking_history
       WHERE user_id = ?
       GROUP BY DATE(cooked_at)
       ORDER BY date DESC
       LIMIT 14`,
      [userId]
    );

    const s = summary[0] || {};

    return ApiResponse.success(res, 200, 'Cooking analytics retrieved', {
      total_cooking_records: Number(s.total_cooking_records) || 0,
      distinct_recipes_cooked: Number(s.distinct_recipes_cooked) || 0,
      total_servings_made: Number(s.total_servings_made) || 0,
      count_last_7_days: Number(s.count_last_7_days) || 0,
      count_last_30_days: Number(s.count_last_30_days) || 0,
      recently_cooked: recentCooked,
      most_frequently_cooked: mostCooked.map((m) => ({
        ...m,
        times_cooked: Number(m.times_cooked),
        total_servings: Number(m.total_servings),
      })),
      activity_by_date: activityByDate.map((a) => ({
        date: a.date,
        count: Number(a.count),
        servings: Number(a.servings),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/food-waste ────────────────────────────────────────────
const getFoodWasteAnalytics = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [[{ total_records }]] = await pool.query(
      'SELECT COUNT(*) AS total_records FROM food_waste WHERE user_id = ?',
      [userId]
    );

    const [quantitiesByUnit] = await pool.query(
      `SELECT unit, SUM(quantity) AS total_quantity, COUNT(*) AS count
       FROM food_waste
       WHERE user_id = ?
       GROUP BY unit
       ORDER BY count DESC`,
      [userId]
    );

    const [mostWasted] = await pool.query(
      `SELECT
         i.ingredient_id,
         i.ingredient_name,
         fw.unit,
         SUM(fw.quantity) AS total_quantity,
         COUNT(*) AS count
       FROM food_waste fw
       JOIN ingredients i ON i.ingredient_id = fw.ingredient_id
       WHERE fw.user_id = ?
       GROUP BY fw.ingredient_id, fw.unit
       ORDER BY count DESC, total_quantity DESC
       LIMIT 5`,
      [userId]
    );

    const [byReason] = await pool.query(
      `SELECT reason, COUNT(*) AS count
       FROM food_waste
       WHERE user_id = ?
       GROUP BY reason
       ORDER BY count DESC`,
      [userId]
    );

    const [byDate] = await pool.query(
      `SELECT
         DATE(wasted_at) AS date,
         COUNT(*) AS incident_count
       FROM food_waste
       WHERE user_id = ?
       GROUP BY DATE(wasted_at)
       ORDER BY date DESC
       LIMIT 14`,
      [userId]
    );

    return ApiResponse.success(res, 200, 'Food waste analytics retrieved', {
      total_records: Number(total_records) || 0,
      quantities_by_unit: quantitiesByUnit.map((u) => ({
        unit: u.unit,
        total_quantity: Number(u.total_quantity),
        count: Number(u.count),
      })),
      most_wasted_ingredients: mostWasted.map((w) => ({
        ...w,
        total_quantity: Number(w.total_quantity),
        count: Number(w.count),
      })),
      waste_by_reason: byReason.map((r) => ({
        reason: r.reason,
        count: Number(r.count),
      })),
      waste_by_date: byDate.map((d) => ({
        date: d.date,
        incident_count: Number(d.incident_count),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/shopping ──────────────────────────────────────────────
const getShoppingAnalytics = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [summary] = await pool.query(
      `SELECT
         COUNT(DISTINCT sl.list_id) AS total_lists,
         COUNT(sli.list_item_id) AS total_items,
         SUM(CASE WHEN sli.is_purchased = 1 THEN 1 ELSE 0 END) AS purchased_items,
         SUM(CASE WHEN sli.list_item_id IS NOT NULL AND (sli.is_purchased = 0 OR sli.is_purchased IS NULL) THEN 1 ELSE 0 END) AS pending_items
       FROM shopping_lists sl
       LEFT JOIN shopping_list_items sli ON sli.list_id = sl.list_id
       WHERE sl.user_id = ?`,
      [userId]
    );

    const [listBreakdown] = await pool.query(
      `SELECT
         sl.list_id,
         sl.list_name,
         sl.status,
         COUNT(sli.list_item_id) AS total_items,
         SUM(CASE WHEN sli.is_purchased = 1 THEN 1 ELSE 0 END) AS purchased_items
       FROM shopping_lists sl
       LEFT JOIN shopping_list_items sli ON sli.list_id = sl.list_id
       WHERE sl.user_id = ?
       GROUP BY sl.list_id
       ORDER BY sl.created_at DESC`,
      [userId]
    );

    const s = summary[0] || {};
    const totalItems = Number(s.total_items) || 0;
    const purchasedItems = Number(s.purchased_items) || 0;
    const completionPct = totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0;

    return ApiResponse.success(res, 200, 'Shopping analytics retrieved', {
      total_lists: Number(s.total_lists) || 0,
      total_items: totalItems,
      purchased_items: purchasedItems,
      pending_items: Number(s.pending_items) || 0,
      completion_percentage: completionPct,
      lists: listBreakdown.map((l) => {
        const tot = Number(l.total_items) || 0;
        const pur = Number(l.purchased_items) || 0;
        return {
          ...l,
          total_items: tot,
          purchased_items: pur,
          completion_percentage: tot > 0 ? Math.round((pur / tot) * 100) : 0,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/analytics/meal-planning ─────────────────────────────────────────
const getMealPlanningAnalytics = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [summary] = await pool.query(
      `SELECT
         COUNT(DISTINCT mp.meal_plan_id) AS total_plans,
         COUNT(mpi.meal_item_id) AS total_planned_meals,
         SUM(CASE WHEN mpi.planned_date >= CURDATE() THEN 1 ELSE 0 END) AS upcoming_meals
       FROM meal_plans mp
       LEFT JOIN meal_plan_items mpi ON mpi.meal_plan_id = mp.meal_plan_id
       WHERE mp.user_id = ?`,
      [userId]
    );

    const [byType] = await pool.query(
      `SELECT
         mpi.meal_type,
         COUNT(*) AS count
       FROM meal_plans mp
       JOIN meal_plan_items mpi ON mpi.meal_plan_id = mp.meal_plan_id
       WHERE mp.user_id = ?
       GROUP BY mpi.meal_type
       ORDER BY count DESC`,
      [userId]
    );

    const [byStatus] = await pool.query(
      `SELECT
         mpi.status,
         COUNT(*) AS count
       FROM meal_plans mp
       JOIN meal_plan_items mpi ON mpi.meal_plan_id = mp.meal_plan_id
       WHERE mp.user_id = ?
       GROUP BY mpi.status
       ORDER BY count DESC`,
      [userId]
    );

    const m = summary[0] || {};

    return ApiResponse.success(res, 200, 'Meal planning analytics retrieved', {
      total_plans: Number(m.total_plans) || 0,
      total_planned_meals: Number(m.total_planned_meals) || 0,
      upcoming_meals: Number(m.upcoming_meals) || 0,
      meals_by_type: byType.map((t) => ({
        meal_type: t.meal_type,
        count: Number(t.count),
      })),
      meals_by_status: byStatus.map((s) => ({
        status: s.status,
        count: Number(s.count),
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardAnalytics,
  getPantryAnalytics,
  getRecipeAnalytics,
  getCookingAnalytics,
  getFoodWasteAnalytics,
  getShoppingAnalytics,
  getMealPlanningAnalytics,
};
