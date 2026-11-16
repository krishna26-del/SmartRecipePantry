import React, { useState, useEffect } from "react";
import { foodWasteAPI, recipeAPI, pantryAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function FoodWastePage({ onOpenAuth }) {
  const { user } = useAuth();
  const [wasteList, setWasteList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Log Waste Modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [ingredientId, setIngredientId] = useState("");
  const [pantryItemId, setPantryItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g");
  const [reason, setReason] = useState("EXPIRED");
  const [notes, setNotes] = useState("");

  const loadWasteData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [listRes, sumRes, ingRes, panRes] = await Promise.all([
        foodWasteAPI.getAll(),
        foodWasteAPI.getSummary(),
        recipeAPI.getIngredients({ limit: 100 }),
        pantryAPI.getPantry(),
      ]);
      setWasteList(listRes.data?.data?.waste || []);
      setSummary(sumRes.data?.data?.summary || null);
      setIngredients(ingRes.data?.data?.ingredients || []);
      setPantryItems(panRes.data?.data?.pantry || []);
    } catch (err) {
      console.error("Failed to load food waste data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWasteData();
  }, [user]);

  const handleLogWaste = async (e) => {
    e.preventDefault();
    try {
      await foodWasteAPI.create({
        ingredient_id: Number(ingredientId),
        pantry_item_id: pantryItemId ? Number(pantryItemId) : null,
        quantity: Number(quantity),
        unit,
        reason,
        notes: notes || null,
      });
      setShowLogModal(false);
      setIngredientId("");
      setPantryItemId("");
      setQuantity("");
      setNotes("");
      loadWasteData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to log food waste");
    }
  };

  const handleDeleteWaste = async (id) => {
    if (!window.confirm("Delete this waste log?")) return;
    try {
      await foodWasteAPI.delete(id);
      loadWasteData();
    } catch (err) {
      alert("Failed to delete waste log");
    }
  };

  if (!user) {
    return (
      <div className="auth-prompt-card">
        <h2>♻️ Food Waste Tracking</h2>
        <p>Sign in to record wasted ingredients, identify spoilage trends, and reduce kitchen waste!</p>
        <button className="primary-btn" onClick={onOpenAuth}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="waste-page">
      <div className="page-header">
        <div>
          <h2>♻️ Food Waste Management</h2>
          <p className="subtitle">Track discarded food items, identify spoilage reasons, and save money.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowLogModal(true)}>
          + Record Wasted Food
        </button>
      </div>

      {/* Waste Summary Analytics */}
      {summary && (
        <div className="waste-analytics-grid">
          <div className="analytics-card">
            <h4>Total Waste Incidents</h4>
            <span className="big-stat">{summary.total_records}</span>
          </div>

          <div className="analytics-card">
            <h4>Waste By Unit (Exact)</h4>
            <div className="unit-tags-container">
              {summary.waste_by_unit?.map((u) => (
                <span key={u.unit} className="unit-stat-pill">
                  <strong>{u.total_quantity} {u.unit}</strong> ({u.incident_count}x)
                </span>
              ))}
              {summary.waste_by_unit?.length === 0 && <p className="muted-text">No waste recorded</p>}
            </div>
          </div>

          <div className="analytics-card">
            <h4>Waste By Reason</h4>
            <div className="reasons-stat-list">
              {summary.waste_by_reason?.map((r) => (
                <div key={r.reason} className="reason-row">
                  <span>{r.reason}</span>
                  <span className="count-pill">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Wasted Ingredients */}
      {summary?.top_wasted_ingredients?.length > 0 && (
        <div className="top-wasted-banner">
          <h4>⚠️ Most Frequently Wasted Ingredients</h4>
          <div className="top-ingredients-pills">
            {summary.top_wasted_ingredients.map((ing) => (
              <span key={ing.ingredient_id} className="top-ing-pill">
                {ing.ingredient_name}: <strong>{ing.total_quantity} {ing.unit}</strong> ({ing.waste_occurrences}x)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Waste Log Table */}
      {loading ? (
        <div className="loading-state">Loading food waste logs...</div>
      ) : wasteList.length === 0 ? (
        <div className="empty-state">
          <p>Great job! No food waste logged yet.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="waste-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ingredient</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {wasteList.map((entry) => (
                <tr key={entry.waste_id}>
                  <td>{new Date(entry.wasted_at).toLocaleDateString()}</td>
                  <td><strong>{entry.ingredient_name}</strong></td>
                  <td>{entry.quantity} {entry.unit}</td>
                  <td>
                    <span className={`reason-badge badge-${entry.reason?.toLowerCase()}`}>
                      {entry.reason}
                    </span>
                  </td>
                  <td>{entry.notes || "—"}</td>
                  <td>
                    <button
                      className="delete-icon-btn"
                      onClick={() => handleDeleteWaste(entry.waste_id)}
                      title="Delete record"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Waste Modal */}
      {showLogModal && (
        <div className="modal-backdrop" onClick={() => setShowLogModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Wasted Ingredient</h3>
              <button className="close-btn" onClick={() => setShowLogModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleLogWaste} className="modal-form">
              <div className="form-group">
                <label>Select Ingredient</label>
                <select
                  required
                  value={ingredientId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setIngredientId(id);
                    const selected = ingredients.find((i) => i.ingredient_id === Number(id));
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

              {pantryItems.length > 0 && (
                <div className="form-group">
                  <label>Linked Pantry Item (Optional)</label>
                  <select
                    value={pantryItemId}
                    onChange={(e) => {
                      setPantryItemId(e.target.value);
                      const pItem = pantryItems.find((p) => p.pantry_item_id === Number(e.target.value));
                      if (pItem) {
                        setIngredientId(pItem.ingredient_id);
                        setUnit(pItem.unit);
                        setQuantity(pItem.quantity);
                      }
                    }}
                  >
                    <option value="">-- None (Manual entry) --</option>
                    {pantryItems.map((p) => (
                      <option key={p.pantry_item_id} value={p.pantry_item_id}>
                        {p.ingredient_name} ({p.quantity} {p.unit}) - Exp: {p.expiry_date?.split("T")[0] || "None"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Wasted Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Unit</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reason for Waste</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="EXPIRED">Expired on shelf</option>
                  <option value="SPOILED">Spoiled / Moldy</option>
                  <option value="LEFTOVER">Unused leftovers</option>
                  <option value="PREPARATION">Cooking mistake / Burnt</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Left in fridge too long"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>

              <button type="submit" className="submit-btn">
                Record Waste
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
