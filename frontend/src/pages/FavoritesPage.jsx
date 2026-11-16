import React, { useState, useEffect } from "react";
import { favoriteAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  HeartIcon,
  ClockIcon,
  FilterIcon,
  UserIcon,
} from "../components/Icons";

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
        <div className="auth-prompt-icon-wrap">
          <HeartIcon size={36} />
        </div>
        <h2>Favorite Recipes</h2>
        <p>Sign in to view and curate your personal collection of bookmarked recipes!</p>
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
          <div className="header-badge">Saved Collection</div>
          <h2>Favorite Recipes</h2>
          <p className="subtitle">Your handpicked dishes saved for quick cooking and weekly meal prep.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading your favorite recipes...</div>
      ) : favorites.length === 0 ? (
        <div className="empty-state">
          <HeartIcon size={40} className="empty-state-icon" />
          <h3>No bookmarked recipes yet</h3>
          <p>Explore the recipe catalog and click the heart icon on any recipe to save it here.</p>
        </div>
      ) : (
        <div className="recipes-grid">
          {favorites.map((recipe) => (
            <div key={recipe.recipe_id} className="recipe-card">
              <div className="recipe-card-header">
                <div className="recipe-title-block">
                  <span className="category-pill">{recipe.category?.category_name}</span>
                  <h3 className="recipe-title">{recipe.recipe_name}</h3>
                </div>
                <button
                  className="favorite-btn active"
                  onClick={() => handleRemoveFavorite(recipe.recipe_id)}
                  title="Remove from favorites"
                  aria-label="Remove favorite"
                >
                  <HeartIcon size={20} color="#e11d48" className="filled-heart" />
                </button>
              </div>

              <p className="recipe-desc">{recipe.description || "No description provided."}</p>

              <div className="recipe-meta-tags">
                <span className="meta-tag">
                  <ClockIcon size={14} />
                  {recipe.prep_time + recipe.cook_time} mins
                </span>
                <span className="meta-tag">
                  <FilterIcon size={14} />
                  {recipe.difficulty}
                </span>
                <span className="meta-tag">
                  <UserIcon size={14} />
                  {recipe.servings} Servings
                </span>
              </div>

              {recipe.dietary_tags?.length > 0 && (
                <div className="dietary-tags-list">
                  {recipe.dietary_tags.map((t) => (
                    <span key={t.tag_id} className="dietary-tag">
                      {t.tag_name}
                    </span>
                  ))}
                </div>
              )}

              <div className="ingredients-preview">
                <span className="preview-label">Ingredients ({recipe.ingredients?.length}):</span>
                <p className="preview-text">
                  {recipe.ingredients?.map((i) => i.ingredient_name).join(", ") || "No ingredients listed"}
                </p>
              </div>

              <div className="recipe-card-footer">
                <span className="favorited-date">
                  Saved on {new Date(recipe.favorited_at).toLocaleDateString()}
                </span>
                <button className="primary-btn" onClick={() => onSelectRecipe && onSelectRecipe(recipe)}>
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
