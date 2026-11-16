/**
 * validators/mealPlanValidator.js
 *
 * express-validator rules for Meal Planning endpoints.
 */

const { body } = require('express-validator');

const createPlan = [
  body('plan_name')
    .trim()
    .notEmpty().withMessage('Plan name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Plan name must be 1–100 characters'),

  body('start_date')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date in YYYY-MM-DD format'),

  body('end_date')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be a valid date in YYYY-MM-DD format')
    .custom((endDate, { req }) => {
      if (new Date(endDate) < new Date(req.body.start_date)) {
        throw new Error('End date cannot be earlier than start date');
      }
      return true;
    }),
];

const updatePlan = [
  body('plan_name')
    .optional()
    .trim()
    .notEmpty().withMessage('Plan name cannot be empty')
    .isLength({ min: 1, max: 100 }).withMessage('Plan name must be 1–100 characters'),

  body('start_date')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date in YYYY-MM-DD format'),

  body('end_date')
    .optional()
    .isISO8601().withMessage('End date must be a valid date in YYYY-MM-DD format')
    .custom((endDate, { req }) => {
      if (req.body.start_date && new Date(endDate) < new Date(req.body.start_date)) {
        throw new Error('End date cannot be earlier than start date');
      }
      return true;
    }),
];

const addMealItem = [
  body('recipe_id')
    .notEmpty().withMessage('Recipe ID is required')
    .isInt({ min: 1 }).withMessage('Recipe ID must be a positive integer'),

  body('planned_date')
    .notEmpty().withMessage('Planned date is required')
    .isISO8601().withMessage('Planned date must be a valid date in YYYY-MM-DD format'),

  body('meal_type')
    .trim()
    .notEmpty().withMessage('Meal type is required')
    .toUpperCase()
    .isIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER']).withMessage('Meal type must be BREAKFAST, LUNCH, DINNER, SNACK, or OTHER'),

  body('planned_servings')
    .notEmpty().withMessage('Planned servings is required')
    .isInt({ min: 1 }).withMessage('Planned servings must be at least 1'),

  body('status')
    .optional()
    .toUpperCase()
    .isIn(['PLANNED', 'COOKED', 'SKIPPED']).withMessage('Status must be PLANNED, COOKED, or SKIPPED'),
];

const updateMealItem = [
  body('planned_date')
    .optional()
    .isISO8601().withMessage('Planned date must be a valid date in YYYY-MM-DD format'),

  body('meal_type')
    .optional()
    .trim()
    .toUpperCase()
    .isIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER']).withMessage('Meal type must be BREAKFAST, LUNCH, DINNER, SNACK, or OTHER'),

  body('planned_servings')
    .optional()
    .isInt({ min: 1 }).withMessage('Planned servings must be at least 1'),

  body('status')
    .optional()
    .toUpperCase()
    .isIn(['PLANNED', 'COOKED', 'SKIPPED']).withMessage('Status must be PLANNED, COOKED, or SKIPPED'),
];

module.exports = {
  createPlan,
  updatePlan,
  addMealItem,
  updateMealItem,
};
