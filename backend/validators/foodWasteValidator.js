/**
 * validators/foodWasteValidator.js
 *
 * express-validator rules for Food Waste Management endpoints.
 */

const { body } = require('express-validator');

const create = [
  body('ingredient_id')
    .notEmpty().withMessage('Ingredient ID is required')
    .isInt({ min: 1 }).withMessage('Ingredient ID must be a positive integer'),

  body('pantry_item_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Pantry item ID must be a positive integer'),

  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),

  body('unit')
    .trim()
    .notEmpty().withMessage('Unit is required')
    .isLength({ max: 20 }).withMessage('Unit must be at most 20 characters'),

  body('reason')
    .trim()
    .notEmpty().withMessage('Reason is required')
    .isLength({ max: 50 }).withMessage('Reason must be at most 50 characters'),

  body('notes')
    .optional({ nullable: true })
    .isString().withMessage('Notes must be a string')
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),

  body('wasted_at')
    .optional()
    .isISO8601().withMessage('Wasted date must be a valid ISO8601 date'),
];

const update = [
  body('quantity')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),

  body('unit')
    .optional()
    .trim()
    .notEmpty().withMessage('Unit cannot be empty')
    .isLength({ max: 20 }).withMessage('Unit must be at most 20 characters'),

  body('reason')
    .optional()
    .trim()
    .notEmpty().withMessage('Reason cannot be empty')
    .isLength({ max: 50 }).withMessage('Reason must be at most 50 characters'),

  body('notes')
    .optional({ nullable: true })
    .isString().withMessage('Notes must be a string')
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),

  body('wasted_at')
    .optional()
    .isISO8601().withMessage('Wasted date must be a valid ISO8601 date'),
];

module.exports = { create, update };
