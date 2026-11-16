import React, { useState, useEffect } from "react";
import { analyticsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  AnalyticsIcon,
  RefreshIcon,
  RecipesIcon,
  PantryIcon,
  ShoppingCartIcon,
  CalendarIcon,
  HistoryIcon,
  TrashIcon,
} from "../components/Icons";

export default function AnalyticsPage({ onOpenAuth, onNavigateTab }) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState("overview"); // overview, cooking, waste, pantry, recipes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pantryData, setPantryData] = useState(null);
  const [recipeData, setRecipeData] = useState(null);
  const [cookingData, setCookingData] = useState(null);
  const [wasteData, setWasteData] = useState(null);
  const [shoppingData, setShoppingData] = useState(null);
  const [mealPlanData, setMealPlanData] = useState(null);

  const loadAllAnalytics = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [pRes, rRes, cRes, wRes, sRes, mRes] = await Promise.all([
        analyticsAPI.getPantry().catch(() => null),
        analyticsAPI.getRecipes().catch(() => null),
        analyticsAPI.getCooking().catch(() => null),
        analyticsAPI.getFoodWaste().catch(() => null),
        analyticsAPI.getShopping().catch(() => null),
        analyticsAPI.getMealPlanning().catch(() => null),
      ]);

      setPantryData(pRes?.data?.data || null);
      setRecipeData(rRes?.data?.data || null);
      setCookingData(cRes?.data?.data || null);
      setWasteData(wRes?.data?.data || null);
      setShoppingData(sRes?.data?.data || null);
      setMealPlanData(mRes?.data?.data || null);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError("Failed to retrieve in-depth analytical data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [user]);

  if (!user) {
    return (
      <div className="auth-prompt-card">
        <div className="auth-prompt-icon-wrap">
          <AnalyticsIcon size={36} />
        </div>
        <h2>Kitchen Analytics Engine</h2>
        <p>Sign in to unlock personalized reports on your cooking habits, grocery efficiency, and food waste reduction.</p>
        <button className="primary-btn" onClick={onOpenAuth}>
          Sign In to Access Analytics
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-state">Generating analytical reports...</div>;
  }

  return (
    <div className="analytics-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="header-badge">Performance & Trends</div>
          <h2>Kitchen Analytics</h2>
          <p className="subtitle">
            Comprehensive data insights into pantry utilization, meal prep frequency, and food waste reduction.
          </p>
        </div>
        <button className="secondary-btn" onClick={loadAllAnalytics}>
          <RefreshIcon size={16} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Sub Tabs */}
      <div className="analytics-tabs-bar">
        <button
          className={`tab-pill ${activeSubTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveSubTab("overview")}
        >
          System Overview
        </button>
        <button
          className={`tab-pill ${activeSubTab === "cooking" ? "active" : ""}`}
          onClick={() => setActiveSubTab("cooking")}
        >
          Cooking Frequency
        </button>
        <button
          className={`tab-pill ${activeSubTab === "waste" ? "active" : ""}`}
          onClick={() => setActiveSubTab("waste")}
        >
          Food Waste Analysis
        </button>
        <button
          className={`tab-pill ${activeSubTab === "pantry" ? "active" : ""}`}
          onClick={() => setActiveSubTab("pantry")}
        >
          Pantry & Recipes
        </button>
      </div>

      {/* ── Sub Tab 1: Overview ────────────────────────────────────────────── */}
      {activeSubTab === "overview" && (
        <div className="analytics-section">
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Cooking Activity (30 Days)</span>
              <span className="kpi-value">{cookingData?.count_last_30_days || 0}</span>
              <span className="kpi-sub">{cookingData?.total_servings_made || 0} total servings prepared</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Shopping Completion Rate</span>
              <span className="kpi-value">{shoppingData?.completion_percentage || 0}%</span>
              <span className="kpi-sub">
                {shoppingData?.purchased_items || 0} of {shoppingData?.total_items || 0} items purchased
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Active Pantry Items</span>
              <span className="kpi-value">{pantryData?.active_items || 0}</span>
              <span className="kpi-sub">{pantryData?.expiring_soon_items || 0} expiring within 7 days</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Food Waste Logs</span>
              <span className="kpi-value">{wasteData?.total_records || 0}</span>
              <span className="kpi-sub">{wasteData?.most_wasted_ingredients?.length || 0} unique ingredients</span>
            </div>
          </div>

          <div className="analytics-cards-grid">
            {/* Quick Cooking Snapshot */}
            <div className="surface-card">
              <div className="card-head">
                <div className="card-title-group">
                  <HistoryIcon size={18} />
                  <h3>Recent Cooking Sessions</h3>
                </div>
                {onNavigateTab && (
                  <button className="text-link-btn" onClick={() => onNavigateTab("history")}>
                    View History &rarr;
                  </button>
                )}
              </div>
              {cookingData?.recently_cooked?.length > 0 ? (
                <div className="data-table-wrap">
                  <table className="clean-table">
                    <thead>
                      <tr>
                        <th>Recipe</th>
                        <th>Servings</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cookingData.recently_cooked.slice(0, 5).map((c, i) => (
                        <tr key={c.history_id || i}>
                          <td className="font-medium">{c.recipe_name}</td>
                          <td>{c.servings_made}</td>
                          <td className="text-muted">{new Date(c.cooked_at || c.cooked_date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-subtext">No cooking records logged yet.</p>
              )}
            </div>

            {/* Meal Planning Adherence */}
            <div className="surface-card">
              <div className="card-head">
                <div className="card-title-group">
                  <CalendarIcon size={18} />
                  <h3>Scheduled Meals by Status</h3>
                </div>
                {onNavigateTab && (
                  <button className="text-link-btn" onClick={() => onNavigateTab("mealplans")}>
                    Manage Plans &rarr;
                  </button>
                )}
              </div>
              {mealPlanData?.meals_by_status?.length > 0 ? (
                <div className="bar-list">
                  {mealPlanData.meals_by_status.map((item, idx) => {
                    const total = mealPlanData.total_planned_meals || 1;
                    const pct = Math.round((Number(item.count) / total) * 100);
                    return (
                      <div key={idx} className="bar-item">
                        <div className="bar-label-row">
                          <span className="bar-title">{item.status}</span>
                          <span className="bar-count">
                            {item.count} ({pct}%)
                          </span>
                        </div>
                        <div className="bar-track">
                          <div
                            className={`bar-fill status-${item.status.toLowerCase()}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-subtext">No planned meals recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub Tab 2: Cooking Frequency ───────────────────────────────────── */}
      {activeSubTab === "cooking" && (
        <div className="analytics-section">
          <div className="analytics-cards-grid">
            <div className="surface-card">
              <div className="card-head">
                <h3>Most Cooked Recipes</h3>
              </div>
              {cookingData?.most_frequently_cooked?.length > 0 ? (
                <div className="data-table-wrap">
                  <table className="clean-table">
                    <thead>
                      <tr>
                        <th>Recipe</th>
                        <th>Times Cooked</th>
                        <th>Total Servings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cookingData.most_frequently_cooked.map((item, idx) => (
                        <tr key={idx}>
                          <td className="font-medium">{item.recipe_name}</td>
                          <td>
                            <span className="badge-pill primary">{item.cook_count}x</span>
                          </td>
                          <td>{item.total_servings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-subtext">No frequently cooked recipes recorded.</p>
              )}
            </div>

            <div className="surface-card">
              <div className="card-head">
                <h3>Cooking Cadence</h3>
              </div>
              <div className="stats-breakdown-list">
                <div className="stat-row">
                  <span>Last 7 Days</span>
                  <strong>{cookingData?.count_last_7_days || 0} meals</strong>
                </div>
                <div className="stat-row">
                  <span>Last 30 Days</span>
                  <strong>{cookingData?.count_last_30_days || 0} meals</strong>
                </div>
                <div className="stat-row">
                  <span>All-Time Logged Meals</span>
                  <strong>{cookingData?.total_cooking_records || 0}</strong>
                </div>
                <div className="stat-row">
                  <span>Distinct Recipes Prepared</span>
                  <strong>{cookingData?.distinct_recipes_cooked || 0}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub Tab 3: Food Waste Analysis ─────────────────────────────────── */}
      {activeSubTab === "waste" && (
        <div className="analytics-section">
          <div className="analytics-cards-grid">
            <div className="surface-card">
              <div className="card-head">
                <div className="card-title-group">
                  <TrashIcon size={18} />
                  <h3>Discarded Quantities by Unit</h3>
                </div>
              </div>
              <p className="hint-text">
                Quantities are separated strictly by measurement unit to ensure scientific accuracy.
              </p>
              {wasteData?.quantities_by_unit?.length > 0 ? (
                <div className="unit-cards-grid">
                  {wasteData.quantities_by_unit.map((u, i) => (
                    <div key={i} className="unit-card">
                      <span className="unit-number">{Number(u.total_quantity).toFixed(1)}</span>
                      <span className="unit-name">{u.unit}</span>
                      <span className="unit-sub">{u.event_count} discard incident(s)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-subtext">Zero food waste recorded! Great job maintaining freshness.</p>
              )}
            </div>

            <div className="surface-card">
              <div className="card-head">
                <h3>Disposal Reasons Breakdown</h3>
              </div>
              {wasteData?.waste_by_reason?.length > 0 ? (
                <div className="bar-list">
                  {wasteData.waste_by_reason.map((r, idx) => {
                    const total = wasteData.total_records || 1;
                    const pct = Math.round((Number(r.count) / total) * 100);
                    return (
                      <div key={idx} className="bar-item">
                        <div className="bar-label-row">
                          <span className="bar-title">{r.reason}</span>
                          <span className="bar-count">{r.count} events ({pct}%)</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill warning" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-subtext">No waste reasons logged.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub Tab 4: Pantry & Recipes ────────────────────────────────────── */}
      {activeSubTab === "pantry" && (
        <div className="analytics-section">
          <div className="analytics-cards-grid">
            <div className="surface-card">
              <div className="card-head">
                <div className="card-title-group">
                  <PantryIcon size={18} />
                  <h3>Pantry Category Distribution</h3>
                </div>
              </div>
              {pantryData?.category_distribution?.length > 0 ? (
                <div className="bar-list">
                  {pantryData.category_distribution.map((cat, idx) => {
                    const total = pantryData.total_items || 1;
                    const pct = Math.round((Number(cat.item_count) / total) * 100);
                    return (
                      <div key={idx} className="bar-item">
                        <div className="bar-label-row">
                          <span className="bar-title">{cat.category_name || "Uncategorized"}</span>
                          <span className="bar-count">{cat.item_count} items ({pct}%)</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-subtext">Pantry is currently empty.</p>
              )}
            </div>

            <div className="surface-card">
              <div className="card-head">
                <div className="card-title-group">
                  <RecipesIcon size={18} />
                  <h3>Recipe Complexity Breakdown</h3>
                </div>
              </div>
              {recipeData?.recipes_by_difficulty?.length > 0 ? (
                <div className="bar-list">
                  {recipeData.recipes_by_difficulty.map((d, idx) => {
                    const total = recipeData.total_available || 1;
                    const pct = Math.round((Number(d.count) / total) * 100);
                    return (
                      <div key={idx} className="bar-item">
                        <div className="bar-label-row">
                          <span className="bar-title">{d.difficulty}</span>
                          <span className="bar-count">{d.count} recipes ({pct}%)</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill secondary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-subtext">No recipes available to analyze.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
