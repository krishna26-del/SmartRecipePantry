/**
 * validators/shoppingListValidator.js
 *
 * express-validator rules for Shopping List endpoints.
 */

const { body } = require('express-validator');

const createList = [
  body('list_name')
    .trim()
    .notEmpty().withMessage('List name is required')
    .isLength({ min: 1, max: 100 }).withMessage('List name must be 1–100 characters'),
];

const updateList = [
  body('list_name')
    .optional()
    .trim()
    .notEmpty().withMessage('List name cannot be empty')
    .isLength({ min: 1, max: 100 }).withMessage('List name must be 1–100 characters'),

  body('status')
    .optional()
    .isIn(['ACTIVE', 'COMPLETED', 'ARCHIVED']).withMessage('Status must be ACTIVE, COMPLETED, or ARCHIVED'),
];

const addItem = [
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
];

const updateItem = [
  body('quantity')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),

  body('unit')
    .optional()
    .trim()
    .notEmpty().withMessage('Unit cannot be empty')
    .isLength({ max: 20 }).withMessage('Unit must be at most 20 characters'),

  body('is_purchased')
    .optional()
    .isBoolean().withMessage('is_purchased must be a boolean'),
];

module.exports = {
  createList,
  updateList,
  addItem,
  updateItem,
};
