import React, { useState, useEffect } from "react";
import { mealPlanAPI, recipeAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ClockIcon,
  UserIcon,
  CloseIcon,
  RecipesIcon,
} from "../components/Icons";

export default function MealPlanPage({ onOpenAuth }) {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [allRecipes, setAllRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Plan Modal
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [planName, setPlanName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Add Planned Meal Modal
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [recipeId, setRecipeId] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [mealType, setMealType] = useState("DINNER");
  const [plannedServings, setPlannedServings] = useState(2);
  const [addMealError, setAddMealError] = useState("");

  const loadPlans = async (selectId = null) => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await mealPlanAPI.getAll();
      const planData = res.data?.data?.plans || [];
      setPlans(planData);

      const targetId = selectId || activePlanId || (planData.length > 0 ? planData[0].meal_plan_id : null);
      if (targetId) {
        setActivePlanId(targetId);
        loadPlanDetail(targetId);
      } else {
        setActivePlan(null);
      }
    } catch (err) {
      console.error("Failed to load meal plans:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanDetail = async (id) => {
    try {
      const res = await mealPlanAPI.getById(id);
      setActivePlan(res.data?.data?.plan || null);
    } catch (err) {
      console.error("Failed to load plan detail:", err);
    }
  };

  useEffect(() => {
    loadPlans();
    if (user) {
      recipeAPI.getAll({ limit: 100 }).then((r) => {
        setAllRecipes(r.data?.data?.recipes || []);
      });
    }
  }, [user]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!planName || !startDate || !endDate) return;
    try {
      const res = await mealPlanAPI.create({
        plan_name: planName,
        start_date: startDate,
        end_date: endDate,
      });
      setShowNewPlanModal(false);
      setPlanName("");
      setStartDate("");
      setEndDate("");
      loadPlans(res.data?.data?.plan?.meal_plan_id);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create meal plan");
    }
  };

  const handleDeletePlan = async () => {
    if (!activePlanId || !window.confirm("Delete this meal plan and all its scheduled meals?")) return;
    try {
      await mealPlanAPI.delete(activePlanId);
      loadPlans();
    } catch (err) {
      alert("Failed to delete meal plan");
    }
  };

  const handleAddMeal = async (e) => {
    e.preventDefault();
    setAddMealError("");
    try {
      await mealPlanAPI.addItem(activePlanId, {
        recipe_id: Number(recipeId),
        planned_date: plannedDate,
        meal_type: mealType,
        planned_servings: Number(plannedServings),
      });
      setShowAddMealModal(false);
      setRecipeId("");
      setPlannedDate("");
      loadPlanDetail(activePlanId);
    } catch (err) {
      setAddMealError(err.response?.data?.message || "Failed to add meal to plan");
    }
  };

  const handleToggleMealStatus = async (itemId, currentStatus) => {
    const nextStatus = currentStatus === "COOKED" ? "PLANNED" : "COOKED";
    try {
      await mealPlanAPI.updateItem(activePlanId, itemId, { status: nextStatus });
      loadPlanDetail(activePlanId);
    } catch (err) {
      alert("Failed to update meal status");
    }
  };

  const handleDeleteMealItem = async (itemId) => {
    try {
      await mealPlanAPI.deleteItem(activePlanId, itemId);
      loadPlanDetail(activePlanId);
    } catch (err) {
      alert("Failed to remove planned meal");
    }
  };

  if (!user) {
    return (
      <div className="auth-prompt-card">
        <div className="auth-prompt-icon-wrap">
          <CalendarIcon size={36} />
        </div>
        <h2>Meal Planning</h2>
        <p>Sign in to plan your weekly meals, organize your schedule, and cook stress-free!</p>
        <button className="primary-btn" onClick={onOpenAuth}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="mealplan-page">
      <div className="page-header">
        <div>
          <div className="header-badge">Schedule</div>
          <h2>Meal Planning</h2>
          <p className="subtitle">Schedule healthy, homemade meals across your week to streamline prep and shopping.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowNewPlanModal(true)}>
          <PlusIcon size={16} />
          <span>New Meal Plan</span>
        </button>
      </div>

      {/* Plan Selection Tabs */}
      <div className="list-tabs-container">
        {plans.map((p) => (
          <button
            key={p.meal_plan_id}
            className={`list-tab-btn ${activePlanId === p.meal_plan_id ? "active" : ""}`}
            onClick={() => {
              setActivePlanId(p.meal_plan_id);
              loadPlanDetail(p.meal_plan_id);
            }}
          >
            <span className="tab-title">{p.plan_name}</span>
            <span className="tab-count-badge">
              {p.total_meals} meals
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">Loading your meal plans...</div>
      ) : !activePlan ? (
        <div className="empty-state">
          <CalendarIcon size={40} className="empty-state-icon" />
          <h3>No meal plans created yet</h3>
          <p>Create a weekly meal plan to organize your breakfast, lunch, and dinner routine.</p>
          <button className="primary-btn mt-3" onClick={() => setShowNewPlanModal(true)}>
            Create First Meal Plan
          </button>
        </div>
      ) : (
        <div className="active-plan-card">
          <div className="plan-header-row">
            <div>
              <h3 className="active-plan-name">{activePlan.plan_name}</h3>
              <span className="plan-date-range">
                <ClockIcon size={13} /> {activePlan.start_date.split("T")[0]} to {activePlan.end_date.split("T")[0]} &bull;{" "}
                {activePlan.total_meals} scheduled meal(s)
              </span>
            </div>
            <div className="card-header-btns">
              <button
                className="secondary-btn"
                onClick={() => {
                  setPlannedDate(activePlan.start_date.split("T")[0]);
                  setShowAddMealModal(true);
                }}
              >
                <PlusIcon size={14} />
                <span>Schedule Meal</span>
              </button>
              <button className="danger-btn" onClick={handleDeletePlan}>
                <TrashIcon size={14} />
                <span>Delete Plan</span>
              </button>
            </div>
          </div>

          {activePlan.items?.length === 0 ? (
            <div className="empty-state inner">
              <p>No meals scheduled in this plan yet.</p>
              <button
                className="secondary-btn mt-2"
                onClick={() => {
                  setPlannedDate(activePlan.start_date.split("T")[0]);
                  setShowAddMealModal(true);
                }}
              >
                Schedule your first dish
              </button>
            </div>
          ) : (
            <div className="planned-meals-grid">
              {activePlan.items?.map((item) => (
                <div key={item.meal_item_id} className={`planned-meal-card ${item.status.toLowerCase()}`}>
                  <div className="meal-card-top">
                    <span className="meal-type-pill">{item.meal_type}</span>
                    <span className="meal-date-tag">
                      <ClockIcon size={12} /> {item.planned_date.split("T")[0]}
                    </span>
                  </div>

                  <h4 className="meal-recipe-title">{item.recipe_name}</h4>
                  <div className="meal-servings">
                    <UserIcon size={13} />
                    <span>{item.planned_servings} planned servings</span>
                  </div>

                  <div className="meal-card-bottom">
                    <button
                      className={`status-toggle-btn ${item.status === "COOKED" ? "is-cooked" : ""}`}
                      onClick={() => handleToggleMealStatus(item.meal_item_id, item.status)}
                    >
                      {item.status === "COOKED" ? (
                        <>
                          <CheckIcon size={13} /> Cooked
                        </>
                      ) : (
                        <>
                          <ClockIcon size={13} /> Planned
                        </>
                      )}
                    </button>
                    <button
                      className="action-icon-btn danger"
                      onClick={() => handleDeleteMealItem(item.meal_item_id)}
                      title="Remove meal from schedule"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Plan Modal */}
      {showNewPlanModal && (
        <div className="modal-backdrop" onClick={() => setShowNewPlanModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Meal Plan</h3>
              <button className="close-btn" onClick={() => setShowNewPlanModal(false)} aria-label="Close modal">
                <CloseIcon size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="modal-form">
              <div className="form-group">
                <label>Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Healthy Week, Low Carb Prep"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="text-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-input"
                  />
                </div>
                <div className="form-group flex-1">
                  <label>End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-input"
                  />
                </div>
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowNewPlanModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Planned Meal Modal */}
      {showAddMealModal && (
        <div className="modal-backdrop" onClick={() => setShowAddMealModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Schedule a Meal</h3>
              <button className="close-btn" onClick={() => setShowAddMealModal(false)} aria-label="Close modal">
                <CloseIcon size={20} />
              </button>
            </div>

            {addMealError && <div className="alert-error">{addMealError}</div>}

            <form onSubmit={handleAddMeal} className="modal-form">
              <div className="form-group">
                <label>Select Recipe</label>
                <select
                  required
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                  className="select-input"
                >
                  <option value="">-- Choose a Recipe --</option>
                  {allRecipes.map((r) => (
                    <option key={r.recipe_id} value={r.recipe_id}>
                      {r.recipe_name} ({r.category?.category_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Planned Date</label>
                  <input
                    type="date"
                    required
                    value={plannedDate}
                    onChange={(e) => setPlannedDate(e.target.value)}
                    className="text-input"
                  />
                </div>

                <div className="form-group flex-1">
                  <label>Meal Type</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="select-input"
                  >
                    <option value="BREAKFAST">Breakfast</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="DINNER">Dinner</option>
                    <option value="SNACK">Snack</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Planned Servings</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={plannedServings}
                  onChange={(e) => setPlannedServings(e.target.value)}
                  className="text-input"
                />
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowAddMealModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Schedule Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
