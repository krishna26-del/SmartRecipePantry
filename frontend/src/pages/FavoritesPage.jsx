import React, { useState, useEffect } from "react";
import { favoriteAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function FavoritesPage({ onOpenAuth, onSelectRecipe }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await favoriteAPI.getAll();
      setFavorites(res.data?.data?.favorites || []);
    } catch (err) {
      console.error("Failed to load favorites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [user]);

  const handleRemoveFavorite = async (recipeId) => {
    try {
      await favoriteAPI.remove(recipeId);
      loadFavorites();
    } catch (err) {
      alert("Failed to remove from favorites");
    }
  };

  if (!user) {
    return (
      <div className="auth-prompt-card">
        <h2>❤️ Favorite Recipes</h2>
        <p>Sign in to view and curate your favorite recipes!</p>
        <button className="primary-btn" onClick={onOpenAuth}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <div className="page-header">
        <div>
          <h2>❤️ My Favorite Recipes</h2>
          <p className="subtitle">Your handpicked favorite dishes saved for quick reference.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading your favorite recipes...</div>
      ) : favorites.length === 0 ? (
        <div className="empty-state">
          <p>You haven't bookmarked any favorite recipes yet.</p>
          <span className="empty-hint">Browse recipes and click the ❤️ icon to save them here!</span>
        </div>
      ) : (
        <div className="recipes-grid">
          {favorites.map((recipe) => (
            <div key={recipe.recipe_id} className="recipe-card">
              <div className="recipe-card-header">
                <div>
                  <span className="category-pill">{recipe.category?.category_name}</span>
                  <h3>{recipe.recipe_name}</h3>
                </div>
                <button
                  className="favorite-btn active"
                  onClick={() => handleRemoveFavorite(recipe.recipe_id)}
                  title="Remove from favorites"
                >
                  ❤️
                </button>
              </div>

              <p className="recipe-desc">{recipe.description || "No description provided."}</p>

              <div className="recipe-meta-tags">
                <span>⏱️ {recipe.prep_time + recipe.cook_time} mins</span>
                <span>📊 {recipe.difficulty}</span>
                <span>👥 {recipe.servings} Servings</span>
              </div>

              {recipe.dietary_tags?.length > 0 && (
                <div className="dietary-tags-list">
                  {recipe.dietary_tags.map((t) => (
                    <span key={t.tag_id} className="dietary-tag">
                      🌱 {t.tag_name}
                    </span>
                  ))}
                </div>
              )}

              <div className="ingredients-preview">
                <strong>Ingredients ({recipe.ingredients?.length}):</strong>
                <p>
                  {recipe.ingredients?.map((i) => i.ingredient_name).join(", ") || "No ingredients listed"}
                </p>
              </div>

              <div className="recipe-card-footer">
                <span className="favorited-date">
                  Saved on {new Date(recipe.favorited_at).toLocaleDateString()}
                </span>
                <button className="secondary-btn" onClick={() => onSelectRecipe && onSelectRecipe(recipe)}>
                  View Recipe
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
