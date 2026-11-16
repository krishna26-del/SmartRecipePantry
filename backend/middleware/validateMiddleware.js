/**
 * middleware/validateMiddleware.js
 *
 * Reads validation errors collected by express-validator and, if any exist,
 * immediately returns a 400 Bad Request with all error details.
 *
 * Usage in a route:
 *   router.post('/register', authValidator.register, validate, authController.register);
 *
 * Place this middleware AFTER validator arrays and BEFORE the controller.
 */

const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/ApiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format all validation errors into a readable array
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  next();
};

module.exports = validate;
