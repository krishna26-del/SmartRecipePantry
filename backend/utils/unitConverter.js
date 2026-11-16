/**
 * utils/unitConverter.js
 *
 * Provides standardized unit normalization, dimensional compatibility checks,
 * and conversions for culinary measurements (mass, volume, count).
 */

// Normalized unit mapping
const UNIT_ALIASES = {
  // Mass
  'g': 'g',
  'gram': 'g',
  'grams': 'g',
  'kg': 'kg',
  'kilogram': 'kg',
  'kilograms': 'kg',
  'mg': 'mg',
  'milligram': 'mg',
  'milligrams': 'mg',
  'oz': 'oz',
  'ounce': 'oz',
  'ounces': 'oz',
  'lb': 'lb',
  'lbs': 'lb',
  'pound': 'lb',
  'pounds': 'lb',

  // Volume
  'ml': 'ml',
  'milliliter': 'ml',
  'milliliters': 'ml',
  'millilitre': 'ml',
  'millilitres': 'ml',
  'l': 'l',
  'liter': 'l',
  'liters': 'l',
  'litre': 'l',
  'litres': 'l',
  'tsp': 'tsp',
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'tbsp': 'tbsp',
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
  'cup': 'cup',
  'cups': 'cup',

  // Count / Discrete
  'piece': 'piece',
  'pieces': 'piece',
  'pc': 'piece',
  'pcs': 'piece',
  'clove': 'clove',
  'cloves': 'clove',
  'slice': 'slice',
  'slices': 'slice',
  'pinch': 'pinch',
  'pinches': 'pinch',
  'can': 'can',
  'cans': 'can',
};

// Base units: Mass -> g, Volume -> ml, Count -> self
const MASS_TO_GRAM = {
  'g': 1,
  'kg': 1000,
  'mg': 0.001,
  'oz': 28.3495,
  'lb': 453.592,
};

const VOLUME_TO_ML = {
  'ml': 1,
  'l': 1000,
  'tsp': 4.92892,
  'tbsp': 14.7868,
  'cup': 240,
};

/**
 * Normalize unit string (lowercase, trimmed, resolved alias)
 */
const normalizeUnit = (unit) => {
  if (!unit || typeof unit !== 'string') return '';
  const cleaned = unit.trim().toLowerCase();
  return UNIT_ALIASES[cleaned] || cleaned;
};

/**
 * Determine dimension of a normalized unit ('mass', 'volume', 'count', or 'other')
 */
const getUnitDimension = (normUnit) => {
  if (MASS_TO_GRAM[normUnit]) return 'mass';
  if (VOLUME_TO_ML[normUnit]) return 'volume';
  return 'count_or_other';
};

/**
 * Convert quantity between compatible units.
 * Returns null if units are incompatible or conversion is unsupported.
 */
const convertQuantity = (quantity, fromUnit, toUnit) => {
  const normFrom = normalizeUnit(fromUnit);
  const normTo = normalizeUnit(toUnit);

  if (normFrom === normTo) {
    return Number(quantity);
  }

  const dimFrom = getUnitDimension(normFrom);
  const dimTo = getUnitDimension(normTo);

  if (dimFrom === 'mass' && dimTo === 'mass') {
    const inGrams = Number(quantity) * MASS_TO_GRAM[normFrom];
    return inGrams / MASS_TO_GRAM[normTo];
  }

  if (dimFrom === 'volume' && dimTo === 'volume') {
    const inMl = Number(quantity) * VOLUME_TO_ML[normFrom];
    return inMl / VOLUME_TO_ML[normTo];
  }

  // Count/other units: only convertible if identical
  return null;
};

/**
 * Compare available pantry quantity with required recipe quantity.
 *
 * @param {number} pantryQty
 * @param {string} pantryUnit
 * @param {number} requiredQty
 * @param {string} requiredUnit
 * @returns {object} {
 *   compatible: boolean,
 *   sufficient: boolean,
 *   pantryInRequiredUnit: number|null,
 *   missingQuantity: number,
 *   uncertain: boolean,
 *   reason?: string
 * }
 */
const compareQuantity = (pantryQty, pantryUnit, requiredQty, requiredUnit) => {
  const reqQty = Number(requiredQty) || 0;
  const pQty = Number(pantryQty) || 0;

  const normPantryUnit = normalizeUnit(pantryUnit);
  const normReqUnit = normalizeUnit(requiredUnit);

  // Exact same unit
  if (normPantryUnit === normReqUnit) {
    const sufficient = pQty >= reqQty;
    const missing = sufficient ? 0 : Math.max(0, reqQty - pQty);
    return {
      compatible: true,
      sufficient,
      pantryInRequiredUnit: pQty,
      missingQuantity: Number(missing.toFixed(2)),
      uncertain: false,
    };
  }

  // Attempt unit conversion
  const convertedPantry = convertQuantity(pQty, normPantryUnit, normReqUnit);

  if (convertedPantry === null) {
    // Incompatible units (e.g. grams vs milliliters or pieces vs grams)
    return {
      compatible: false,
      sufficient: false,
      pantryInRequiredUnit: null,
      missingQuantity: reqQty,
      uncertain: true,
      reason: `Unsupported conversion between "${pantryUnit}" and "${requiredUnit}"`,
    };
  }

  const sufficient = convertedPantry >= reqQty;
  const missing = sufficient ? 0 : Math.max(0, reqQty - convertedPantry);

  return {
    compatible: true,
    sufficient,
    pantryInRequiredUnit: Number(convertedPantry.toFixed(2)),
    missingQuantity: Number(missing.toFixed(2)),
    uncertain: false,
  };
};

module.exports = {
  normalizeUnit,
  getUnitDimension,
  convertQuantity,
  compareQuantity,
};
