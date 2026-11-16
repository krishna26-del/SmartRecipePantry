/**
 * middleware/errorMiddleware.js
 *
 * Centralized error handler — registered as the LAST middleware in server.js.
 *
 * Express identifies a middleware as an error handler when it has exactly
 * four parameters: (err, req, res, next).
 *
 * This catches any error passed via next(error) from anywhere in the app.
 * It logs the full error on the server (for debugging) but only sends a
 * sanitised message to the client (never expose internal details).
 */

const ApiResponse = require('../utils/ApiResponse');

// 404 handler — called when no route matched the request
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  // Log the full error on the server for debugging
  console.error('─── SERVER ERROR ───');
  console.error(`  Route : ${req.method} ${req.originalUrl}`);
  console.error(`  Message: ${err.message}`);
  console.error(`  Stack  : ${err.stack}`);
  console.error('────────────────────');

  // Determine the correct HTTP status code
  const statusCode = err.statusCode || err.status || 500;

  // Determine the client-facing message
  // In production you might replace 500 messages with a generic string
  const message =
    statusCode === 500
      ? 'An internal server error occurred. Please try again later.'
      : err.message || 'Something went wrong';

  return ApiResponse.error(res, statusCode, message);
};

module.exports = { notFound, errorHandler };
