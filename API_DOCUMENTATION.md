# Smart Recipe Pantry — Complete API Documentation

This document covers all RESTful API endpoints implemented across **Phase 1 through Phase 5** for the **Smart Recipe Pantry** platform.

- **Base URL**: `http://localhost:5000/api`
- **Default Content-Type**: `application/json`
- **Authentication**: JWT Bearer Token passed via HTTP Header:  
  `Authorization: Bearer <token>`

---

## Table of Contents
1. [Standard Response Format & Status Codes](#standard-response-format--status-codes)
2. [Health Check API](#1-health-check-api)
3. [Authentication APIs (Phase 1)](#2-authentication-apis-phase-1)
4. [Categories, Dietary Tags & Ingredients (Phase 2)](#3-categories-dietary-tags--ingredients-phase-2)
5. [Recipe Management APIs (Phase 2)](#4-recipe-management-apis-phase-2)
6. [Pantry Management APIs (Phase 3)](#5-pantry-management-apis-phase-3)
7. [Smart Recipe Recommendations (Phase 3)](#6-smart-recipe-recommendations-phase-3)
8. [Shopping Lists APIs (Phase 4)](#7-shopping-lists-apis-phase-4)
9. [Favorites Management APIs (Phase 4)](#8-favorites-management-apis-phase-4)
10. [Meal Planning APIs (Phase 4)](#9-meal-planning-apis-phase-4)
11. [Cooking History APIs (Phase 4)](#10-cooking-history-apis-phase-4)
12. [Food Waste Management APIs (Phase 4)](#11-food-waste-management-apis-phase-4)
13. [Analytics & Dashboard APIs (Phase 5)](#12-analytics--dashboard-apis-phase-5)

---

## Standard Response Format & Status Codes

All API endpoints return standard JSON responses:

### Success Response Format:
```json
{
  "success": true,
  "message": "Operation successful description",
  "data": { ... }
}
```

### Error Response Format:
```json
{
  "success": false,
  "message": "Descriptive error message",
  "errors": [ ... ]
}
```

### Common HTTP Status Codes:
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or missing required fields.
- `401 Unauthorized`: Missing, invalid, or expired JWT token.
- `403 Forbidden`: User attempts to access/modify a resource owned by another user or a predefined recipe.
- `404 Not Found`: Requested resource does not exist.
- `409 Conflict`: Unique constraint violation (e.g. duplicate email, duplicate favorite, duplicate pantry ingredient).
- `500 Internal Server Error`: Unexpected server/database failure.

---

## 1. Health Check API

### `GET /api/health`
Check backend server and MySQL connection health.
- **Auth Required**: No
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Smart Recipe Pantry API is healthy",
  "timestamp": "2026-11-16T12:00:00.000Z",
  "database": "connected"
}
```

---

## 2. Authentication APIs (Phase 1)

### `POST /api/auth/register`
Register a new user account. Passwords hashed using bcrypt.
- **Auth Required**: No
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123"
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "user_id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "created_at": "2026-11-16T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```
- **Error Codes**: `400` (Validation), `409` (Email exists).

### `POST /api/auth/login`
Authenticate user with email and password.
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "Password123"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "user_id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```
- **Error Codes**: `401` (Invalid credentials), `400` (Missing fields).

### `GET /api/auth/me`
Retrieve currently authenticated user profile.
- **Auth Required**: Yes (`Bearer <token>`)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "created_at": "2026-11-16T12:00:00.000Z"
    }
  }
}
```
- **Error Codes**: `401` (Unauthorized).

---

## 3. Categories, Dietary Tags & Ingredients (Phase 2)

### `GET /api/categories`
List all recipe categories.
- **Auth Required**: No
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "categories": [
      { "category_id": 1, "category_name": "Breakfast", "description": "Morning meals" }
    ]
  }
}
```

### `GET /api/categories/:id`
Get category details by ID.
- **Auth Required**: No
- **Response**: `200 OK` or `404 Not Found`.

### `GET /api/dietary-tags`
List all dietary tags (e.g. Vegan, Gluten-Free).
- **Auth Required**: No
- **Response**: `200 OK`.

### `GET /api/ingredients`
Paginated ingredient list.
- **Auth Required**: No
- **Query Params**: `page=1`, `limit=20`
- **Response**: `200 OK` with pagination metadata.

### `GET /api/ingredients/search`
Search ingredients by name.
- **Auth Required**: No
- **Query Params**: `q=flour`
- **Response**: `200 OK`.

---

## 4. Recipe Management APIs (Phase 2)

### `GET /api/recipes`
Fetch all available recipes (both predefined and public/user recipes).
- **Auth Required**: Optional
- **Query Params**:
  - `page` (default: 1)
  - `limit` (default: 10)
  - `search` (text search on name & description)
  - `category_id` (filter by category)
  - `difficulty` (`EASY`, `MEDIUM`, `HARD`)
  - `dietary_tag_id` (filter by tag)
- **Response**: `200 OK` with embedded category, ingredients, and tags.

### `GET /api/recipes/:id`
Fetch single recipe with all ingredients, instructions, and dietary tags.
- **Auth Required**: Optional
- **Response**: `200 OK` or `404 Not Found`.

### `POST /api/recipes`
Create a new user recipe.
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "recipe_name": "Avocado Toast",
  "category_id": 1,
  "description": "Crispy bread with smashed avocado",
  "instructions": "Toast bread, smash avocado with lemon and salt, spread evenly.",
  "prep_time": 5,
  "cook_time": 3,
  "difficulty": "EASY",
  "servings": 1,
  "ingredients": [
    { "ingredient_id": 10, "quantity": 1, "unit": "piece", "notes": "Ripe" },
    { "ingredient_id": 12, "quantity": 2, "unit": "slice", "notes": "Sourdough" }
  ],
  "dietary_tag_ids": [1]
}
```
- **Response**: `201 Created`.
- **Error Codes**: `400` (Validation), `401` (Unauthorized).

### `PUT /api/recipes/:id`
Update a user-created recipe (only allowed for the creator).
- **Auth Required**: Yes
- **Response**: `200 OK`.
- **Error Codes**: `403 Forbidden` (Cannot modify PREDEFINED recipes or other users' recipes).

### `DELETE /api/recipes/:id`
Delete a user-created recipe.
- **Auth Required**: Yes
- **Response**: `200 OK`.
- **Error Codes**: `403 Forbidden` (PREDEFINED or not owner).

### `GET /api/recipes/my-recipes`
List all recipes created by authenticated user.
- **Auth Required**: Yes
- **Response**: `200 OK`.

---

## 5. Pantry Management APIs (Phase 3)

### `GET /api/pantry`
Get all pantry items of the authenticated user.
- **Auth Required**: Yes
- **Response**: `200 OK` list with expiration metadata and days until expiry.

### `POST /api/pantry`
Add an ingredient to the pantry.
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "ingredient_id": 1,
  "quantity": 500,
  "unit": "g",
  "expiry_date": "2026-12-31"
}
```
- **Response**: `201 Created`.

### `PUT /api/pantry/:id`
Update pantry item quantity, unit, or expiry date.
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "quantity": 600,
  "unit": "g",
  "expiry_date": "2027-01-15"
}
```
- **Response**: `200 OK`.
- **Error Codes**: `403 Forbidden` (if not item owner).

### `DELETE /api/pantry/:id`
Delete a pantry item.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `GET /api/pantry/expiring`
Get items expiring within next 7 days.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `GET /api/pantry/expired`
Get items already past expiry date.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `GET /api/pantry/summary`
Get pantry count totals: total items, expiring soon, expired, active.
- **Auth Required**: Yes
- **Response**: `200 OK`.

---

## 6. Smart Recipe Recommendations (Phase 3)

### `GET /api/recommendations`
Get ranked recipe recommendations based on currently available pantry ingredients.
- **Auth Required**: Yes
- **Response**: `200 OK` sorted by `coverage_percentage` descending (100% can be cooked immediately).

### `GET /api/recommendations/:recipe_id`
Check ingredient availability breakdown for a specific recipe:
- Required ingredients
- In-stock quantities
- Missing ingredients and quantities
- Cookable status boolean
- **Auth Required**: Yes
- **Response**: `200 OK`.

---

## 7. Shopping Lists APIs (Phase 4)

### `GET /api/shopping-lists`
Get all shopping lists for the authenticated user.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `POST /api/shopping-lists`
Create a new shopping list.
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "list_name": "Weekend BBQ"
}
```
- **Response**: `201 Created`.

### `GET /api/shopping-lists/:id`
Get a shopping list with its item details.
- **Auth Required**: Yes
- **Response**: `200 OK`.
- **Error Codes**: `403 Forbidden` (if accessing another user's list).

### `DELETE /api/shopping-lists/:id`
Delete a shopping list and all its items.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `POST /api/shopping-lists/:id/items`
Add an item to a shopping list (increments quantity if already exists).
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "ingredient_id": 3,
  "quantity": 6,
  "unit": "piece"
}
```
- **Response**: `201 Created`.

### `PATCH /api/shopping-lists/:id/items/:item_id/purchase`
Toggle purchased checkbox for an item.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `DELETE /api/shopping-lists/:id/items/:item_id`
Remove an item from a shopping list.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `POST /api/shopping-lists/:id/generate-from-recipe/:recipe_id`
Automatically generate shopping list items from recipe ingredients missing from pantry.
- **Auth Required**: Yes
- **Response**: `200 OK`.

---

## 8. Favorites Management APIs (Phase 4)

### `GET /api/favorites`
Get all recipes favorited by the authenticated user.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `POST /api/favorites/:recipe_id`
Add recipe to favorites.
- **Auth Required**: Yes
- **Response**: `201 Created`.
- **Error Codes**: `409 Conflict` (already favorited).

### `DELETE /api/favorites/:recipe_id`
Remove recipe from favorites.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `GET /api/favorites/:recipe_id/check`
Check if a specific recipe is favorited.
- **Auth Required**: Yes
- **Response**: `200 OK` `{ "is_favorite": true/false }`.

---

## 9. Meal Planning APIs (Phase 4)

### `GET /api/meal-plans`
Get all meal plans of authenticated user.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `POST /api/meal-plans`
Create a meal plan with date ranges.
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "plan_name": "Healthy Week",
  "start_date": "2026-11-17",
  "end_date": "2026-11-23"
}
```
- **Response**: `201 Created`.

### `GET /api/meal-plans/:id`
Get meal plan with all scheduled meal items.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `POST /api/meal-plans/:id/items`
Add a scheduled meal to a meal plan.
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "recipe_id": 101,
  "planned_date": "2026-11-18",
  "meal_type": "BREAKFAST",
  "planned_servings": 2
}
```
- **Response**: `201 Created`.
- **Error Codes**: `400 Bad Request` (if planned_date is outside plan range).

### `PUT /api/meal-plans/:id/items/:item_id`
Update meal item status (`PLANNED`, `COOKED`, `SKIPPED`).
- **Auth Required**: Yes
- **Request Body**: `{ "status": "COOKED" }`
- **Response**: `200 OK`.

### `DELETE /api/meal-plans/:id/items/:item_id`
Remove scheduled meal item.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `DELETE /api/meal-plans/:id`
Delete entire meal plan.
- **Auth Required**: Yes
- **Response**: `200 OK`.

---

## 10. Cooking History APIs (Phase 4)

### `GET /api/cooking-history`
Get user's cooking history logs sorted by most recent.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `POST /api/cooking-history`
Log a completed recipe cooking session.
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "recipe_id": 101,
  "servings_made": 4,
  "notes": "Added extra blueberries!"
}
```
- **Response**: `201 Created`.

### `GET /api/cooking-history/:id`
Get single cooking record.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `PUT /api/cooking-history/:id`
Update notes or servings for a cooking log.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `DELETE /api/cooking-history/:id`
Delete a cooking log entry.
- **Auth Required**: Yes
- **Response**: `200 OK`.

---

## 11. Food Waste Management APIs (Phase 4)

### `GET /api/food-waste`
Get all food waste logs for authenticated user.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `POST /api/food-waste`
Record discarded food item.
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "ingredient_id": 2,
  "quantity": 100,
  "unit": "ml",
  "reason": "EXPIRED",
  "notes": "Left unopened past date"
}
```
- **Response**: `201 Created`.

### `GET /api/food-waste/summary`
Get aggregated waste statistics grouped strictly by unit and reason.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `DELETE /api/food-waste/:id`
Delete a food waste entry.
- **Auth Required**: Yes
- **Response**: `200 OK`.

---

## 12. Analytics & Dashboard APIs (Phase 5)

All analytics endpoints calculate real statistics scoped strictly to the authenticated user's JWT (`req.user.user_id`).

### `GET /api/analytics/dashboard`
Aggregated overview of kitchen statistics across all modules.
- **Auth Required**: Yes
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Main dashboard analytics retrieved successfully",
  "data": {
    "pantry": {
      "total_items": 2,
      "distinct_ingredients": 2,
      "expired_items": 0,
      "expiring_soon_items": 1,
      "active_items": 2
    },
    "recipes": {
      "total_available": 4,
      "user_created": 1,
      "predefined": 3,
      "favorite_count": 1
    },
    "shopping": {
      "total_lists": 1,
      "total_items": 1,
      "purchased_items": 1,
      "pending_items": 0,
      "completion_percentage": 100
    },
    "meal_planning": {
      "total_plans": 1,
      "total_planned_meals": 1,
      "upcoming_meals": 1
    },
    "cooking": {
      "total_history_records": 1,
      "distinct_recipes_cooked": 1,
      "total_servings_made": 2,
      "recent_cooked": [
        {
          "history_id": 1,
          "recipe_name": "Analytics Delight Pasta",
          "cooked_date": "2026-11-16T12:00:00.000Z",
          "servings_made": 2
        }
      ]
    },
    "food_waste": {
      "total_records": 1,
      "waste_by_unit": [
        { "unit": "ml", "total_quantity": 50 }
      ],
      "most_wasted_ingredients": [
        { "ingredient_name": "Milk", "unit": "ml", "total_quantity": 50, "waste_count": 1 }
      ],
      "waste_by_reason": [
        { "reason": "EXPIRED", "count": 1 }
      ]
    }
  }
}
```

### `GET /api/analytics/pantry`
Detailed pantry breakdown including category distribution and unit quantities.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `GET /api/analytics/recipes`
Recipe analytics: created vs predefined, favorite popularity, category and difficulty distribution.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `GET /api/analytics/cooking`
Cooking cadence: 7-day and 30-day frequency, most cooked recipes, servings prepared, and daily activity timeline.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `GET /api/analytics/food-waste`
Food waste analysis: quantities separated by unit, top wasted ingredients, reasons, and timeline.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `GET /api/analytics/shopping`
Shopping list efficiency: total lists, item completion rates, and active list breakdowns.
- **Auth Required**: Yes
- **Response**: `200 OK`.

### `GET /api/analytics/meal-planning`
Meal planning adherence: upcoming meals, meal types (Breakfast/Lunch/Dinner), and status (Planned/Cooked/Skipped).
- **Auth Required**: Yes
- **Response**: `200 OK`.
