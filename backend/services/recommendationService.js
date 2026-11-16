/**
 * services/recommendationService.js
 *
 * Implements the Smart Recipe Recommendation algorithm based on actual
 * pantry inventory and recipe requirements with dimensional unit conversion.
 */

const { pool } = require('../config/db');
const { compareQuantity, normalizeUnit, convertQuantity } = require('../utils/unitConverter');

/**
 * Fetch and aggregate user's pantry items by ingredient_id.
 * If user has multiple items for the same ingredient, keeps a list of { quantity, unit }.
 */
const getUserPantryMap = async (userId) => {
  const [pantryRows] = await pool.query(
    `SELECT
       p.pantry_item_id,
       p.ingredient_id,
       i.ingredient_name,
       p.quantity,
       p.unit,
       p.expiry_date
     FROM pantry_items p
     JOIN ingredients i ON i.ingredient_id = p.ingredient_id
     WHERE p.user_id = ?
       AND (p.expiry_date IS NULL OR p.expiry_date >= CURDATE())`,
    [userId]
  );

  // Map: ingredient_id -> Array of { quantity, unit, name }
  const pantryMap = new Map();
  for (const item of pantryRows) {
    if (!pantryMap.has(item.ingredient_id)) {
      pantryMap.set(item.ingredient_id, []);
    }
    pantryMap.get(item.ingredient_id).push({
      pantry_item_id: item.pantry_item_id,
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredient_name,
      quantity: Number(item.quantity),
      unit: item.unit,
    });
  }

  return pantryMap;
};

/**
 * Compute total usable quantity of an ingredient in the user's pantry converted into the target unit.
 */
const aggregatePantryQuantity = (pantryItemsForIng, targetUnit) => {
  if (!pantryItemsForIng || pantryItemsForIng.length === 0) {
    return { totalQty: 0, unit: targetUnit, compatible: false, hasItems: false };
  }

  let totalConverted = 0;
  let allCompatible = true;
  const primaryUnit = pantryItemsForIng[0].unit;

  for (const item of pantryItemsForIng) {
    const converted = convertQuantity(item.quantity, item.unit, targetUnit);
    if (converted !== null) {
      totalConverted += converted;
    } else {
      allCompatible = false;
    }
  }

  return {
    totalQty: Number(totalConverted.toFixed(2)),
    unit: targetUnit,
    compatible: allCompatible,
    hasItems: true,
    fallbackRawQty: pantryItemsForIng.reduce((sum, i) => sum + i.quantity, 0),
    primaryUnit,
  };
};

/**
 * Calculate recipe coverage and ingredient availability against user pantry.
 */
const evaluateRecipeCoverage = (recipe, recipeIngredients, userPantryMap) => {
  const totalRequired = recipeIngredients.length;
  if (totalRequired === 0) {
    return null; // Skip recipes without ingredients
  }

  let availableCount = 0;
  const availableIngredients = [];
  const missingIngredients = [];
  const detailedBreakdown = [];

  for (const reqIng of recipeIngredients) {
    const pItems = userPantryMap.get(reqIng.ingredient_id) || [];
    const aggregated = aggregatePantryQuantity(pItems, reqIng.unit);

    let compResult;
    if (!aggregated.hasItems) {
      compResult = {
        compatible: true,
        sufficient: false,
        pantryInRequiredUnit: 0,
        missingQuantity: Number(reqIng.quantity),
        uncertain: false,
      };
    } else {
      compResult = compareQuantity(
        aggregated.totalQty,
        reqIng.unit,
        reqIng.quantity,
        reqIng.unit
      );
      if (!aggregated.compatible && aggregated.totalQty < reqIng.quantity) {
        compResult.uncertain = true;
        compResult.reason = `Unit differences: pantry has ${aggregated.fallbackRawQty} ${aggregated.primaryUnit}`;
      }
    }

    const isAvailable = compResult.sufficient;

    if (isAvailable) {
      availableCount++;
      availableIngredients.push({
        ingredient_id: reqIng.ingredient_id,
        ingredient_name: reqIng.ingredient_name,
        required_quantity: Number(reqIng.quantity),
        required_unit: reqIng.unit,
        pantry_quantity: compResult.pantryInRequiredUnit,
      });
    } else {
      missingIngredients.push({
        ingredient_id: reqIng.ingredient_id,
        ingredient_name: reqIng.ingredient_name,
        required_quantity: Number(reqIng.quantity),
        required_unit: reqIng.unit,
        pantry_quantity: compResult.pantryInRequiredUnit !== null ? compResult.pantryInRequiredUnit : 0,
        missing_quantity: compResult.missingQuantity,
        uncertain: compResult.uncertain || false,
        reason: compResult.reason || null,
      });
    }

    detailedBreakdown.push({
      ingredient_id: reqIng.ingredient_id,
      ingredient_name: reqIng.ingredient_name,
      required_quantity: Number(reqIng.quantity),
      required_unit: reqIng.unit,
      pantry_quantity: compResult.pantryInRequiredUnit,
      is_available: isAvailable,
      missing_quantity: compResult.missingQuantity,
      uncertain: compResult.uncertain || false,
      reason: compResult.reason || null,
    });
  }

  const missingCount = totalRequired - availableCount;
  const coveragePercentage = Math.round((availableCount / totalRequired) * 100);

  return {
    recipe_id: recipe.recipe_id,
    recipe_name: recipe.recipe_name,
    description: recipe.description,
    instructions: recipe.instructions,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    difficulty: recipe.difficulty,
    servings: recipe.servings,
    source_type: recipe.source_type,
    category: {
      category_id: recipe.category_id,
      category_name: recipe.category_name,
    },
    total_required_ingredients: totalRequired,
    available_ingredients_count: availableCount,
    missing_ingredients_count: missingCount,
    ingredient_coverage_percentage: coveragePercentage,
    is_fully_available: availableCount === totalRequired,
    available_ingredients: availableIngredients,
    missing_ingredients: missingIngredients,
    detailed_ingredients: detailedBreakdown,
  };
};

/**
 * Get all recipe recommendations for a user.
 */
const getRecommendations = async (userId, filters = {}) => {
  const pantryMap = await getUserPantryMap(userId);

  // Query accessible recipes (PREDEFINED or owned by user)
  const conditions = ['(r.source_type = "PREDEFINED" OR r.user_id = ?)'];
  const params = [userId];

  if (filters.category_id) {
    conditions.push('r.category_id = ?');
    params.push(filters.category_id);
  }
  if (filters.difficulty) {
    conditions.push('r.difficulty = ?');
    params.push(filters.difficulty.toUpperCase());
  }

  const [recipes] = await pool.query(
    `SELECT
       r.recipe_id, r.user_id, r.category_id, r.recipe_name,
       r.description, r.instructions, r.prep_time, r.cook_time,
       r.difficulty, r.servings, r.source_type, r.created_at,
       c.category_name
     FROM recipes r
     JOIN categories c ON c.category_id = r.category_id
     WHERE ${conditions.join(' AND ')}`,
    params
  );

  if (recipes.length === 0) {
    return [];
  }

  const recipeIds = recipes.map((r) => r.recipe_id);
  const placeholders = recipeIds.map(() => '?').join(',');

  const [ingRows] = await pool.query(
    `SELECT
       ri.recipe_id,
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

  // Group ingredients by recipe_id
  const recipeIngMap = new Map();
  for (const ing of ingRows) {
    if (!recipeIngMap.has(ing.recipe_id)) {
      recipeIngMap.set(ing.recipe_id, []);
    }
    recipeIngMap.get(ing.recipe_id).push(ing);
  }

  const recommendations = [];

  for (const recipe of recipes) {
    const ings = recipeIngMap.get(recipe.recipe_id) || [];
    const evaluation = evaluateRecipeCoverage(recipe, ings, pantryMap);
    if (evaluation) {
      if (filters.min_coverage !== undefined && evaluation.ingredient_coverage_percentage < Number(filters.min_coverage)) {
        continue;
      }
      recommendations.push(evaluation);
    }
  }

  // Sort: 1. Coverage % DESC, 2. Missing ingredients ASC, 3. Recipe name ASC
  recommendations.sort((a, b) => {
    if (b.ingredient_coverage_percentage !== a.ingredient_coverage_percentage) {
      return b.ingredient_coverage_percentage - a.ingredient_coverage_percentage;
    }
    if (a.missing_ingredients_count !== b.missing_ingredients_count) {
      return a.missing_ingredients_count - b.missing_ingredients_count;
    }
    return a.recipe_name.localeCompare(b.recipe_name);
  });

  if (filters.limit) {
    return recommendations.slice(0, Number(filters.limit));
  }

  return recommendations;
};

/**
 * Check detailed ingredient availability for a single recipe.
 */
const checkRecipeAvailability = async (userId, recipeId) => {
  const [recipeRows] = await pool.query(
    `SELECT
       r.recipe_id, r.user_id, r.category_id, r.recipe_name,
       r.description, r.instructions, r.prep_time, r.cook_time,
       r.difficulty, r.servings, r.source_type,
       c.category_name
     FROM recipes r
     JOIN categories c ON c.category_id = r.category_id
     WHERE r.recipe_id = ?
       AND (r.source_type = 'PREDEFINED' OR r.user_id = ?)`,
    [recipeId, userId]
  );

  if (recipeRows.length === 0) {
    return null;
  }

  const recipe = recipeRows[0];

  const [ingredients] = await pool.query(
    `SELECT
       ri.recipe_id,
       ri.ingredient_id,
       i.ingredient_name,
       ri.quantity,
       ri.unit,
       ri.notes
     FROM recipeingredients ri
     JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
     WHERE ri.recipe_id = ?`,
    [recipeId]
  );

  const pantryMap = await getUserPantryMap(userId);
  return evaluateRecipeCoverage(recipe, ingredients, pantryMap);
};

module.exports = {
  getUserPantryMap,
  aggregatePantryQuantity,
  evaluateRecipeCoverage,
  getRecommendations,
  checkRecipeAvailability,
};
