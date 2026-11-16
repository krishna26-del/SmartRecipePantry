/**
 * controllers/shoppingListController.js
 *
 * Handles shopping list CRUD, item management, and automated missing-ingredient
 * generation from recipes using user pantry state with MySQL transactions.
 */

const { pool } = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');
const recommendationService = require('../services/recommendationService');
const { convertQuantity, normalizeUnit } = require('../utils/unitConverter');

// ─── GET /api/shopping-lists ──────────────────────────────────────────────────
const getShoppingLists = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const [rows] = await pool.query(
      `SELECT
         sl.list_id,
         sl.user_id,
         sl.list_name,
         sl.status,
         sl.created_at,
         COUNT(sli.list_item_id) AS total_items,
         SUM(CASE WHEN sli.is_purchased = 1 THEN 1 ELSE 0 END) AS purchased_items
       FROM shopping_lists sl
       LEFT JOIN shopping_list_items sli ON sli.list_id = sl.list_id
       WHERE sl.user_id = ?
       GROUP BY sl.list_id
       ORDER BY sl.created_at DESC`,
      [userId]
    );

    const lists = rows.map((r) => ({
      ...r,
      total_items: Number(r.total_items) || 0,
      purchased_items: Number(r.purchased_items) || 0,
    }));

    return ApiResponse.success(res, 200, 'Shopping lists retrieved successfully', {
      lists,
      count: lists.length,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/shopping-lists/:id ──────────────────────────────────────────────
const getShoppingListById = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  try {
    const [listRows] = await pool.query(
      'SELECT list_id, user_id, list_name, status, created_at FROM shopping_lists WHERE list_id = ?',
      [id]
    );

    if (listRows.length === 0) {
      return ApiResponse.error(res, 404, `Shopping list with ID ${id} not found`);
    }

    const list = listRows[0];
    if (list.user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to view this shopping list');
    }

    const [itemRows] = await pool.query(
      `SELECT
         sli.list_item_id,
         sli.list_id,
         sli.ingredient_id,
         i.ingredient_name,
         i.default_unit,
         sli.quantity,
         sli.unit,
         sli.is_purchased,
         sli.added_from_recipe_id,
         r.recipe_name AS added_from_recipe_name
       FROM shopping_list_items sli
       JOIN ingredients i ON i.ingredient_id = sli.ingredient_id
       LEFT JOIN recipes r ON r.recipe_id = sli.added_from_recipe_id
       WHERE sli.list_id = ?
       ORDER BY sli.is_purchased ASC, sli.list_item_id ASC`,
      [id]
    );

    const items = itemRows.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      is_purchased: Boolean(item.is_purchased),
    }));

    return ApiResponse.success(res, 200, 'Shopping list retrieved successfully', {
      list: {
        ...list,
        items,
        total_items: items.length,
        purchased_items: items.filter((i) => i.is_purchased).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/shopping-lists ─────────────────────────────────────────────────
const createShoppingList = async (req, res, next) => {
  const userId = req.user.user_id;
  const { list_name } = req.body;

  try {
    const [result] = await pool.query(
      'INSERT INTO shopping_lists (user_id, list_name, status) VALUES (?, ?, "ACTIVE")',
      [userId, list_name.trim()]
    );

    const [createdRows] = await pool.query(
      'SELECT list_id, user_id, list_name, status, created_at FROM shopping_lists WHERE list_id = ?',
      [result.insertId]
    );

    return ApiResponse.success(res, 201, 'Shopping list created successfully', {
      list: {
        ...createdRows[0],
        items: [],
        total_items: 0,
        purchased_items: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/shopping-lists/:id ──────────────────────────────────────────────
const updateShoppingList = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { list_name, status } = req.body;

  try {
    const [existing] = await pool.query(
      'SELECT list_id, user_id FROM shopping_lists WHERE list_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Shopping list with ID ${id} not found`);
    }
    if (existing[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to update this shopping list');
    }

    const updates = [];
    const params = [];

    if (list_name !== undefined) {
      updates.push('list_name = ?');
      params.push(list_name.trim());
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status.toUpperCase());
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(
        `UPDATE shopping_lists SET ${updates.join(', ')} WHERE list_id = ?`,
        params
      );
    }

    const [updatedRows] = await pool.query(
      'SELECT list_id, user_id, list_name, status, created_at FROM shopping_lists WHERE list_id = ?',
      [id]
    );

    return ApiResponse.success(res, 200, 'Shopping list updated successfully', {
      list: updatedRows[0],
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/shopping-lists/:id ───────────────────────────────────────────
const deleteShoppingList = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  let connection;
  try {
    const [existing] = await pool.query(
      'SELECT list_id, user_id FROM shopping_lists WHERE list_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return ApiResponse.error(res, 404, `Shopping list with ID ${id} not found`);
    }
    if (existing[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to delete this shopping list');
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Delete items first to respect foreign key
    await connection.query('DELETE FROM shopping_list_items WHERE list_id = ?', [id]);
    await connection.query('DELETE FROM shopping_lists WHERE list_id = ?', [id]);

    await connection.commit();

    return ApiResponse.success(res, 200, 'Shopping list deleted successfully', null);
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

// ─── POST /api/shopping-lists/:id/items ───────────────────────────────────────
const addItem = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { ingredient_id, quantity, unit } = req.body;

  try {
    // 1. Verify list ownership
    const [listRows] = await pool.query(
      'SELECT list_id, user_id FROM shopping_lists WHERE list_id = ?',
      [id]
    );
    if (listRows.length === 0) {
      return ApiResponse.error(res, 404, `Shopping list with ID ${id} not found`);
    }
    if (listRows[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to modify this shopping list');
    }

    // 2. Verify ingredient exists
    const [ingRows] = await pool.query(
      'SELECT ingredient_id, ingredient_name FROM ingredients WHERE ingredient_id = ?',
      [ingredient_id]
    );
    if (ingRows.length === 0) {
      return ApiResponse.error(res, 400, `Ingredient ID ${ingredient_id} does not exist`);
    }

    // 3. Duplicate handling policy: if item exists with same ingredient_id and unit, update quantity
    const [existingItems] = await pool.query(
      `SELECT list_item_id, quantity, unit
       FROM shopping_list_items
       WHERE list_id = ? AND ingredient_id = ? AND LOWER(unit) = LOWER(?)`,
      [id, ingredient_id, unit.trim()]
    );

    let targetItemId;
    if (existingItems.length > 0) {
      const existing = existingItems[0];
      const newQty = Number(existing.quantity) + Number(quantity);
      await pool.query(
        'UPDATE shopping_list_items SET quantity = ?, is_purchased = 0 WHERE list_item_id = ?',
        [newQty, existing.list_item_id]
      );
      targetItemId = existing.list_item_id;
    } else {
      const [insertResult] = await pool.query(
        `INSERT INTO shopping_list_items (list_id, ingredient_id, quantity, unit, is_purchased)
         VALUES (?, ?, ?, ?, 0)`,
        [id, ingredient_id, quantity, unit.trim()]
      );
      targetItemId = insertResult.insertId;
    }

    const [itemRows] = await pool.query(
      `SELECT
         sli.list_item_id, sli.list_id, sli.ingredient_id,
         i.ingredient_name, sli.quantity, sli.unit, sli.is_purchased
       FROM shopping_list_items sli
       JOIN ingredients i ON i.ingredient_id = sli.ingredient_id
       WHERE sli.list_item_id = ?`,
      [targetItemId]
    );

    return ApiResponse.success(res, 201, 'Item added to shopping list', {
      item: {
        ...itemRows[0],
        quantity: Number(itemRows[0].quantity),
        is_purchased: Boolean(itemRows[0].is_purchased),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/shopping-lists/:id/items/:itemId ────────────────────────────────
const updateItem = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id, itemId } = req.params;
  const { quantity, unit, is_purchased } = req.body;

  try {
    // 1. Verify list ownership
    const [listRows] = await pool.query(
      'SELECT list_id, user_id FROM shopping_lists WHERE list_id = ?',
      [id]
    );
    if (listRows.length === 0) {
      return ApiResponse.error(res, 404, `Shopping list with ID ${id} not found`);
    }
    if (listRows[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to modify this shopping list');
    }

    // 2. Verify item exists in this list
    const [itemRows] = await pool.query(
      'SELECT list_item_id FROM shopping_list_items WHERE list_item_id = ? AND list_id = ?',
      [itemId, id]
    );
    if (itemRows.length === 0) {
      return ApiResponse.error(res, 404, `Item ID ${itemId} not found in this shopping list`);
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
    if (is_purchased !== undefined) {
      updates.push('is_purchased = ?');
      params.push(is_purchased ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(itemId);
      await pool.query(
        `UPDATE shopping_list_items SET ${updates.join(', ')} WHERE list_item_id = ?`,
        params
      );
    }

    const [updated] = await pool.query(
      `SELECT
         sli.list_item_id, sli.list_id, sli.ingredient_id,
         i.ingredient_name, sli.quantity, sli.unit, sli.is_purchased
       FROM shopping_list_items sli
       JOIN ingredients i ON i.ingredient_id = sli.ingredient_id
       WHERE sli.list_item_id = ?`,
      [itemId]
    );

    return ApiResponse.success(res, 200, 'Shopping list item updated', {
      item: {
        ...updated[0],
        quantity: Number(updated[0].quantity),
        is_purchased: Boolean(updated[0].is_purchased),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/shopping-lists/:id/items/:itemId ─────────────────────────────
const deleteItem = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id, itemId } = req.params;

  try {
    const [listRows] = await pool.query(
      'SELECT list_id, user_id FROM shopping_lists WHERE list_id = ?',
      [id]
    );
    if (listRows.length === 0) {
      return ApiResponse.error(res, 404, `Shopping list with ID ${id} not found`);
    }
    if (listRows[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to modify this shopping list');
    }

    const [itemRows] = await pool.query(
      'SELECT list_item_id FROM shopping_list_items WHERE list_item_id = ? AND list_id = ?',
      [itemId, id]
    );
    if (itemRows.length === 0) {
      return ApiResponse.error(res, 404, `Item ID ${itemId} not found in this shopping list`);
    }

    await pool.query('DELETE FROM shopping_list_items WHERE list_item_id = ?', [itemId]);

    return ApiResponse.success(res, 200, 'Item removed from shopping list', null);
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/shopping-lists/:id/items/:itemId/purchase ─────────────────────
const togglePurchase = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id, itemId } = req.params;
  const { is_purchased } = req.body;

  try {
    const [listRows] = await pool.query(
      'SELECT list_id, user_id FROM shopping_lists WHERE list_id = ?',
      [id]
    );
    if (listRows.length === 0) {
      return ApiResponse.error(res, 404, `Shopping list with ID ${id} not found`);
    }
    if (listRows[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to modify this shopping list');
    }

    const [itemRows] = await pool.query(
      'SELECT list_item_id, is_purchased FROM shopping_list_items WHERE list_item_id = ? AND list_id = ?',
      [itemId, id]
    );
    if (itemRows.length === 0) {
      return ApiResponse.error(res, 404, `Item ID ${itemId} not found in this shopping list`);
    }

    const newStatus = is_purchased !== undefined ? (is_purchased ? 1 : 0) : (itemRows[0].is_purchased ? 0 : 1);

    await pool.query(
      'UPDATE shopping_list_items SET is_purchased = ? WHERE list_item_id = ?',
      [newStatus, itemId]
    );

    return ApiResponse.success(res, 200, 'Item purchase status toggled', {
      list_item_id: Number(itemId),
      is_purchased: Boolean(newStatus),
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/shopping-lists/:id/generate-from-recipe/:recipeId ──────────────
const generateFromRecipe = async (req, res, next) => {
  const userId = req.user.user_id;
  const { id, recipeId } = req.params;

  let connection;
  try {
    // 1. Verify shopping list ownership
    const [listRows] = await pool.query(
      'SELECT list_id, user_id, list_name FROM shopping_lists WHERE list_id = ?',
      [id]
    );
    if (listRows.length === 0) {
      return ApiResponse.error(res, 404, `Shopping list with ID ${id} not found`);
    }
    if (listRows[0].user_id !== userId) {
      return ApiResponse.error(res, 403, 'You are not authorized to modify this shopping list');
    }

    // 2. Evaluate recipe coverage vs user's pantry
    const availability = await recommendationService.checkRecipeAvailability(userId, recipeId);
    if (!availability) {
      return ApiResponse.error(res, 404, `Recipe with ID ${recipeId} not found`);
    }

    // Missing ingredients to add
    const missingIngredients = availability.missing_ingredients;
    if (missingIngredients.length === 0) {
      return ApiResponse.success(res, 200, 'All ingredients are already available in your pantry!', {
        added_items_count: 0,
        items: [],
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const addedItems = [];

    for (const missing of missingIngredients) {
      const neededQty = missing.missing_quantity > 0 ? missing.missing_quantity : missing.required_quantity;

      // Check if already in shopping list with matching unit
      const [existing] = await connection.query(
        `SELECT list_item_id, quantity, unit
         FROM shopping_list_items
         WHERE list_id = ? AND ingredient_id = ? AND LOWER(unit) = LOWER(?)`,
        [id, missing.ingredient_id, missing.required_unit.trim()]
      );

      if (existing.length > 0) {
        // Increment quantity
        const newQty = Number(existing[0].quantity) + Number(neededQty);
        await connection.query(
          `UPDATE shopping_list_items
           SET quantity = ?, is_purchased = 0, added_from_recipe_id = ?
           WHERE list_item_id = ?`,
          [newQty, recipeId, existing[0].list_item_id]
        );
        addedItems.push({
          ingredient_id: missing.ingredient_id,
          ingredient_name: missing.ingredient_name,
          quantity: newQty,
          unit: missing.required_unit,
          action: 'quantity_incremented',
        });
      } else {
        await connection.query(
          `INSERT INTO shopping_list_items
             (list_id, ingredient_id, quantity, unit, is_purchased, added_from_recipe_id)
           VALUES (?, ?, ?, ?, 0, ?)`,
          [id, missing.ingredient_id, neededQty, missing.required_unit.trim(), recipeId]
        );
        addedItems.push({
          ingredient_id: missing.ingredient_id,
          ingredient_name: missing.ingredient_name,
          quantity: neededQty,
          unit: missing.required_unit,
          action: 'inserted',
        });
      }
    }

    await connection.commit();

    return ApiResponse.success(
      res,
      200,
      `Added ${addedItems.length} missing ingredient(s) from "${availability.recipe_name}" to shopping list`,
      {
        recipe_id: Number(recipeId),
        recipe_name: availability.recipe_name,
        added_items_count: addedItems.length,
        items: addedItems,
      }
    );
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
  getShoppingLists,
  getShoppingListById,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  addItem,
  updateItem,
  deleteItem,
  togglePurchase,
  generateFromRecipe,
};
