/**
 * validators/recipeValidator.js
 *
 * express-validator rule chains for recipe create and update.
 */

const { body } = require('express-validator');

const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

/** Shared rules used by both create and update */
const commonRules = [
  body('recipe_name')
    .trim()
    .notEmpty().withMessage('Recipe name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Recipe name must be 2–150 characters'),

  body('category_id')
    .notEmpty().withMessage('Category ID is required')
    .isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),

  body('instructions')
    .trim()
    .notEmpty().withMessage('Instructions are required')
    .isLength({ min: 10 }).withMessage('Instructions must be at least 10 characters'),

  body('prep_time')
    .notEmpty().withMessage('Prep time is required')
    .isInt({ min: 0 }).withMessage('Prep time must be a non-negative integer (minutes)'),

  body('cook_time')
    .notEmpty().withMessage('Cook time is required')
    .isInt({ min: 0 }).withMessage('Cook time must be a non-negative integer (minutes)'),

  body('difficulty')
    .notEmpty().withMessage('Difficulty is required')
    .toUpperCase()
    .isIn(VALID_DIFFICULTIES).withMessage(`Difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`),

  body('servings')
    .notEmpty().withMessage('Servings is required')
    .isInt({ min: 1 }).withMessage('Servings must be a positive integer'),

  // Ingredients array
  body('ingredients')
    .isArray({ min: 1 }).withMessage('Ingredients must be a non-empty array'),

  body('ingredients.*.ingredient_id')
    .isInt({ min: 1 }).withMessage('Each ingredient must have a valid integer ingredient_id'),

  body('ingredients.*.quantity')
    .isFloat({ gt: 0 }).withMessage('Each ingredient quantity must be greater than 0'),

  body('ingredients.*.unit')
    .trim()
    .notEmpty().withMessage('Each ingredient must have a unit')
    .isLength({ max: 20 }).withMessage('Unit must be at most 20 characters'),

  // Dietary tag IDs (optional — defaults to [])
  body('dietary_tag_ids')
    .optional()
    .isArray().withMessage('dietary_tag_ids must be an array'),

  body('dietary_tag_ids.*')
    .optional()
    .isInt({ min: 1 }).withMessage('Each dietary tag ID must be a positive integer'),
];

const create = [...commonRules];
const update  = [...commonRules];

module.exports = { create, update };
