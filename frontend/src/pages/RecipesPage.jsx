import React, { useState, useEffect } from "react";
import { recipeAPI, favoriteAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function RecipesPage({ onOpenAuth, initialSelectedRecipe = null }) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dietaryTags, setDietaryTags] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedTag, setSelectedTag] = useState("");

  // Modals
  const [selectedRecipe, setSelectedRecipe] = useState(initialSelectedRecipe);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Recipe Form
  const [recipeName, setRecipeName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState(15);
  const [cookTime, setCookTime] = useState(20);
  const [difficulty, setDifficulty] = useState("EASY");
  const [servings, setServings] = useState(2);
  const [createError, setCreateError] = useState("");

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedDifficulty) params.difficulty = selectedDifficulty;
      if (selectedTag) params.dietary_tag_id = selectedTag;

      const [recRes, catRes, tagRes] = await Promise.all([
        recipeAPI.getAll(params),
        recipeAPI.getCategories(),
        recipeAPI.getDietaryTags(),
      ]);

      setRecipes(recRes.data?.data?.recipes || []);
      setCategories(catRes.data?.data?.categories || []);
      setDietaryTags(tagRes.data?.data?.dietary_tags || []);

      if (user) {
        const favRes = await favoriteAPI.getAll();
        const favs = favRes.data?.data?.favorites || [];
        setFavoriteIds(new Set(favs.map((f) => f.recipe_id)));
      }
    } catch (err) {
      console.error("Failed to load recipes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, [user, search, selectedCategory, selectedDifficulty, selectedTag]);

  const handleToggleFavorite = async (recipeId) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const isFav = favoriteIds.has(recipeId);
    try {
      if (isFav) {
        await favoriteAPI.remove(recipeId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
      } else {
        await favoriteAPI.add(recipeId);
        setFavoriteIds((prev) => new Set(prev).add(recipeId));
      }
    } catch (err) {
      alert("Failed to update favorite");
    }
  };

  const handleOpenRecipe = async (id) => {
    try {
      const res = await recipeAPI.getById(id);
      setSelectedRecipe(res.data?.data?.recipe || null);
    } catch (err) {
      alert("Failed to load recipe details");
    }
  };

  return (
    <div className="recipes-page">
      <div className="page-header">
        <div>
          <h2>🍳 Explore Recipes</h2>
          <p className="subtitle">Discover chef-crafted meals, quick dinners, and community favorites.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="recipes-search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search recipes by name (e.g. Pasta, Curry, Pancakes)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filters-row">
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

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="select-input"
          >
            <option value="">All Dietary Tags</option>
            {dietaryTags.map((t) => (
              <option key={t.tag_id} value={t.tag_id}>
                {t.tag_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Recipe Cards Grid */}
      {loading ? (
        <div className="loading-state">Loading delicious recipes...</div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <p>No recipes found matching your search and filter criteria.</p>
        </div>
      ) : (
        <div className="recipes-grid">
          {recipes.map((r) => {
            const isFav = favoriteIds.has(r.recipe_id);
            return (
              <div key={r.recipe_id} className="recipe-card">
                <div className="recipe-card-header">
                  <div>
                    <span className="category-pill">{r.category?.category_name}</span>
                    <h3>{r.recipe_name}</h3>
                  </div>
                  <button
                    className={`favorite-btn ${isFav ? "active" : ""}`}
                    onClick={() => handleToggleFavorite(r.recipe_id)}
                    title={isFav ? "Remove favorite" : "Save to favorites"}
                  >
                    {isFav ? "❤️" : "🤍"}
                  </button>
                </div>

                <p className="recipe-desc">{r.description || "No description provided."}</p>

                <div className="recipe-meta-tags">
                  <span>⏱️ {r.prep_time + r.cook_time} mins</span>
                  <span>📊 {r.difficulty}</span>
                  <span>👥 {r.servings} Servings</span>
                </div>

                {r.dietary_tags?.length > 0 && (
                  <div className="dietary-tags-list">
                    {r.dietary_tags.map((t) => (
                      <span key={t.tag_id} className="dietary-tag">
                        🌱 {t.tag_name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="ingredients-preview">
                  <strong>Key Ingredients:</strong>
                  <p>
                    {r.ingredients?.map((i) => i.ingredient_name).join(", ") || "Ingredients on detail"}
                  </p>
                </div>

                <div className="recipe-card-footer">
                  <span className="source-pill">
                    {r.source_type === "PREDEFINED" ? "🌟 Chef Curated" : "👤 Community"}
                  </span>
                  <button className="primary-btn" onClick={() => handleOpenRecipe(r.recipe_id)}>
                    View Recipe
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Details Modal */}
      {selectedRecipe && (
        <div className="modal-backdrop" onClick={() => setSelectedRecipe(null)}>
          <div className="modal-card wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedRecipe.recipe_name}</h3>
                <span className="modal-sub">
                  {selectedRecipe.category?.category_name} &bull; {selectedRecipe.difficulty} &bull;{" "}
                  {selectedRecipe.servings} Servings
                </span>
              </div>
              <button className="close-btn" onClick={() => setSelectedRecipe(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body-scroll">
              <p className="detail-desc">{selectedRecipe.description}</p>

              <h4>Ingredients ({selectedRecipe.ingredients?.length})</h4>
              <ul className="recipe-ingredients-checklist">
                {selectedRecipe.ingredients?.map((i) => (
                  <li key={i.ingredient_id}>
                    <strong>{i.ingredient_name}:</strong> {i.quantity} {i.unit}{" "}
                    {i.notes && <span className="ing-note">({i.notes})</span>}
                  </li>
                ))}
              </ul>

              <h4>Cooking Instructions</h4>
              <div className="instructions-container">
                <p>{selectedRecipe.instructions}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className={`secondary-btn ${favoriteIds.has(selectedRecipe.recipe_id) ? "favorited" : ""}`}
                onClick={() => handleToggleFavorite(selectedRecipe.recipe_id)}
              >
                {favoriteIds.has(selectedRecipe.recipe_id) ? "❤️ In Favorites" : "🤍 Add to Favorites"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
