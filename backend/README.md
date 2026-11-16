# Smart Recipe and Pantry Management System — Backend

## Project Overview

A complete REST API for a Smart Recipe and Pantry Management System. It allows users to manage their ingredient pantry, discover recipes based on what they have available, track cooking history, plan meals, manage shopping lists, and analyse food usage and waste patterns.

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Language | JavaScript (CommonJS) |
| Database | MySQL |
| DB Driver | mysql2/promise |
| Authentication | JSON Web Tokens (JWT) |
| Password Hashing | bcryptjs |
| Environment Config | dotenv |
| Input Validation | express-validator |
| CORS | cors |
| Dev Server | nodemon |

## Folder Structure

```
backend/
├── config/
│   └── db.js                   ← MySQL connection pool
├── controllers/
│   ├── authController.js       ← Register, Login, GetMe
│   ├── recipeController.js     ← Recipe CRUD
│   ├── categoryController.js   ← Category listing
│   ├── ingredientController.js ← Ingredient search
│   ├── pantryController.js     ← Pantry CRUD + expiry
│   ├── recommendationController.js ← Pantry-based recommendations
│   ├── shoppingListController.js   ← Shopping lists
│   ├── favoriteController.js   ← Favourite recipes
│   ├── mealPlanController.js   ← Meal planner
│   ├── cookingHistoryController.js ← Cooking log
│   ├── foodWasteController.js  ← Waste tracking
│   └── analyticsController.js  ← Dashboard analytics
├── routes/
│   └── (mirrors controllers — one route file per module)
├── middleware/
│   ├── authMiddleware.js       ← JWT token verification → req.user
│   ├── errorMiddleware.js      ← 404 + global error handler
│   └── validateMiddleware.js   ← express-validator error formatter
├── validators/
│   ├── authValidator.js        ← Register / Login validation rules
│   ├── recipeValidator.js      ← Recipe creation / update rules
│   └── pantryValidator.js      ← Pantry add / update rules
├── services/
│   ├── recipeService.js        ← Complex recipe query logic
│   ├── pantryService.js        ← Pantry + expiry helpers
│   └── recommendationService.js ← Availability calculation logic
├── utils/
│   ├── generateToken.js        ← Creates signed JWTs
│   └── ApiResponse.js          ← Consistent JSON response format
├── scripts/
│   └── inspectDB.js            ← One-time DB schema inspector
├── .env                        ← Environment variables (never commit!)
├── .gitignore
├── package.json
└── server.js                   ← Express app entry point
```

## Prerequisites

- Node.js v18+
- MySQL Server running locally (MySQL Workbench used for setup)
- Database already created with all 15 tables

## Installation

```bash
cd backend
npm install
```

## Environment Variables

Create / verify `backend/.env`:

```env
PORT=5000

DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name        # Must match EXACTLY the name in MySQL Workbench
DB_PORT=3306

JWT_SECRET=your_very_long_random_secret
JWT_EXPIRES_IN=1d
```

> **Important:** `DB_NAME` must match your database name exactly, including capitalisation and spaces. Check with `SHOW DATABASES;` in MySQL Workbench.

## Starting the Backend

**Development (auto-restart on file changes):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## Verifying the Setup

### Step 1 — Inspect the database

```bash
node scripts/inspectDB.js
```

This lists all tables and their columns without modifying anything.

### Step 2 — Start the server

```bash
npm run dev
```

### Step 3 — Test the health endpoint

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Smart Recipe Pantry API is running",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## API Endpoint Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/health` | Server health check | No |
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Log in and get JWT | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/categories` | List all categories | No |
| GET | `/api/ingredients` | Search ingredients | No |
| POST | `/api/ingredients` | Add ingredient | Yes |
| GET | `/api/recipes` | List/search recipes | No |
| POST | `/api/recipes` | Create a recipe | Yes |
| GET | `/api/recipes/:id` | Get one recipe | No |
| PUT | `/api/recipes/:id` | Update recipe (own) | Yes |
| DELETE | `/api/recipes/:id` | Delete recipe (own) | Yes |
| GET | `/api/recipes/my-recipes` | User's own recipes | Yes |
| GET | `/api/recipes/:id/availability` | Ingredient availability | Yes |
| POST | `/api/recipes/:id/cook` | Cook recipe + update pantry | Yes |
| GET | `/api/pantry` | View pantry | Yes |
| POST | `/api/pantry` | Add pantry item | Yes |
| PUT | `/api/pantry/:id` | Update pantry item | Yes |
| DELETE | `/api/pantry/:id` | Remove pantry item | Yes |
| GET | `/api/pantry/expiring` | Items expiring soon | Yes |
| GET | `/api/pantry/expired` | Expired items | Yes |
| GET | `/api/pantry/low-stock` | Low stock items | Yes |
| GET | `/api/recommendations` | Recipe recommendations | Yes |
| POST | `/api/shopping-lists` | Create shopping list | Yes |
| GET | `/api/shopping-lists` | List shopping lists | Yes |
| POST | `/api/shopping-lists/:id/items` | Add item to list | Yes |
| POST | `/api/shopping-lists/:id/items/from-recipe/:recipeId` | Auto-add missing | Yes |
| PATCH | `/api/shopping-lists/items/:itemId/purchase` | Mark purchased | Yes |
| GET | `/api/favorites` | View favourites | Yes |
| POST | `/api/favorites/:recipeId` | Add favourite | Yes |
| DELETE | `/api/favorites/:recipeId` | Remove favourite | Yes |
| POST | `/api/meal-plans` | Create meal plan | Yes |
| GET | `/api/meal-plans` | List meal plans | Yes |
| POST | `/api/meal-plans/:id/items` | Add meal to plan | Yes |
| GET | `/api/cooking-history` | View cooking history | Yes |
| POST | `/api/food-waste` | Log food waste | Yes |
| GET | `/api/food-waste` | View waste history | Yes |
| GET | `/api/analytics/dashboard` | Dashboard stats | Yes |

## Authentication

All protected endpoints require a JWT in the `Authorization` header:

```
Authorization: Bearer <your_token>
```

**Register:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"Secret123!"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Secret123!"}'
```

The response includes a `token` field. Use it as `Bearer <token>` in all subsequent requests.

## Database

- 15 tables covering users, recipes, ingredients, pantry, shopping lists, meal plans, cooking history, and food waste.
- Never modified by this application — only read and written via parameterized queries.
- Uses connection pooling for performance.

## Security Practices

- Passwords hashed with **bcryptjs** (10 salt rounds)
- JWT signed with `JWT_SECRET` from `.env`
- All SQL uses **parameterized queries** — no string interpolation
- `password_hash` is **never** returned in API responses
- `user_id` is always taken from the verified JWT, never from the request body
- Ownership is verified on every private resource access

## Implementation Phases

| Phase | Status | Description |
|---|---|---|
| Phase 1 | ✅ Complete | DB connection, server, health check |
| Phase 2 | 🔜 Next | Authentication (register, login, JWT) |
| Phase 3 | 🔜 | Recipe CRUD, categories, ingredients, search |
| Phase 4 | 🔜 | Pantry CRUD, expiry, low-stock |
| Phase 5 | 🔜 | Recommendations, missing ingredients, shopping lists |
| Phase 6 | 🔜 | Favourites, meal planning, cooking history, food waste |
| Phase 7 | 🔜 | Analytics dashboard |
| Phase 8 | 🔜 | Testing, documentation, frontend integration |
