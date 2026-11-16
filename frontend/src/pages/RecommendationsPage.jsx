import React, { useState, useEffect } from "react";
import { recommendationAPI, shoppingListAPI, recipeAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

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
      // Create a default list if none exists
      try {
        const createRes = await shoppingListAPI.create({ list_name: "Recipe Grocery List" });
        const newListId = createRes.data?.data?.list?.list_id;
        const res = await shoppingListAPI.generateFromRecipe(newListId, recipeId);
        setActionSuccess(res.data?.message || "Missing ingredients added to shopping list!");
        return;
      } catch (err) {
        setActionError("Failed to create shopping list");
        return;
      }
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
        <h2>✨ Smart Recipe Recommendations</h2>
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
          <h2>✨ Smart Recipe Recommendations</h2>
          <p className="subtitle">
            Ranked intelligently by matching your actual pantry stock against recipe ingredient requirements.
          </p>
        </div>

        {/* Quick Shopping List Selector */}
        {shoppingLists.length > 0 && (
          <div className="target-list-picker">
            <label>Add Missing Items To:</label>
            <select
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
              className="select-input"
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

      {actionSuccess && <div className="alert-success">{actionSuccess}</div>}
      {actionError && <div className="alert-error">{actionError}</div>}

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
        <div className="loading-state">Finding best recipe matches from your pantry...</div>
      ) : recommendations.length === 0 ? (
        <div className="empty-state">
          <p>No recipes match the selected filters or your pantry has insufficient items.</p>
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
                  <div>
                    <span className="category-pill">{rec.category?.category_name}</span>
                    <h3>{rec.recipe_name}</h3>
                  </div>
                  <div className={`coverage-badge ${isFullMatch ? "ready" : ""}`}>
                    <span className="coverage-pct">{rec.ingredient_coverage_percentage}%</span>
                    <span className="coverage-sub">Pantry Match</span>
                  </div>
                </div>

                <p className="rec-desc">{rec.description || "No description provided."}</p>

                {/* Coverage Progress Bar */}
                <div className="progress-bar-container">
                  <div
                    className={`progress-bar-fill ${isFullMatch ? "fill-complete" : ""}`}
                    style={{ width: `${rec.ingredient_coverage_percentage}%` }}
                  ></div>
                </div>

                <div className="rec-stats">
                  <span>⏱️ {rec.prep_time + rec.cook_time} mins</span>
                  <span>📊 {rec.difficulty}</span>
                  <span>👥 {rec.servings} servings</span>
                  <span>
                    ✅ {rec.available_ingredients_count}/{rec.total_required_ingredients} ingredients ready
                  </span>
                </div>

                {/* Available Ingredients */}
                <div className="ingredients-pill-list">
                  <span className="pill-section-title">In Pantry:</span>
                  {rec.available_ingredients.length > 0 ? (
                    rec.available_ingredients.map((ing) => (
                      <span key={ing.ingredient_id} className="pill pill-available">
                        ✓ {ing.ingredient_name}
                      </span>
                    ))
                  ) : (
                    <span className="pill-none">None</span>
                  )}
                </div>

                {/* Missing Ingredients */}
                {rec.missing_ingredients.length > 0 && (
                  <div className="ingredients-pill-list">
                    <span className="pill-section-title">Missing:</span>
                    {rec.missing_ingredients.map((ing) => (
                      <span key={ing.ingredient_id} className="pill pill-missing">
                        ✗ {ing.ingredient_name} ({ing.missing_quantity} {ing.required_unit})
                      </span>
                    ))}
                  </div>
                )}

                <div className="rec-card-actions">
                  <button className="secondary-btn" onClick={() => handleOpenDetail(rec.recipe_id)}>
                    View Instructions &amp; Breakdown
                  </button>
                  {rec.missing_ingredients.length > 0 ? (
                    <button
                      className="primary-btn"
                      onClick={() => handleGenerateShoppingList(rec.recipe_id)}
                      title="Automatically calculate missing quantities and add to shopping list"
                    >
                      🛒 Add Missing to Grocery List
                    </button>
                  ) : (
                    <button className="primary-btn complete-btn" disabled>
                      🎉 Ready to Cook!
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Detail / Availability Modal */}
      {selectedRecipeDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedRecipeDetail(null)}>
          <div className="modal-card wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedRecipeDetail.recipe_name}</h3>
                <span className="modal-sub">
                  {selectedRecipeDetail.category?.category_name} &bull; {selectedRecipeDetail.difficulty} &bull;{" "}
                  {selectedRecipeDetail.servings} Servings
                </span>
              </div>
              <button className="close-btn" onClick={() => setSelectedRecipeDetail(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body-scroll">
              <h4>Cooking Instructions</h4>
              <p className="instructions-text">{selectedRecipeDetail.instructions}</p>

              <h4>Detailed Ingredient Analysis</h4>
              <table className="ingredient-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Required</th>
                    <th>In Pantry</th>
                    <th>Status</th>
                    <th>Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecipeDetail.detailed_ingredients?.map((item) => (
                    <tr key={item.ingredient_id}>
                      <td><strong>{item.ingredient_name}</strong></td>
                      <td>{item.required_quantity} {item.required_unit}</td>
                      <td>
                        {item.pantry_quantity !== null
                          ? `${item.pantry_quantity} ${item.required_unit}`
                          : "None"}
                      </td>
                      <td>
                        {item.is_available ? (
                          <span className="badge badge-success">Available</span>
                        ) : item.uncertain ? (
                          <span className="badge badge-warning" title={item.reason}>
                            Uncertain Unit
                          </span>
                        ) : (
                          <span className="badge badge-danger">Insufficient</span>
                        )}
                      </td>
                      <td>
                        {item.missing_quantity > 0 ? (
                          <span className="text-danger">
                            {item.missing_quantity} {item.required_unit}
                          </span>
                        ) : (
                          "✓ 0"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button
                className="primary-btn"
                onClick={() => {
                  handleGenerateShoppingList(selectedRecipeDetail.recipe_id);
                  setSelectedRecipeDetail(null);
                }}
              >
                🛒 Add Missing Ingredients to Shopping List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
