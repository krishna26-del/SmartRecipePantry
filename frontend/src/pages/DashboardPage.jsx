import React, { useState, useEffect } from "react";
import { analyticsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage({ onOpenAuth, onNavigateTab }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await analyticsAPI.getDashboard();
      setData(res.data?.data || null);
    } catch (err) {
      console.error("Failed to load dashboard analytics:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user]);

  if (!user) {
    return (
      <div className="auth-prompt-card">
        <h2>📊 Smart Kitchen Dashboard</h2>
        <p>Sign in to see a real-time command center of your pantry, meal plans, shopping status, and cooking habits!</p>
        <button className="primary-btn" onClick={onOpenAuth}>
          Sign In to Access Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-state">Analyzing your kitchen metrics...</div>;
  }

  if (error) {
    return (
      <div className="alert-error">
        {error}
        <button className="secondary-btn" onClick={loadDashboard} style={{ marginLeft: "12px" }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { pantry, recipes, shopping, meal_planning, cooking, food_waste } = data;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h2>📊 Kitchen Command Center</h2>
          <p className="subtitle">Real-time statistics across all kitchen activities and inventory.</p>
        </div>
        <button className="secondary-btn" onClick={loadDashboard}>
          🔄 Refresh
        </button>
      </div>

      {/* ── 1. Top Key Metric Cards ────────────────────────────────────────── */}
      <div className="dashboard-metrics-grid">
        <div className="metric-box clickable" onClick={() => onNavigateTab("pantry")}>
          <div className="metric-icon">🥫</div>
          <div className="metric-info">
            <span className="metric-val">{pantry.total_items}</span>
            <span className="metric-label">Pantry Items</span>
            <span className="metric-sub">{pantry.active_items} fresh, {pantry.expiring_soon_items} expiring</span>
          </div>
        </div>

        <div className="metric-box clickable" onClick={() => onNavigateTab("recipes")}>
          <div className="metric-icon">🍳</div>
          <div className="metric-info">
            <span className="metric-val">{recipes.total_available}</span>
            <span className="metric-label">Total Recipes</span>
            <span className="metric-sub">{recipes.user_created} custom, {recipes.favorite_count} favorites</span>
          </div>
        </div>

        <div className="metric-box clickable" onClick={() => onNavigateTab("shopping")}>
          <div className="metric-icon">🛒</div>
          <div className="metric-info">
            <span className="metric-val">{shopping.pending_items}</span>
            <span className="metric-label">Items to Buy</span>
            <span className="metric-sub">{shopping.completion_percentage}% list completion</span>
          </div>
        </div>

        <div className="metric-box clickable" onClick={() => onNavigateTab("mealplans")}>
          <div className="metric-icon">📅</div>
          <div className="metric-info">
            <span className="metric-val">{meal_planning.upcoming_meals}</span>
            <span className="metric-label">Upcoming Meals</span>
            <span className="metric-sub">{meal_planning.total_planned_meals} planned total</span>
          </div>
        </div>

        <div className="metric-box clickable" onClick={() => onNavigateTab("history")}>
          <div className="metric-icon">👨‍🍳</div>
          <div className="metric-info">
            <span className="metric-val">{cooking.total_history_records}</span>
            <span className="metric-label">Meals Cooked</span>
            <span className="metric-sub">{cooking.total_servings_made} portions served</span>
          </div>
        </div>

        <div className="metric-box clickable" onClick={() => onNavigateTab("waste")}>
          <div className="metric-icon">♻️</div>
          <div className="metric-info">
            <span className="metric-val">{food_waste.total_records}</span>
            <span className="metric-label">Waste Incidents</span>
            <span className="metric-sub">{food_waste.waste_by_unit?.length || 0} unit types</span>
          </div>
        </div>
      </div>

      {/* ── 2. Two-Column Dashboard Widgets ─────────────────────────────────── */}
      <div className="dashboard-widgets-grid">
        {/* Pantry Shelf-life Health */}
        <div className="dash-widget">
          <div className="dash-widget-header">
            <h4>🥫 Pantry Health &amp; Shelf-Life</h4>
            <button className="link-btn" onClick={() => onNavigateTab("pantry")}>
              View All &rarr;
            </button>
          </div>
          <div className="dash-pantry-bars">
            <div className="stat-pill-row">
              <span>Fresh &amp; Active Items</span>
              <strong className="text-success">{pantry.active_items}</strong>
            </div>
            <div className="stat-pill-row">
              <span>Expiring Soon (&le; 7 days)</span>
              <strong className="text-warning">{pantry.expiring_soon_items}</strong>
            </div>
            <div className="stat-pill-row">
              <span>Expired Items</span>
              <strong className="text-danger">{pantry.expired_items}</strong>
            </div>
            <div className="stat-pill-row">
              <span>Distinct Ingredients Stocked</span>
              <strong>{pantry.distinct_ingredients}</strong>
            </div>
          </div>
          {pantry.expiring_soon_items > 0 && (
            <div className="widget-alert warning">
              ⚠️ You have {pantry.expiring_soon_items} item(s) expiring within the week! Check recommendations to use them up.
            </div>
          )}
        </div>

        {/* Shopping List Progress */}
        <div className="dash-widget">
          <div className="dash-widget-header">
            <h4>🛒 Grocery Shopping Progress</h4>
            <button className="link-btn" onClick={() => onNavigateTab("shopping")}>
              Go to Lists &rarr;
            </button>
          </div>
          <div className="dash-progress-box">
            <div className="progress-labels">
              <span>Overall List Completion</span>
              <strong>{shopping.completion_percentage}%</strong>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill fill-complete"
                style={{ width: `${shopping.completion_percentage}%` }}
              ></div>
            </div>
            <div className="stat-pill-row">
              <span>Total Shopping Lists</span>
              <strong>{shopping.total_lists}</strong>
            </div>
            <div className="stat-pill-row">
              <span>Purchased Items</span>
              <strong className="text-success">{shopping.purchased_items}</strong>
            </div>
            <div className="stat-pill-row">
              <span>Pending Items</span>
              <strong className="text-warning">{shopping.pending_items}</strong>
            </div>
          </div>
        </div>

        {/* Recent Cooking Activity */}
        <div className="dash-widget">
          <div className="dash-widget-header">
            <h4>🍳 Recent Cooking Activity</h4>
            <button className="link-btn" onClick={() => onNavigateTab("history")}>
              Full Journal &rarr;
            </button>
          </div>
          {cooking.recent_cooked?.length === 0 ? (
            <p className="muted-text">No meals cooked yet. Start cooking from recipes!</p>
          ) : (
            <div className="dash-recent-list">
              {cooking.recent_cooked?.map((item) => (
                <div key={item.history_id} className="recent-cook-item">
                  <div>
                    <strong>{item.recipe_name}</strong>
                    <span className="recent-cook-meta">
                      {new Date(item.cooked_at).toLocaleDateString()} &bull; {item.servings_made} servings
                    </span>
                  </div>
                  {item.category_name && <span className="category-pill">{item.category_name}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Food Waste Breakdown */}
        <div className="dash-widget">
          <div className="dash-widget-header">
            <h4>♻️ Food Waste Breakdown</h4>
            <button className="link-btn" onClick={() => onNavigateTab("waste")}>
              Waste Logs &rarr;
            </button>
          </div>
          {food_waste.total_records === 0 ? (
            <p className="muted-text text-success">Zero waste recorded! Kitchen is running efficiently.</p>
          ) : (
            <div>
              <span className="widget-section-sub">Waste Grouped by Measurement Unit:</span>
              <div className="unit-tags-container" style={{ margin: "8px 0 16px 0" }}>
                {food_waste.waste_by_unit?.map((u) => (
                  <span key={u.unit} className="unit-stat-pill">
                    {u.total_quantity} {u.unit} ({u.count}x)
                  </span>
                ))}
              </div>

              <span className="widget-section-sub">Most Common Waste Reasons:</span>
              <div className="reasons-stat-list" style={{ marginTop: "6px" }}>
                {food_waste.waste_by_reason?.map((r) => (
                  <div key={r.reason} className="reason-row">
                    <span>{r.reason}</span>
                    <span className="count-pill">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
