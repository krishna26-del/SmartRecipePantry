# 🥗 Smart Recipe Pantry

An intelligent, full-stack kitchen inventory, recipe recommendation, meal planning, and food waste reduction application built with **Node.js**, **Express**, **MySQL**, and **React (Vite)**.

---

## 📌 Project Overview

Smart Recipe Pantry solves common kitchen dilemmas: food waste, unorganized grocery shopping, and the daily question: *"What can I cook with what I have?"*

### Key Features
1. **Pantry Management**: Real-time ingredient tracking with shelf-life alerts (items expiring in 7 days or expired).
2. **Smart Recipe Recommendations**: Calculates exact pantry match percentages for recipes and highlights missing ingredients.
3. **Automated Shopping Lists**: Generate grocery checklists with a single click from missing recipe ingredients, with purchase toggling.
4. **Favorites & Meal Planning**: Schedule breakfast, lunch, and dinner recipes into structured weekly meal plans.
5. **Cooking History**: Log cooked meals with servings and personal notes.
6. **Food Waste Reduction**: Track discarded items by quantity and reason (spoiled, expired, overcooked) to build awareness.
7. **Analytics Dashboard**: Centralized KPI metrics and visual breakdowns across your pantry, cooking frequency, and food waste.
8. **Multi-User Security**: Strict JWT authentication with multi-tenant row-level data isolation.

---

## 🏗️ Architecture & Tech Stack

```
Smart Recipe Pantry
├── backend/
│   ├── config/          # MySQL connection pool (mysql2/promise) & JWT config
│   ├── controllers/     # Route logic for Auth, Recipes, Pantry, Shopping, etc.
│   ├── middleware/      # JWT auth guard (`protect`), error handlers
│   ├── routes/          # Express route definitions
│   ├── validators/      # Input sanitization and schema validators
│   ├── scripts/         # Automated test suites (Phases 1 through 5)
│   └── server.js        # Express app entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # Navbar, AuthModal, Reusable UI
│   │   ├── context/     # AuthContext (JWT management & session state)
│   │   ├── pages/       # Dashboard, Recipes, Pantry, Shopping, etc.
│   │   ├── services/    # Axios API client with auth interceptors
│   │   └── App.jsx      # Top-level routing and state management
│   └── package.json
└── API_DOCUMENTATION.md # Complete REST API specification
```

### Technologies
- **Backend**: Node.js, Express.js, MySQL (`mysql2/promise`), JWT (`jsonwebtoken`), bcryptjs, dotenv, cors.
- **Frontend**: React 18, Vite, Axios, Pure Modern CSS (Zero bulky UI library dependencies).
- **Database**: MySQL with relational schema (Foreign keys, cascades, indices).

---

## ⚙️ Prerequisites & Setup

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MySQL** (v8.0 or higher)
- **npm** or **yarn**

### 2. Database Setup
Create the MySQL database if not already created:
```sql
CREATE DATABASE IF NOT EXISTS recipe_management;
```
Ensure your MySQL user credentials match `backend/.env`.

### 3. Backend Setup
1. Navigate to `backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `backend/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=recipe_management
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=7d
   ```
4. Start the backend server:
   ```bash
   npm run dev
   # Or:
   node server.js
   ```
   *The backend will be running on `http://localhost:5000`.*

### 4. Frontend Setup
1. Navigate to `frontend`:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure frontend environment variables in `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will be running on `http://localhost:5173`.*

---

## 🧪 Automated Testing

Automated PowerShell test suites are provided to test all features and verify cross-user isolation:

```powershell
# Phase 1: Authentication & Server Foundation (40 tests)
powershell -ExecutionPolicy Bypass -File backend/scripts/test-phase1.ps1

# Phase 2: Recipe Management, Categories & Tags (75 tests)
powershell -ExecutionPolicy Bypass -File backend/scripts/test-phase2.ps1

# Phase 3 & 4: Pantry, Recommendations, Shopping, Meal Plans, Waste (64 tests)
powershell -ExecutionPolicy Bypass -File backend/scripts/test-phase3-4.ps1

# Phase 5: Analytics Dashboard & Multi-User Isolation (55 tests)
powershell -ExecutionPolicy Bypass -File backend/scripts/test-phase5.ps1
```

---

## 📖 API Documentation

For the full specification of endpoints, parameters, request/response formats, and error codes, refer to [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

---

## 🛡️ Security & Data Integrity
- **JWT Authorization**: All user-specific resources require a valid Bearer token.
- **SQL Injection Prevention**: All database queries strictly use parameterized queries (`?` placeholders).
- **Password Hashing**: Stored passwords use bcrypt with salt rounds.
- **Multi-Tenant Isolation**: Queries strictly filter by `req.user.user_id`, preventing unauthorized data access or updates across users.
- **Unit Separation**: Measurements in food waste and pantry are never blindly summed across mismatched units.

---

## 📄 License
ISC License &copy; Smart Recipe Pantry Team.
