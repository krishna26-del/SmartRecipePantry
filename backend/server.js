/**
 * server.js
 *
 * Entry point for the Smart Recipe Pantry backend.
 *
 * What this file does:
 *   1. Loads environment variables from .env
 *   2. Creates an Express application
 *   3. Applies global middleware (CORS, JSON body parser)
 *   4. Registers all API route groups
 *   5. Registers the 404 and global error handlers
 *   6. Tests the MySQL connection
 *   7. Starts the HTTP server
 *   8. Handles graceful shutdown (SIGTERM / SIGINT)
 *
 * IMPORTANT: Application logic lives in controllers, services, and routes.
 * This file is ONLY for wiring everything together.
 */

// ─── 1. Load environment variables ───────────────────────────────────────────
require('dotenv').config();

// ─── 2. Core imports ─────────────────────────────────────────────────────────
const express = require('express');
const cors = require('cors');

// Database connection
const { pool, testConnection } = require('./config/db');

// Route modules
const authRoutes          = require('./routes/authRoutes');
const recipeRoutes        = require('./routes/recipeRoutes');
const categoryRoutes      = require('./routes/categoryRoutes');
const ingredientRoutes    = require('./routes/ingredientRoutes');
const pantryRoutes        = require('./routes/pantryRoutes');
const recommendationRoutes= require('./routes/recommendationRoutes');
const shoppingListRoutes  = require('./routes/shoppingListRoutes');
const favoriteRoutes      = require('./routes/favoriteRoutes');
const mealPlanRoutes      = require('./routes/mealPlanRoutes');
const cookingHistoryRoutes= require('./routes/cookingHistoryRoutes');
const foodWasteRoutes     = require('./routes/foodWasteRoutes');
const analyticsRoutes     = require('./routes/analyticsRoutes');

// Error-handling middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// ─── 3. Create Express app ───────────────────────────────────────────────────
const app = express();

// ─── 4. Global Middleware ─────────────────────────────────────────────────────

// CORS — allows the React frontend (running on a different port) to call this API.
// In development we allow all origins. Lock this down in production.
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies (e.g. from HTML forms)
app.use(express.urlencoded({ extended: true }));

// ─── 5. API Health Check ─────────────────────────────────────────────────────
/**
 * GET /api/health
 *
 * A simple endpoint that:
 *   - Confirms the Express server is running
 *   - Checks that the MySQL pool can still execute a query
 *
 * The frontend or any monitoring tool can call this to verify the backend is alive.
 */
app.get('/api/health', async (req, res) => {
  try {
    // Quick DB liveness check
    await pool.query('SELECT 1');
    res.status(200).json({
      success: true,
      message: 'Smart Recipe Pantry API is running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Express server is up but DB is unreachable
    res.status(503).json({
      success: false,
      message: 'Smart Recipe Pantry API is running but database is unreachable',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── 6. API Routes ───────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/recipes',        recipeRoutes);
app.use('/api/categories',     categoryRoutes);
app.use('/api/ingredients',    ingredientRoutes);
app.use('/api/pantry',         pantryRoutes);
app.use('/api/recommendations',recommendationRoutes);
app.use('/api/shopping-lists', shoppingListRoutes);
app.use('/api/favorites',      favoriteRoutes);
app.use('/api/meal-plans',     mealPlanRoutes);
app.use('/api/cooking-history',cookingHistoryRoutes);
app.use('/api/food-waste',     foodWasteRoutes);
app.use('/api/analytics',      analyticsRoutes);

// ─── 7. Error Handling Middleware ────────────────────────────────────────────
// MUST be registered AFTER all routes.

// 404 — no route matched
app.use(notFound);

// Global error handler — catches everything passed via next(error)
app.use(errorHandler);

// ─── 8. Start Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  Smart Recipe Pantry — Backend Starting');
    console.log('═══════════════════════════════════════════════════');

    // Test the MySQL connection BEFORE accepting requests.
    // If the DB is unreachable, the server startup fails immediately
    // with a clear error message rather than failing silently on first request.
    await testConnection();

    const server = app.listen(PORT, () => {
      console.log(`🚀  Server listening on http://localhost:${PORT}`);
      console.log(`🔍  Health check: http://localhost:${PORT}/api/health`);
      console.log('═══════════════════════════════════════════════════');
      console.log('');
    });

    // ─── 9. Graceful Shutdown ─────────────────────────────────────────────
    // When the process receives SIGTERM (e.g. from Docker or the OS) or
    // SIGINT (Ctrl+C), we:
    //   1. Stop accepting new HTTP requests
    //   2. Close the MySQL connection pool
    //   3. Exit the process cleanly

    const shutdown = async (signal) => {
      console.log(`\n⚠️  Received ${signal}. Shutting down gracefully...`);

      server.close(async () => {
        console.log('   HTTP server closed.');
        try {
          await pool.end();
          console.log('   MySQL pool closed.');
        } catch (err) {
          console.error('   Error closing MySQL pool:', err.message);
        }
        console.log('   Goodbye. ✅');
        process.exit(0);
      });

      // Force-exit after 10 seconds if graceful shutdown takes too long
      setTimeout(() => {
        console.error('   Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (error) {
    // If testConnection() throws, we log the error and exit.
    // This is intentional — we do NOT want to serve requests without a DB.
    console.error('');
    console.error('💥  Server startup failed:');
    console.error('   ', error.message);
    console.error('');
    console.error('   Please check:');
    console.error('   1. MySQL Server is running');
    console.error('   2. .env credentials are correct');
    console.error('   3. The database name in .env matches your MySQL database');
    console.error('');
    process.exit(1);
  }
};

startServer();
