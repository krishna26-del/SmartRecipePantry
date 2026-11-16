/**
 * validators/ingredientValidator.js
 *
 * express-validator rule chains for ingredient endpoints.
 */

const { body } = require('express-validator');

/** POST /api/ingredients */
const create = [
  body('ingredient_name')
    .trim()
    .notEmpty().withMessage('Ingredient name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('default_unit')
    .trim()
    .notEmpty().withMessage('Default unit is required')
    .isLength({ min: 1, max: 20 }).withMessage('Unit must be 1–20 characters'),
];

/** PUT /api/ingredients/:id */
const update = [
  body('ingredient_name')
    .trim()
    .notEmpty().withMessage('Ingredient name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('default_unit')
    .trim()
    .notEmpty().withMessage('Default unit is required')
    .isLength({ min: 1, max: 20 }).withMessage('Unit must be 1–20 characters'),
];

module.exports = { create, update };
