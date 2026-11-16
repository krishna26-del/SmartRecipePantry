import React, { useState, useEffect } from "react";
import { analyticsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  DashboardIcon,
  PantryIcon,
  RecipesIcon,
  ShoppingCartIcon,
  CalendarIcon,
  HistoryIcon,
  TrashIcon,
  RefreshIcon,
  AlertCircleIcon,
  CheckIcon,
  AnalyticsIcon,
} from "../components/Icons";

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
        <div className="auth-prompt-icon-wrap">
          <DashboardIcon size={36} />
        </div>
        <h2>Kitchen Command Center</h2>
        <p>Sign in to access real-time inventory tracking, meal planning, and grocery management.</p>
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
          <div className="header-badge">Overview</div>
          <h2>Kitchen Command Center</h2>
          <p className="subtitle">Real-time statistics across all kitchen activities, inventory, and meal plans.</p>
        </div>
        <div className="page-header-actions">
          <button className="secondary-btn" onClick={() => onNavigateTab("analytics")}>
            <AnalyticsIcon size={16} />
            <span>Full Analytics</span>
          </button>
          <button className="secondary-btn" onClick={loadDashboard}>
            <RefreshIcon size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 1. Top Key Metric Cards ────────────────────────────────────────── */}
      <div className="dashboard-metrics-grid">
        <div className="metric-box clickable" onClick={() => onNavigateTab("pantry")}>
          <div className="metric-header">
            <span className="metric-title">Pantry Items</span>
            <div className="metric-icon-wrap">
              <PantryIcon size={20} />
            </div>
          </div>
          <div className="metric-info">
            <span className="metric-val">{pantry.total_items}</span>
            <span className="metric-sub">{pantry.active_items} fresh, {pantry.expiring_soon_items} expiring</span>
          </div>
        </div>

        <div className="metric-box clickable" onClick={() => onNavigateTab("recipes")}>
          <div className="metric-header">
            <span className="metric-title">Total Recipes</span>
            <div className="metric-icon-wrap">
              <RecipesIcon size={20} />
            </div>
          </div>
          <div className="metric-info">
            <span className="metric-val">{recipes.total_available}</span>
            <span className="metric-sub">{recipes.user_created} custom, {recipes.favorite_count} favorites</span>
          </div>
        </div>

        <div className="metric-box clickable" onClick={() => onNavigateTab("shopping")}>
          <div className="metric-header">
            <span className="metric-title">Items to Buy</span>
            <div className="metric-icon-wrap">
              <ShoppingCartIcon size={20} />
            </div>
          </div>
          <div className="metric-info">
            <span className="metric-val">{shopping.pending_items}</span>
            <span className="metric-sub">{shopping.completion_percentage}% list completion</span>
          </div>
        </div>

        <div className="metric-box clickable" onClick={() => onNavigateTab("mealplans")}>
          <div className="metric-header">
            <span className="metric-title">Upcoming Meals</span>
            <div className="metric-icon-wrap">
              <CalendarIcon size={20} />
            </div>
          </div>
          <div className="metric-info">
            <span className="metric-val">{meal_planning.upcoming_meals}</span>
            <span className="metric-sub">{meal_planning.total_planned_meals} planned total</span>
          </div>
        </div>

        <div className="metric-box clickable" onClick={() => onNavigateTab("history")}>
          <div className="metric-header">
            <span className="metric-title">Meals Cooked</span>
            <div className="metric-icon-wrap">
              <HistoryIcon size={20} />
            </div>
          </div>
          <div className="metric-info">
            <span className="metric-val">{cooking.total_history_records}</span>
            <span className="metric-sub">{cooking.total_servings_made} portions served</span>
          </div>
        </div>

        <div className="metric-box clickable" onClick={() => onNavigateTab("waste")}>
          <div className="metric-header">
            <span className="metric-title">Waste Records</span>
            <div className="metric-icon-wrap">
              <TrashIcon size={20} />
            </div>
          </div>
          <div className="metric-info">
            <span className="metric-val">{food_waste.total_records}</span>
            <span className="metric-sub">{food_waste.waste_by_unit?.length || 0} unit types</span>
          </div>
        </div>
      </div>

      {/* ── 2. Two-Column Dashboard Widgets ─────────────────────────────────── */}
      <div className="dash-widgets-grid">
        {/* Pantry Shelf-life Health */}
        <div className="dash-widget">
          <div className="card-head">
            <div className="card-title-group">
              <PantryIcon size={18} />
              <h3>Pantry Inventory & Shelf-Life</h3>
            </div>
            <button className="text-link-btn" onClick={() => onNavigateTab("pantry")}>
              View Pantry &rarr;
            </button>
          </div>
          <div className="widget-content">
            <div className="stat-pill-row">
              <div className="stat-pill success">
                <span className="pill-dot" />
                <span className="pill-label">{pantry.active_items} Fresh</span>
              </div>
              <div className="stat-pill warning">
                <span className="pill-dot" />
                <span className="pill-label">{pantry.expiring_soon_items} Expiring Soon</span>
              </div>
              <div className="stat-pill danger">
                <span className="pill-dot" />
                <span className="pill-label">{pantry.expired_items} Expired</span>
              </div>
            </div>

            {pantry.expiring_soon_items > 0 ? (
              <div className="alert-box-compact warning">
                <AlertCircleIcon size={18} />
                <span>
                  You have <strong>{pantry.expiring_soon_items} item(s)</strong> reaching expiry within the next 7 days.
                </span>
              </div>
            ) : (
              <div className="alert-box-compact success">
                <CheckIcon size={18} />
                <span>All tracked ingredients are currently within their recommended shelf life.</span>
              </div>
            )}
          </div>
        </div>

        {/* Shopping List Progress */}
        <div className="dash-widget">
          <div className="card-head">
            <div className="card-title-group">
              <ShoppingCartIcon size={18} />
              <h3>Shopping List Progress</h3>
            </div>
            <button className="text-link-btn" onClick={() => onNavigateTab("shopping")}>
              View Lists &rarr;
            </button>
          </div>
          <div className="widget-content">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${shopping.completion_percentage}%` }}
              />
            </div>
            <div className="progress-labels">
              <span>{shopping.purchased_items} of {shopping.total_items} items purchased</span>
              <strong className="text-forest">{shopping.completion_percentage}% Complete</strong>
            </div>

            <div className="stat-row mt-3">
              <span>Total Active Lists</span>
              <strong>{shopping.total_lists}</strong>
            </div>
            <div className="stat-row">
              <span>Items Pending Purchase</span>
              <strong className="text-forest">{shopping.pending_items}</strong>
            </div>
          </div>
        </div>

        {/* Recent Cooking Activity */}
        <div className="dash-widget">
          <div className="card-head">
            <div className="card-title-group">
              <HistoryIcon size={18} />
              <h3>Recent Cooking Logs</h3>
            </div>
            <button className="text-link-btn" onClick={() => onNavigateTab("history")}>
              Full Log &rarr;
            </button>
          </div>
          <div className="widget-content">
            {cooking.recent_cooked?.length > 0 ? (
              <div className="mini-activity-list">
                {cooking.recent_cooked.slice(0, 4).map((entry, idx) => (
                  <div key={idx} className="mini-activity-item">
                    <div className="activity-icon-bullet">
                      <RecipesIcon size={14} />
                    </div>
                    <div className="activity-details">
                      <span className="activity-name">{entry.recipe_name}</span>
                      <span className="activity-meta">
                        {entry.servings_made} servings &bull; {new Date(entry.cooked_at || entry.cooked_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-subtext">No cooking records logged yet.</p>
            )}
          </div>
        </div>

        {/* Food Waste Reduction Summary */}
        <div className="dash-widget">
          <div className="card-head">
            <div className="card-title-group">
              <TrashIcon size={18} />
              <h3>Food Waste by Unit</h3>
            </div>
            <button className="text-link-btn" onClick={() => onNavigateTab("waste")}>
              Waste Tracker &rarr;
            </button>
          </div>
          <div className="widget-content">
            {food_waste.waste_by_unit?.length > 0 ? (
              <div className="unit-cards-grid compact">
                {food_waste.waste_by_unit.map((item, idx) => (
                  <div key={idx} className="unit-card mini">
                    <span className="unit-number">{Number(item.total_quantity).toFixed(1)}</span>
                    <span className="unit-name">{item.unit}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert-box-compact success">
                <CheckIcon size={18} />
                <span>Zero waste logged! Outstanding kitchen resource management.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
