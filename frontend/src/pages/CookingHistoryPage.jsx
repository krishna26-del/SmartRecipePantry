import React, { useState, useEffect } from "react";
import { cookingHistoryAPI, recipeAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function CookingHistoryPage({ onOpenAuth }) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [allRecipes, setAllRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Log Cook Modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [recipeId, setRecipeId] = useState("");
  const [servingsMade, setServingsMade] = useState(2);
  const [cookedAt, setCookedAt] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const loadHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await cookingHistoryAPI.getAll();
      setHistory(res.data?.data?.history || []);
    } catch (err) {
      console.error("Failed to load cooking history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    if (user) {
      recipeAPI.getAll({ limit: 50 }).then((r) => {
        setAllRecipes(r.data?.data?.recipes || []);
      });
    }
  }, [user]);

  const handleLogCooking = async (e) => {
    e.preventDefault();
    try {
      await cookingHistoryAPI.create({
        recipe_id: Number(recipeId),
        servings_made: Number(servingsMade),
        cooked_at: cookedAt,
        notes: notes || null,
      });
      setShowLogModal(false);
      setRecipeId("");
      setNotes("");
      loadHistory();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to log cooking activity");
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!window.confirm("Delete this cooking history entry?")) return;
    try {
      await cookingHistoryAPI.delete(id);
      loadHistory();
    } catch (err) {
      alert("Failed to delete entry");
    }
  };

  if (!user) {
    return (
      <div className="auth-prompt-card">
        <h2>📖 Cooking History</h2>
        <p>Sign in to record dishes you've cooked, track portions, and keep personal tasting notes!</p>
        <button className="primary-btn" onClick={onOpenAuth}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="page-header">
        <div>
          <h2>📖 Cooking History</h2>
          <p className="subtitle">A visual journal of delicious dishes you've prepared over time.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowLogModal(true)}>
          + Log Cooked Dish
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading your cooking journal...</div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <p>No cooked meals logged yet.</p>
          <button className="primary-btn" onClick={() => setShowLogModal(true)}>
            Log your first cooked meal
          </button>
        </div>
      ) : (
        <div className="history-timeline">
          {history.map((entry) => (
            <div key={entry.history_id} className="timeline-item">
              <div className="timeline-marker">🍳</div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <div>
                    <h4>{entry.recipe_name}</h4>
                    <span className="timeline-date">
                      {new Date(entry.cooked_at).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <button
                    className="delete-icon-btn"
                    onClick={() => handleDeleteHistory(entry.history_id)}
                    title="Delete entry"
                  >
                    ✕
                  </button>
                </div>

                <div className="timeline-meta">
                  <span>👥 {entry.servings_made} servings prepared</span>
                  {entry.category_name && <span>🏷️ {entry.category_name}</span>}
                </div>

                {entry.notes && <p className="timeline-notes">"{entry.notes}"</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Cook Modal */}
      {showLogModal && (
        <div className="modal-backdrop" onClick={() => setShowLogModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Log a Cooked Recipe</h3>
              <button className="close-btn" onClick={() => setShowLogModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleLogCooking} className="modal-form">
              <div className="form-group">
                <label>Select Recipe</label>
                <select required value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
                  <option value="">-- Choose Recipe --</option>
                  {allRecipes.map((r) => (
                    <option key={r.recipe_id} value={r.recipe_id}>
                      {r.recipe_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Servings Cooked</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={servingsMade}
                    onChange={(e) => setServingsMade(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Cooked Date</label>
                  <input
                    type="date"
                    required
                    value={cookedAt}
                    onChange={(e) => setCookedAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tasting Notes (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="How did it turn out? Any tweaks made to spices or cooking time?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>

              <button type="submit" className="submit-btn">
                Save to History
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
