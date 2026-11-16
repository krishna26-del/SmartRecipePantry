/**
 * validators/cookingHistoryValidator.js
 *
 * express-validator rules for Cooking History endpoints.
 */

const { body } = require('express-validator');

const create = [
  body('recipe_id')
    .notEmpty().withMessage('Recipe ID is required')
    .isInt({ min: 1 }).withMessage('Recipe ID must be a positive integer'),

  body('servings_made')
    .notEmpty().withMessage('Servings made is required')
    .isInt({ min: 1 }).withMessage('Servings made must be at least 1'),

  body('cooked_at')
    .optional()
    .isISO8601().withMessage('Cooked date must be a valid ISO8601 date'),

  body('notes')
    .optional({ nullable: true })
    .isString().withMessage('Notes must be a string')
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
];

const update = [
  body('servings_made')
    .optional()
    .isInt({ min: 1 }).withMessage('Servings made must be at least 1'),

  body('cooked_at')
    .optional()
    .isISO8601().withMessage('Cooked date must be a valid ISO8601 date'),

  body('notes')
    .optional({ nullable: true })
    .isString().withMessage('Notes must be a string')
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
];

module.exports = { create, update };
