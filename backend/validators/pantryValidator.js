/**
 * validators/pantryValidator.js
 *
 * express-validator rules for Pantry management endpoints.
 */

const { body, param } = require('express-validator');

const add = [
  body('ingredient_id')
    .notEmpty().withMessage('Ingredient ID is required')
    .isInt({ min: 1 }).withMessage('Ingredient ID must be a positive integer'),

  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),

  body('unit')
    .trim()
    .notEmpty().withMessage('Unit is required')
    .isLength({ max: 20 }).withMessage('Unit must be at most 20 characters'),

  body('expiry_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Expiry date must be a valid date in YYYY-MM-DD format'),
];

const update = [
  body('quantity')
    .optional()
    .isFloat({ min: 0 }).withMessage('Quantity must be non-negative'),

  body('unit')
    .optional()
    .trim()
    .notEmpty().withMessage('Unit cannot be empty')
    .isLength({ max: 20 }).withMessage('Unit must be at most 20 characters'),

  body('expiry_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Expiry date must be a valid date in YYYY-MM-DD format'),
];

module.exports = { add, update };
