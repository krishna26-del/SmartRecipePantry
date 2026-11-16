import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Authorization Bearer token automatically from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

// ─── API Service Helpers ──────────────────────────────────────────────────────

export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  getMe: () => api.get("/auth/me"),
};

export const recipeAPI = {
  getAll: (params) => api.get("/recipes", { params }),
  getById: (id) => api.get(`/recipes/${id}`),
  getMyRecipes: (params) => api.get("/recipes/my-recipes", { params }),
  create: (data) => api.post("/recipes", data),
  delete: (id) => api.delete(`/recipes/${id}`),
  getCategories: () => api.get("/categories"),
  getDietaryTags: () => api.get("/dietary-tags"),
  getIngredients: (params) => api.get("/ingredients", { params }),
  searchIngredients: (q) => api.get("/ingredients/search", { params: { q } }),
};

export const pantryAPI = {
  getPantry: () => api.get("/pantry"),
  getSummary: () => api.get("/pantry/summary"),
  getExpiring: () => api.get("/pantry/expiring"),
  getExpired: () => api.get("/pantry/expired"),
  addItem: (data) => api.post("/pantry", data),
  updateItem: (id, data) => api.put(`/pantry/${id}`, data),
  deleteItem: (id) => api.delete(`/pantry/${id}`),
};

export const recommendationAPI = {
  getRecommendations: (params) => api.get("/recommendations", { params }),
  getRecipeAvailability: (recipeId) => api.get(`/recommendations/${recipeId}`),
};

export const shoppingListAPI = {
  getAll: () => api.get("/shopping-lists"),
  getById: (id) => api.get(`/shopping-lists/${id}`),
  create: (data) => api.post("/shopping-lists", data),
  update: (id, data) => api.put(`/shopping-lists/${id}`, data),
  delete: (id) => api.delete(`/shopping-lists/${id}`),
  addItem: (listId, data) => api.post(`/shopping-lists/${listId}/items`, data),
  updateItem: (listId, itemId, data) => api.put(`/shopping-lists/${listId}/items/${itemId}`, data),
  deleteItem: (listId, itemId) => api.delete(`/shopping-lists/${listId}/items/${itemId}`),
  togglePurchase: (listId, itemId, isPurchased) =>
    api.patch(`/shopping-lists/${listId}/items/${itemId}/purchase`, { is_purchased: isPurchased }),
  generateFromRecipe: (listId, recipeId) =>
    api.post(`/shopping-lists/${listId}/generate-from-recipe/${recipeId}`),
};

export const favoriteAPI = {
  getAll: () => api.get("/favorites"),
  add: (recipeId) => api.post(`/favorites/${recipeId}`),
  remove: (recipeId) => api.delete(`/favorites/${recipeId}`),
  check: (recipeId) => api.get(`/favorites/${recipeId}/check`),
};

export const mealPlanAPI = {
  getAll: () => api.get("/meal-plans"),
  getById: (id) => api.get(`/meal-plans/${id}`),
  create: (data) => api.post("/meal-plans", data),
  update: (id, data) => api.put(`/meal-plans/${id}`, data),
  delete: (id) => api.delete(`/meal-plans/${id}`),
  addItem: (planId, data) => api.post(`/meal-plans/${planId}/items`, data),
  updateItem: (planId, itemId, data) => api.put(`/meal-plans/${planId}/items/${itemId}`, data),
  deleteItem: (planId, itemId) => api.delete(`/meal-plans/${planId}/items/${itemId}`),
};

export const cookingHistoryAPI = {
  getAll: (params) => api.get("/cooking-history", { params }),
  create: (data) => api.post("/cooking-history", data),
  delete: (id) => api.delete(`/cooking-history/${id}`),
};

export const foodWasteAPI = {
  getAll: (params) => api.get("/food-waste", { params }),
  getSummary: () => api.get("/food-waste/summary"),
  create: (data) => api.post("/food-waste", data),
  delete: (id) => api.delete(`/food-waste/${id}`),
};

export const analyticsAPI = {
  getDashboard: () => api.get("/analytics/dashboard"),
  getPantry: () => api.get("/analytics/pantry"),
  getRecipes: () => api.get("/analytics/recipes"),
  getCooking: () => api.get("/analytics/cooking"),
  getFoodWaste: () => api.get("/analytics/food-waste"),
  getShopping: () => api.get("/analytics/shopping"),
  getMealPlanning: () => api.get("/analytics/meal-planning"),
};
