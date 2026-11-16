/**
 * utils/ApiResponse.js
 *
 * Provides two static helper methods for sending consistent JSON responses.
 *
 * Every API endpoint in this project uses ApiResponse.success() or
 * ApiResponse.error() so the response format is always predictable.
 *
 * Success format:
 *   { success: true, message: "...", data: { ... } }
 *
 * Error format:
 *   { success: false, message: "..." }
 */

class ApiResponse {
  /**
   * Send a successful response.
   *
   * @param {object} res       - Express response object
   * @param {number} statusCode - HTTP status code (default 200)
   * @param {string} message   - Human-readable success message
   * @param {any}    data      - Payload to return (object, array, etc.)
   */
  static success(res, statusCode = 200, message = 'Success', data = null) {
    const body = { success: true, message };
    if (data !== null && data !== undefined) {
      body.data = data;
    }
    return res.status(statusCode).json(body);
  }

  /**
   * Send an error response.
   *
   * IMPORTANT: Never pass raw database errors or stack traces here.
   * Always pass a sanitised, user-facing message.
   *
   * @param {object} res       - Express response object
   * @param {number} statusCode - HTTP status code (default 500)
   * @param {string} message   - Human-readable error message
   */
  static error(res, statusCode = 500, message = 'Internal server error') {
    return res.status(statusCode).json({ success: false, message });
  }
}

module.exports = ApiResponse;
