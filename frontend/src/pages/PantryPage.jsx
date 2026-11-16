import React, { useState, useEffect } from "react";
import { pantryAPI, recipeAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function PantryPage({ onOpenAuth }) {
  const { user } = useAuth();
  const [pantry, setPantry] = useState([]);
  const [summary, setSummary] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all' | 'expiring' | 'expired'
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form state
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g");
  const [expiryDate, setExpiryDate] = useState("");
  const [formError, setFormError] = useState("");

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pantryRes, summaryRes, ingsRes] = await Promise.all([
        pantryAPI.getPantry(),
        pantryAPI.getSummary(),
        recipeAPI.getIngredients({ limit: 100 }),
      ]);
      setPantry(pantryRes.data?.data?.pantry || []);
      setSummary(summaryRes.data?.data || null);
      setIngredients(ingsRes.data?.data?.ingredients || []);
    } catch (err) {
      console.error("Failed to load pantry data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await pantryAPI.addItem({
        ingredient_id: Number(ingredientId),
        quantity: Number(quantity),
        unit,
        expiry_date: expiryDate || null,
      });
      setShowAddModal(false);
      setIngredientId("");
      setQuantity("");
      setExpiryDate("");
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to add pantry item");
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Remove this item from your pantry?")) return;
    try {
      await pantryAPI.deleteItem(id);
      loadData();
    } catch (err) {
      alert("Failed to delete pantry item");
    }
  };

  const handleQuickQuantityUpdate = async (id, currentQty, delta) => {
    const newQty = Math.max(0, currentQty + delta);
    try {
      await pantryAPI.updateItem(id, { quantity: newQty });
      loadData();
    } catch (err) {
      alert("Failed to update quantity");
    }
  };

  if (!user) {
    return (
      <div className="auth-prompt-card">
        <h2>🥫 Pantry Management</h2>
        <p>Sign in to manage your pantry ingredients, track shelf-life, and get smart recipe matches!</p>
        <button className="primary-btn" onClick={onOpenAuth}>
          Sign In to View Pantry
        </button>
      </div>
    );
  }

  const filteredPantry = pantry.filter((item) => {
    if (filter === "expiring") return item.status === "EXPIRING_SOON";
    if (filter === "expired") return item.status === "EXPIRED";
    return true;
  });

  return (
    <div className="pantry-page">
      <div className="page-header">
        <div>
          <h2>🥫 My Pantry Inventory</h2>
          <p className="subtitle">Track ingredients, expiration dates, and pantry stock in real-time.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowAddModal(true)}>
          + Add Ingredient
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards-grid">
          <div className="summary-card">
            <span className="card-num">{summary.total_items}</span>
            <span className="card-label">Total Items</span>
          </div>
          <div className="summary-card active">
            <span className="card-num">{summary.active_items}</span>
            <span className="card-label">Active & Fresh</span>
          </div>
          <div className="summary-card warning">
            <span className="card-num">{summary.expiring_soon_items}</span>
            <span className="card-label">Expiring Soon (&le; 7 days)</span>
          </div>
          <div className="summary-card danger">
            <span className="card-num">{summary.expired_items}</span>
            <span className="card-label">Expired</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="tab-filters">
        <button
          className={`tab-filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All Items ({pantry.length})
        </button>
        <button
          className={`tab-filter-btn ${filter === "expiring" ? "active" : ""}`}
          onClick={() => setFilter("expiring")}
        >
          Expiring Soon ({summary?.expiring_soon_items || 0})
        </button>
        <button
          className={`tab-filter-btn ${filter === "expired" ? "active" : ""}`}
          onClick={() => setFilter("expired")}
        >
          Expired ({summary?.expired_items || 0})
        </button>
      </div>

      {/* Pantry List Table / Cards */}
      {loading ? (
        <div className="loading-state">Loading your pantry...</div>
      ) : filteredPantry.length === 0 ? (
        <div className="empty-state">
          <p>No pantry items found under this filter.</p>
          <button className="primary-btn" onClick={() => setShowAddModal(true)}>
            Add an item now
          </button>
        </div>
      ) : (
        <div className="pantry-grid">
          {filteredPantry.map((item) => (
            <div key={item.pantry_item_id} className={`pantry-card status-${item.status.toLowerCase()}`}>
              <div className="pantry-card-top">
                <h4>{item.ingredient_name}</h4>
                <span className={`badge badge-${item.status.toLowerCase()}`}>
                  {item.status === "EXPIRING_SOON"
                    ? "⚠️ Expiring Soon"
                    : item.status === "EXPIRED"
                    ? "⛔ Expired"
                    : "Fresh"}
                </span>
              </div>

              <div className="pantry-card-qty">
                <span className="qty-number">
                  {item.quantity} {item.unit}
                </span>
                <div className="qty-buttons">
                  <button
                    className="qty-btn"
                    onClick={() => handleQuickQuantityUpdate(item.pantry_item_id, item.quantity, -10)}
                  >
                    -
                  </button>
                  <button
                    className="qty-btn"
                    onClick={() => handleQuickQuantityUpdate(item.pantry_item_id, item.quantity, 10)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="pantry-card-footer">
                <span className="expiry-text">
                  {item.expiry_date ? `Expires: ${item.expiry_date.split("T")[0]}` : "No expiration date"}
                </span>
                <button
                  className="delete-icon-btn"
                  onClick={() => handleDeleteItem(item.pantry_item_id)}
                  title="Remove item"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Pantry Item Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Pantry Item</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            {formError && <div className="alert-error">{formError}</div>}

            <form onSubmit={handleAddItem} className="modal-form">
              <div className="form-group">
                <label>Select Ingredient</label>
                <select
                  required
                  value={ingredientId}
                  onChange={(e) => {
                    setIngredientId(e.target.value);
                    const selected = ingredients.find((i) => i.ingredient_id === Number(e.target.value));
                    if (selected) setUnit(selected.default_unit || "g");
                  }}
                >
                  <option value="">-- Choose Ingredient --</option>
                  {ingredients.map((ing) => (
                    <option key={ing.ingredient_id} value={ing.ingredient_id}>
                      {ing.ingredient_name} ({ing.default_unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>

                <div className="form-group">
                  <label>Unit</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="g, ml, piece"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>

              <button type="submit" className="submit-btn">
                Add to Pantry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
