import React, { useState, useEffect } from "react";
import { recommendationAPI, shoppingListAPI, recipeAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  SparklesIcon,
  ShoppingCartIcon,
  ClockIcon,
  FilterIcon,
  UserIcon,
  CheckIcon,
  CloseIcon,
  AlertCircleIcon,
} from "../components/Icons";

export default function RecommendationsPage({ onOpenAuth, onNavigateToShopping }) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState(null);
  const [shoppingLists, setShoppingLists] = useState([]);
  const [targetListId, setTargetListId] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const loadRecommendations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedDifficulty) params.difficulty = selectedDifficulty;

      const [recRes, catRes, listsRes] = await Promise.all([
        recommendationAPI.getRecommendations(params),
        recipeAPI.getCategories(),
        shoppingListAPI.getAll(),
      ]);

      setRecommendations(recRes.data?.data?.recommendations || []);
      setCategories(catRes.data?.data?.categories || []);
      const lists = listsRes.data?.data?.lists || [];
      setShoppingLists(lists);
      if (lists.length > 0 && !targetListId) {
        setTargetListId(lists[0].list_id);
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [user, selectedCategory, selectedDifficulty]);

  const handleOpenDetail = async (recipeId) => {
    try {
      const res = await recommendationAPI.getRecipeAvailability(recipeId);
      setSelectedRecipeDetail(res.data?.data?.availability || null);
    } catch (err) {
      alert("Failed to load recipe availability details");
    }
  };

  const handleGenerateShoppingList = async (recipeId) => {
    setActionSuccess("");
    setActionError("");

    if (!targetListId) {
      try {
        const createRes = await shoppingListAPI.create({ list_name: "Recipe Grocery List" });
        const newListId = createRes.data?.data?.list?.list_id;
        const res = await shoppingListAPI.generateFromRecipe(newListId, recipeId);
        setActionSuccess(res.data?.message || "Created list & added missing ingredients!");
        loadRecommendations();
      } catch (err) {
        setActionError(err.response?.data?.message || "Failed to create list and add ingredients");
      }
      return;
    }

    try {
      const res = await shoppingListAPI.generateFromRecipe(targetListId, recipeId);
      setActionSuccess(res.data?.message || "Missing ingredients added to shopping list!");
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to add items to shopping list");
    }
  };

  if (!user) {
    return (
      <div className="auth-prompt-card">
        <div className="auth-prompt-icon-wrap">
          <SparklesIcon size={36} />
        </div>
        <h2>Smart Recipe Recommendations</h2>
        <p>Log in to discover recipes you can cook right now with what is inside your pantry!</p>
        <button className="primary-btn" onClick={onOpenAuth}>
          Sign In for Recommendations
        </button>
      </div>
    );
  }

  return (
    <div className="recommendations-page">
      <div className="page-header">
        <div>
          <div className="header-badge">Intelligent Matching</div>
          <h2>Smart Recipe Matches</h2>
          <p className="subtitle">
            Ranked dynamically by comparing your active pantry inventory against required ingredients.
          </p>
        </div>

        {/* Quick Shopping List Selector */}
        {shoppingLists.length > 0 && (
          <div className="target-list-picker">
            <span className="picker-label">Target Shopping List:</span>
            <select
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
              className="select-input compact"
            >
              {shoppingLists.map((l) => (
                <option key={l.list_id} value={l.list_id}>
                  {l.list_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {actionSuccess && (
        <div className="alert-success">
          <CheckIcon size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="alert-error">
          <AlertCircleIcon size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="select-input"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.category_name}
            </option>
          ))}
        </select>

        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="select-input"
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      {/* Recommendations List */}
      {loading ? (
        <div className="loading-state">Matching recipes against your kitchen stock...</div>
      ) : recommendations.length === 0 ? (
        <div className="empty-state">
          <SparklesIcon size={40} className="empty-state-icon" />
          <h3>No matching recipes found</h3>
          <p>Try adding more pantry items or relaxing category filters.</p>
        </div>
      ) : (
        <div className="recommendations-grid">
          {recommendations.map((rec) => {
            const isFullMatch = rec.ingredient_coverage_percentage === 100;
            return (
              <div
                key={rec.recipe_id}
                className={`recommendation-card ${isFullMatch ? "full-match" : ""}`}
              >
                <div className="rec-card-header">
                  <div className="rec-title-group">
                    <span className="category-pill">{rec.category?.category_name}</span>
                    <h3 className="rec-recipe-name">{rec.recipe_name}</h3>
                  </div>
                  <div className={`coverage-badge ${isFullMatch ? "ready" : ""}`}>
                    <span className="coverage-pct">{rec.ingredient_coverage_percentage}%</span>
                    <span className="coverage-sub">{isFullMatch ? "Ready to Cook" : "Pantry Match"}</span>
                  </div>
                </div>

                <p className="rec-desc">{rec.description || "No description provided."}</p>

                {/* Coverage Progress Bar */}
                <div className="progress-bar-container">
                  <div
                    className={`progress-bar-fill ${isFullMatch ? "fill-complete" : ""}`}
                    style={{ width: `${rec.ingredient_coverage_percentage}%` }}
                  />
                </div>

                <div className="rec-stats">
                  <span className="meta-tag">
                    <ClockIcon size={13} />
                    {rec.prep_time + rec.cook_time} mins
                  </span>
                  <span className="meta-tag">
                    <FilterIcon size={13} />
                    {rec.difficulty}
                  </span>
                  <span className="meta-tag">
                    <UserIcon size={13} />
                    {rec.servings} Servings
                  </span>
                  <span className="meta-tag forest-tag">
                    <CheckIcon size={13} />
                    {rec.available_ingredients_count}/{rec.total_required_ingredients} Ready
                  </span>
                </div>

                {/* Available Ingredients */}
                <div className="ingredients-pill-list">
                  <span className="pill-section-title">In Pantry:</span>
                  {rec.available_ingredients.length > 0 ? (
                    rec.available_ingredients.map((ing) => (
                      <span key={ing.ingredient_id} className="pill pill-available">
                        <CheckIcon size={11} /> {ing.ingredient_name}
                      </span>
                    ))
                  ) : (
                    <span className="pill-none">None in stock</span>
                  )}
                </div>

                {/* Missing Ingredients */}
                {rec.missing_ingredients.length > 0 && (
                  <div className="ingredients-pill-list">
                    <span className="pill-section-title missing">Missing:</span>
                    {rec.missing_ingredients.map((ing) => (
                      <span key={ing.ingredient_id} className="pill pill-missing">
                        + {ing.ingredient_name} ({ing.missing_quantity} {ing.unit})
                      </span>
                    ))}
                  </div>
                )}

                {/* Card Action Buttons */}
                <div className="rec-card-actions">
                  <button className="secondary-btn" onClick={() => handleOpenDetail(rec.recipe_id)}>
                    View Breakdown
                  </button>
                  {rec.missing_ingredients.length > 0 ? (
                    <button
                      className="primary-btn"
                      onClick={() => handleGenerateShoppingList(rec.recipe_id)}
                      title="Add missing ingredients directly to shopping list"
                    >
                      <ShoppingCartIcon size={15} />
                      <span>Add Missing to List</span>
                    </button>
                  ) : (
                    <span className="cook-now-pill">
                      <CheckIcon size={14} /> Ready to Cook Now
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipeDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedRecipeDetail(null)}>
          <div className="modal-card wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedRecipeDetail.recipe_name}</h3>
                <span className="modal-sub">
                  Match Score: <strong>{selectedRecipeDetail.coverage_percentage}%</strong> &bull;{" "}
                  {selectedRecipeDetail.can_cook ? "Can Cook Right Away" : "Missing Ingredients"}
                </span>
              </div>
              <button
                className="close-btn"
                onClick={() => setSelectedRecipeDetail(null)}
                aria-label="Close modal"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="modal-body-scroll">
              <div className="detail-section-title">
                <h4>Ingredient Breakdown</h4>
              </div>

              <div className="availability-table-wrap">
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Required</th>
                      <th>In Pantry</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRecipeDetail.ingredients?.map((i) => (
                      <tr key={i.ingredient_id}>
                        <td className="font-medium">{i.ingredient_name}</td>
                        <td>
                          {i.required_quantity} {i.unit}
                        </td>
                        <td>
                          {i.pantry_quantity} {i.unit}
                        </td>
                        <td>
                          {i.has_enough ? (
                            <span className="badge-pill in-stock">
                              <CheckIcon size={11} /> In Stock
                            </span>
                          ) : (
                            <span className="badge-pill missing-badge">
                              Missing {i.missing_quantity} {i.unit}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="secondary-btn"
                onClick={() => setSelectedRecipeDetail(null)}
              >
                Close
              </button>
              {!selectedRecipeDetail.can_cook && (
                <button
                  className="primary-btn"
                  onClick={() => {
                    handleGenerateShoppingList(selectedRecipeDetail.recipe_id);
                    setSelectedRecipeDetail(null);
                  }}
                >
                  <ShoppingCartIcon size={15} />
                  <span>Add Missing to Shopping List</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
