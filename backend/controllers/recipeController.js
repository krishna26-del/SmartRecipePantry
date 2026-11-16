/**
 * controllers/recipeController.js
 *
 * GET  /api/recipes              → list all (public, paginated, filterable)
 * GET  /api/recipes/my-recipes   → authenticated user's recipes
 * GET  /api/recipes/:id          → full recipe detail (public)
 * POST /api/recipes              → create   [protected]
 * PUT  /api/recipes/:id          → update   [protected, owner only]
 * DELETE /api/recipes/:id        → delete   [protected, owner only]
 *
 * Database constraint reminder:
 *   PREDEFINED  → user_id IS NULL
 *   USER_CREATED → user_id IS NOT NULL
 *   CHECK chk_recipes_source_owner enforces this at the DB level too.
 */

const { pool }    = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(50,  Math.max(1, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Fetch the full ingredient list and dietary tags for a set of recipe IDs.
 * Returns two Maps keyed by recipe_id.
 */
const fetchRelated = async (recipeIds) => {
  if (recipeIds.length === 0) return { ingredientMap: new Map(), tagMap: new Map() };

  const placeholders = recipeIds.map(() => '?').join(',');

  const [ingRows] = await pool.query(
    `SELECT ri.recipe_id,
            ri.ingredient_id,
            i.ingredient_name,
            ri.quantity,
            ri.unit,
            ri.notes
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

  const ingredientMap = new Map();
  ingRows.forEach((r) => {
    if (!ingredientMap.has(r.recipe_id)) ingredientMap.set(r.recipe_id, []);
    ingredientMap.get(r.recipe_id).push({
      ingredient_id:   r.ingredient_id,
      ingredient_name: r.ingredient_name,
      quantity:        r.quantity,
      unit:            r.unit,
      notes:           r.notes || null,
    });
  });

  const tagMap = new Map();
  tagRows.forEach((r) => {
    if (!tagMap.has(r.recipe_id)) tagMap.set(r.recipe_id, []);
    tagMap.get(r.recipe_id).push({ tag_id: r.tag_id, tag_name: r.tag_name });
  });

  return { ingredientMap, tagMap };
};

/**
 * Validate that all ingredient_ids in the payload exist in the DB.
 * Returns an error string or null.
 */
const validateIngredientIds = async (ingredients) => {
  const ids = ingredients.map((i) => i.ingredient_id);

  // Duplicate ingredient_id check
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    return 'Duplicate ingredient IDs are not allowed in a single recipe';
  }

  if (ids.length === 0) return null;

  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT ingredient_id FROM ingredients WHERE ingredient_id IN (${placeholders})`,
    ids
  );

  if (rows.length !== ids.length) {
    const foundIds = rows.map((r) => r.ingredient_id);
    const missing  = ids.filter((id) => !foundIds.includes(id));
    return `Ingredient ID(s) not found: ${missing.join(', ')}`;
  }

  return null;
};

/**
 * Validate that all dietary tag IDs exist.
 */
const validateTagIds = async (tagIds) => {
  if (!tagIds || tagIds.length === 0) return null;

  const unique = [...new Set(tagIds)];
  const placeholders = unique.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT tag_id FROM dietary_tags WHERE tag_id IN (${placeholders})`,
    unique
  );

  if (rows.length !== unique.length) {
    const foundIds = rows.map((r) => r.tag_id);
    const missing  = unique.filter((id) => !foundIds.includes(id));
    return `Dietary tag ID(s) not found: ${missing.join(', ')}`;
  }

  return null;
};

// ─── GET /api/recipes ────────────────────────────────────────────────────────
const getAllRecipes = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req.query);

  try {
    // Build dynamic WHERE clause
    const conditions = [];
    const params     = [];

    if (req.query.search) {
      conditions.push('r.recipe_name LIKE ?');
      params.push(`%${req.query.search.trim()}%`);
    }
    if (req.query.category_id) {
      conditions.push('r.category_id = ?');
      params.push(Number(req.query.category_id));
    }
    if (req.query.difficulty) {
      conditions.push('r.difficulty = ?');
      params.push(req.query.difficulty.toUpperCase());
    }

    // Dietary tag filter — requires a subquery to avoid duplicate recipes from JOIN
    if (req.query.dietary_tag_id) {
      conditions.push(
        'EXISTS (SELECT 1 FROM recipe_dietary_tags rdt WHERE rdt.recipe_id = r.recipe_id AND rdt.tag_id = ?)'
      );
      params.push(Number(req.query.dietary_tag_id));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Allowed sort columns (whitelist to prevent injection)
    const sortColumnMap = {
      recipe_name:  'r.recipe_name',
      created_at:   'r.created_at',
      difficulty:   'r.difficulty',
    };
    const sortBy  = sortColumnMap[req.query.sort_by] || 'r.created_at';
    const sortDir = req.query.sort_dir === 'ASC' ? 'ASC' : 'DESC';

    // Count query
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM recipes r ${whereClause}`,
      params
    );

    // Data query
    const [rows] = await pool.query(
      `SELECT
         r.recipe_id, r.recipe_name, r.description,
         r.prep_time, r.cook_time, r.difficulty, r.servings,
         r.source_type, r.created_at,
         r.user_id,
         c.category_id, c.category_name
       FROM recipes r
       JOIN categories c ON c.category_id = r.category_id
       ${whereClause}
       ORDER BY ${sortBy} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Attach ingredients + tags
    const recipeIds = rows.map((r) => r.recipe_id);
    const { ingredientMap, tagMap } = await fetchRelated(recipeIds);

    const recipes = rows.map((r) => ({
      recipe_id:    r.recipe_id,
      recipe_name:  r.recipe_name,
      description:  r.description,
      prep_time:    r.prep_time,
      cook_time:    r.cook_time,
      difficulty:   r.difficulty,
      servings:     r.servings,
      source_type:  r.source_type,
      created_at:   r.created_at,
      user_id:      r.user_id,
      category: { category_id: r.category_id, category_name: r.category_name },
      ingredients:   ingredientMap.get(r.recipe_id) || [],
      dietary_tags:  tagMap.get(r.recipe_id)        || [],
    }));

    return ApiResponse.success(res, 200, 'Recipes retrieved successfully', {
      recipes,
      pagination: {
        page, limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/recipes/my-recipes ─────────────────────────────────────────────
const getMyRecipes = async (req, res, next) => {
  const userId = req.user.user_id;         // from protect middleware
  const { page, limit, offset } = parsePagination(req.query);

  try {
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM recipes WHERE user_id = ?',
      [userId]
    );

    const [rows] = await pool.query(
      `SELECT
         r.recipe_id, r.recipe_name, r.description,
         r.prep_time, r.cook_time, r.difficulty, r.servings,
         r.source_type, r.created_at,
         c.category_id, c.category_name
       FROM recipes r
       JOIN categories c ON c.category_id = r.category_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const recipeIds = rows.map((r) => r.recipe_id);
    const { ingredientMap, tagMap } = await fetchRelated(recipeIds);

    const recipes = rows.map((r) => ({
      recipe_id:   r.recipe_id,
      recipe_name: r.recipe_name,
      description: r.description,
      prep_time:   r.prep_time,
      cook_time:   r.cook_time,
      difficulty:  r.difficulty,
      servings:    r.servings,
      source_type: r.source_type,
      created_at:  r.created_at,
      category: { category_id: r.category_id, category_name: r.category_name },
      ingredients:  ingredientMap.get(r.recipe_id) || [],
      dietary_tags: tagMap.get(r.recipe_id)        || [],
    }));

    return ApiResponse.success(res, 200, 'Your recipes retrieved successfully', {
      recipes,
      pagination: {
        page, limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/recipes/:id ─────────────────────────────────────────────────────
const getRecipeById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT
         r.recipe_id, r.recipe_name, r.description, r.instructions,
         r.prep_time, r.cook_time, r.difficulty, r.servings,
         r.source_type, r.created_at, r.user_id,
         c.category_id, c.category_name, c.description AS category_description,
         u.name AS owner_name
       FROM recipes r
       JOIN categories c ON c.category_id = r.category_id
       LEFT JOIN users u ON u.user_id = r.user_id
       WHERE r.recipe_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return ApiResponse.error(res, 404, `Recipe with ID ${id} not found`);
    }

    const r = rows[0];
    const { ingredientMap, tagMap } = await fetchRelated([r.recipe_id]);

    const recipe = {
      recipe_id:    r.recipe_id,
      recipe_name:  r.recipe_name,
      description:  r.description,
      instructions: r.instructions,
      prep_time:    r.prep_time,
      cook_time:    r.cook_time,
      difficulty:   r.difficulty,
      servings:     r.servings,
      source_type:  r.source_type,
      created_at:   r.created_at,
      category: {
        category_id:          r.category_id,
        category_name:        r.category_name,
        category_description: r.category_description,
      },
      owner: r.owner_name ? { user_id: r.user_id, name: r.owner_name } : null,
      ingredients:   ingredientMap.get(r.recipe_id) || [],
      dietary_tags:  tagMap.get(r.recipe_id)        || [],
    };

    return ApiResponse.success(res, 200, 'Recipe retrieved successfully', { recipe });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/recipes ────────────────────────────────────────────────────────
const createRecipe = async (req, res, next) => {
  const userId = req.user.user_id;   // NEVER from body
  const {
    recipe_name, description, category_id, instructions,
    prep_time, cook_time, difficulty, servings,
    ingredients = [], dietary_tag_ids = [],
  } = req.body;

  let connection;
  try {
    // ── Pre-flight validations (DB existence checks) ──────────────────────
    // 1. Category exists
    const [catRows] = await pool.query(
      'SELECT category_id FROM categories WHERE category_id = ?', [category_id]
    );
    if (catRows.length === 0) {
      return ApiResponse.error(res, 400, `Category ID ${category_id} does not exist`);
    }

    // 2. All ingredient IDs valid + no duplicates
    if (ingredients.length === 0) {
      return ApiResponse.error(res, 400, 'A recipe must have at least one ingredient');
    }
    const ingError = await validateIngredientIds(ingredients);
    if (ingError) return ApiResponse.error(res, 400, ingError);

    // 3. All tag IDs valid
    const tagError = await validateTagIds(dietary_tag_ids);
    if (tagError) return ApiResponse.error(res, 400, tagError);

    // ── Transaction ───────────────────────────────────────────────────────
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Insert recipe — user_id comes from JWT, source_type is always USER_CREATED
    const [result] = await connection.query(
      `INSERT INTO recipes
         (user_id, category_id, recipe_name, description, instructions,
          prep_time, cook_time, difficulty, servings, source_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USER_CREATED')`,
      [userId, category_id, recipe_name.trim(), description || null,
       instructions.trim(), prep_time, cook_time,
       difficulty.toUpperCase(), servings]
    );

    const newRecipeId = result.insertId;

    // Insert ingredients
    for (const ing of ingredients) {
      await connection.query(
        `INSERT INTO recipeingredients (recipe_id, ingredient_id, quantity, unit, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [newRecipeId, ing.ingredient_id, ing.quantity, ing.unit.trim(), ing.notes || null]
      );
    }

    // Insert dietary tags (deduplicated)
    const uniqueTagIds = [...new Set(dietary_tag_ids)];
    for (const tagId of uniqueTagIds) {
      await connection.query(
        'INSERT INTO recipe_dietary_tags (recipe_id, tag_id) VALUES (?, ?)',
        [newRecipeId, tagId]
      );
    }

    await connection.commit();

    // Fetch the full created recipe to return
    const [recipeRows] = await pool.query(
      `SELECT r.recipe_id, r.recipe_name, r.description, r.instructions,
              r.prep_time, r.cook_time, r.difficulty, r.servings,
              r.source_type, r.created_at, r.user_id,
              c.category_id, c.category_name
       FROM recipes r JOIN categories c ON c.category_id = r.category_id
       WHERE r.recipe_id = ?`,
      [newRecipeId]
    );
    const { ingredientMap, tagMap } = await fetchRelated([newRecipeId]);
    const rec = recipeRows[0];

    return ApiResponse.success(res, 201, 'Recipe created successfully', {
      recipe: {
        recipe_id:   rec.recipe_id,
        recipe_name: rec.recipe_name,
        description: rec.description,
        instructions: rec.instructions,
        prep_time:   rec.prep_time,
        cook_time:   rec.cook_time,
        difficulty:  rec.difficulty,
        servings:    rec.servings,
        source_type: rec.source_type,
        created_at:  rec.created_at,
        user_id:     rec.user_id,
        category: { category_id: rec.category_id, category_name: rec.category_name },
        ingredients:  ingredientMap.get(newRecipeId) || [],
        dietary_tags: tagMap.get(newRecipeId)        || [],
      },
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

// ─── PUT /api/recipes/:id ─────────────────────────────────────────────────────
const updateRecipe = async (req, res, next) => {
  const userId   = req.user.user_id;
  const recipeId = req.params.id;

  const {
    recipe_name, description, category_id, instructions,
    prep_time, cook_time, difficulty, servings,
    ingredients = [], dietary_tag_ids = [],
  } = req.body;

  let connection;
  try {
    // ── Ownership & type checks ───────────────────────────────────────────
    const [existing] = await pool.query(
      'SELECT recipe_id, user_id, source_type FROM recipes WHERE recipe_id = ?',
      [recipeId]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Recipe with ID ${recipeId} not found`);
    }

    const recipe = existing[0];

    if (recipe.source_type === 'PREDEFINED') {
      return ApiResponse.error(res, 403, 'Predefined recipes cannot be modified');
    }

    if (recipe.user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to edit this recipe');
    }

    // ── Pre-flight validations ────────────────────────────────────────────
    if (category_id !== undefined) {
      const [catRows] = await pool.query(
        'SELECT category_id FROM categories WHERE category_id = ?', [category_id]
      );
      if (catRows.length === 0) {
        return ApiResponse.error(res, 400, `Category ID ${category_id} does not exist`);
      }
    }

    if (ingredients.length === 0) {
      return ApiResponse.error(res, 400, 'A recipe must have at least one ingredient');
    }
    const ingError = await validateIngredientIds(ingredients);
    if (ingError) return ApiResponse.error(res, 400, ingError);

    const tagError = await validateTagIds(dietary_tag_ids);
    if (tagError) return ApiResponse.error(res, 400, tagError);

    // ── Transaction ───────────────────────────────────────────────────────
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Update recipe fields — user_id and source_type are immutable
    await connection.query(
      `UPDATE recipes SET
         recipe_name  = ?,
         description  = ?,
         category_id  = ?,
         instructions = ?,
         prep_time    = ?,
         cook_time    = ?,
         difficulty   = ?,
         servings     = ?
       WHERE recipe_id = ?`,
      [
        recipe_name.trim(),
        description || null,
        category_id,
        instructions.trim(),
        prep_time,
        cook_time,
        difficulty.toUpperCase(),
        servings,
        recipeId,
      ]
    );

    // Replace ingredients: delete old, insert new
    await connection.query(
      'DELETE FROM recipeingredients WHERE recipe_id = ?', [recipeId]
    );
    for (const ing of ingredients) {
      await connection.query(
        `INSERT INTO recipeingredients (recipe_id, ingredient_id, quantity, unit, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [recipeId, ing.ingredient_id, ing.quantity, ing.unit.trim(), ing.notes || null]
      );
    }

    // Replace dietary tags
    await connection.query(
      'DELETE FROM recipe_dietary_tags WHERE recipe_id = ?', [recipeId]
    );
    const uniqueTagIds = [...new Set(dietary_tag_ids)];
    for (const tagId of uniqueTagIds) {
      await connection.query(
        'INSERT INTO recipe_dietary_tags (recipe_id, tag_id) VALUES (?, ?)',
        [recipeId, tagId]
      );
    }

    await connection.commit();

    // Fetch updated recipe
    const [recipeRows] = await pool.query(
      `SELECT r.recipe_id, r.recipe_name, r.description, r.instructions,
              r.prep_time, r.cook_time, r.difficulty, r.servings,
              r.source_type, r.created_at, r.user_id,
              c.category_id, c.category_name
       FROM recipes r JOIN categories c ON c.category_id = r.category_id
       WHERE r.recipe_id = ?`,
      [recipeId]
    );
    const { ingredientMap, tagMap } = await fetchRelated([Number(recipeId)]);
    const rec = recipeRows[0];

    return ApiResponse.success(res, 200, 'Recipe updated successfully', {
      recipe: {
        recipe_id:    rec.recipe_id,
        recipe_name:  rec.recipe_name,
        description:  rec.description,
        instructions: rec.instructions,
        prep_time:    rec.prep_time,
        cook_time:    rec.cook_time,
        difficulty:   rec.difficulty,
        servings:     rec.servings,
        source_type:  rec.source_type,
        created_at:   rec.created_at,
        user_id:      rec.user_id,
        category: { category_id: rec.category_id, category_name: rec.category_name },
        ingredients:  ingredientMap.get(rec.recipe_id) || [],
        dietary_tags: tagMap.get(rec.recipe_id)        || [],
      },
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

// ─── DELETE /api/recipes/:id ─────────────────────────────────────────────────
const deleteRecipe = async (req, res, next) => {
  const userId   = req.user.user_id;
  const recipeId = req.params.id;

  let connection;
  try {
    const [existing] = await pool.query(
      'SELECT recipe_id, user_id, source_type FROM recipes WHERE recipe_id = ?',
      [recipeId]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Recipe with ID ${recipeId} not found`);
    }

    const recipe = existing[0];

    if (recipe.source_type === 'PREDEFINED') {
      return ApiResponse.error(res, 403, 'Predefined recipes cannot be deleted');
    }

    if (recipe.user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to delete this recipe');
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Delete child rows first to respect FK constraints
    await connection.query('DELETE FROM recipeingredients   WHERE recipe_id = ?', [recipeId]);
    await connection.query('DELETE FROM recipe_dietary_tags WHERE recipe_id = ?', [recipeId]);

    // These tables also reference recipes — clean them up too
    await connection.query('DELETE FROM favorites            WHERE recipe_id = ?', [recipeId]);
    await connection.query('DELETE FROM cooking_history      WHERE recipe_id = ?', [recipeId]);
    await connection.query('DELETE FROM meal_plan_items      WHERE recipe_id = ?', [recipeId]);

    // NULL-out shopping_list_items.added_from_recipe_id rather than deleting the rows
    await connection.query(
      'UPDATE shopping_list_items SET added_from_recipe_id = NULL WHERE added_from_recipe_id = ?',
      [recipeId]
    );

    await connection.query('DELETE FROM recipes WHERE recipe_id = ?', [recipeId]);

    await connection.commit();

    return ApiResponse.success(res, 200, 'Recipe deleted successfully', null);
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getAllRecipes,
  getMyRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
};
