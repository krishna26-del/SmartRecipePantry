import React, { useState, useEffect } from "react";
import { shoppingListAPI, recipeAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function ShoppingListPage({ onOpenAuth }) {
  const { user } = useAuth();
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [activeList, setActiveList] = useState(null);
  const [loading, setLoading] = useState(true);

  // New list form
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Add item form
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g");
  const [ingredients, setIngredients] = useState([]);

  // Generate from recipe modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [allRecipes, setAllRecipes] = useState([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");

  const loadLists = async (selectId = null) => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await shoppingListAPI.getAll();
      const listData = res.data?.data?.lists || [];
      setLists(listData);

      const targetId = selectId || activeListId || (listData.length > 0 ? listData[0].list_id : null);
      if (targetId) {
        setActiveListId(targetId);
        loadListDetail(targetId);
      } else {
        setActiveList(null);
      }
    } catch (err) {
      console.error("Failed to load shopping lists:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadListDetail = async (id) => {
    try {
      const res = await shoppingListAPI.getById(id);
      setActiveList(res.data?.data?.list || null);
    } catch (err) {
      console.error("Failed to load list details:", err);
    }
  };

  useEffect(() => {
    loadLists();
    if (user) {
      recipeAPI.getIngredients({ limit: 100 }).then((r) => {
        setIngredients(r.data?.data?.ingredients || []);
      });
      recipeAPI.getAll({ limit: 50 }).then((r) => {
        setAllRecipes(r.data?.data?.recipes || []);
      });
    }
  }, [user]);

  const handleSelectTab = (id) => {
    setActiveListId(id);
    loadListDetail(id);
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      const res = await shoppingListAPI.create({ list_name: newListName.trim() });
      const createdId = res.data?.data?.list?.list_id;
      setNewListName("");
      setShowNewListModal(false);
      loadLists(createdId);
    } catch (err) {
      alert("Failed to create shopping list");
    }
  };

  const handleDeleteList = async () => {
    if (!activeListId || !window.confirm("Are you sure you want to delete this shopping list?")) return;
    try {
      await shoppingListAPI.delete(activeListId);
      loadLists();
    } catch (err) {
      alert("Failed to delete shopping list");
    }
  };

  const handleTogglePurchased = async (itemId, currentStatus) => {
    try {
      await shoppingListAPI.togglePurchase(activeListId, itemId, !currentStatus);
      loadListDetail(activeListId);
    } catch (err) {
      alert("Failed to update purchased status");
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await shoppingListAPI.addItem(activeListId, {
        ingredient_id: Number(ingredientId),
        quantity: Number(quantity),
        unit,
      });
      setShowAddItemModal(false);
      setIngredientId("");
      setQuantity("");
      loadListDetail(activeListId);
    } catch (err) {
      alert("Failed to add item to shopping list");
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await shoppingListAPI.deleteItem(activeListId, itemId);
      loadListDetail(activeListId);
    } catch (err) {
      alert("Failed to delete item");
    }
  };

  const handleGenerateFromRecipe = async (e) => {
    e.preventDefault();
    if (!selectedRecipeId || !activeListId) return;
    try {
      const res = await shoppingListAPI.generateFromRecipe(activeListId, selectedRecipeId);
      alert(res.data?.message || "Missing ingredients calculated and added!");
      setShowGenModal(false);
      setSelectedRecipeId("");
      loadListDetail(activeListId);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate missing ingredients");
    }
  };

  if (!user) {
    return (
      <div className="auth-prompt-card">
        <h2>🛒 Shopping Lists</h2>
        <p>Sign in to organize your grocery shopping and automatically calculate missing items for recipes!</p>
        <button className="primary-btn" onClick={onOpenAuth}>
          Sign In for Shopping Lists
        </button>
      </div>
    );
  }

  return (
    <div className="shopping-page">
      <div className="page-header">
        <div>
          <h2>🛒 Shopping Lists</h2>
          <p className="subtitle">Manage items to buy, check off purchases, or auto-generate from recipes.</p>
        </div>
        <div className="header-actions">
          <button className="secondary-btn" onClick={() => setShowGenModal(true)} disabled={!activeListId}>
            ✨ Add From Recipe
          </button>
          <button className="primary-btn" onClick={() => setShowNewListModal(true)}>
            + New List
          </button>
        </div>
      </div>

      {/* Shopping List Tab Pills */}
      <div className="list-tabs-container">
        {lists.map((l) => (
          <button
            key={l.list_id}
            className={`list-tab-btn ${activeListId === l.list_id ? "active" : ""}`}
            onClick={() => handleSelectTab(l.list_id)}
          >
            <span className="tab-title">{l.list_name}</span>
            <span className="tab-count">
              {l.purchased_items}/{l.total_items}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">Loading shopping lists...</div>
      ) : !activeList ? (
        <div className="empty-state">
          <p>You have no shopping lists yet.</p>
          <button className="primary-btn" onClick={() => setShowNewListModal(true)}>
            Create your first list
          </button>
        </div>
      ) : (
        <div className="active-list-card">
          <div className="list-card-header">
            <div>
              <h3>{activeList.list_name}</h3>
              <span className="list-sub">
                {activeList.purchased_items} of {activeList.total_items} items purchased
              </span>
            </div>
            <div className="card-header-btns">
              <button className="secondary-btn" onClick={() => setShowAddItemModal(true)}>
                + Add Item
              </button>
              <button className="danger-btn" onClick={handleDeleteList}>
                Delete List
              </button>
            </div>
          </div>

          {activeList.items?.length === 0 ? (
            <div className="empty-state">
              <p>This list is currently empty.</p>
              <button className="secondary-btn" onClick={() => setShowAddItemModal(true)}>
                Add an ingredient manually
              </button>
            </div>
          ) : (
            <div className="shopping-items-list">
              {activeList.items?.map((item) => (
                <div
                  key={item.list_item_id}
                  className={`shopping-item-row ${item.is_purchased ? "purchased" : ""}`}
                >
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={item.is_purchased}
                      onChange={() => handleTogglePurchased(item.list_item_id, item.is_purchased)}
                    />
                    <span className="checkmark"></span>
                    <span className="item-name">{item.ingredient_name}</span>
                  </label>

                  <div className="item-meta">
                    <span className="item-qty">
                      {item.quantity} {item.unit}
                    </span>
                    {item.added_from_recipe_name && (
                      <span className="source-tag">From: {item.added_from_recipe_name}</span>
                    )}
                    <button
                      className="delete-icon-btn"
                      onClick={() => handleDeleteItem(item.list_item_id)}
                      title="Remove from list"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New List Modal */}
      {showNewListModal && (
        <div className="modal-backdrop" onClick={() => setShowNewListModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Shopping List</h3>
              <button className="close-btn" onClick={() => setShowNewListModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateList} className="modal-form">
              <div className="form-group">
                <label>List Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Barbecue, Weekly Groceries"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
              </div>
              <button type="submit" className="submit-btn">
                Create List
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="modal-backdrop" onClick={() => setShowAddItemModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Item to List</h3>
              <button className="close-btn" onClick={() => setShowAddItemModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddItem} className="modal-form">
              <div className="form-group">
                <label>Ingredient</label>
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

              <button type="submit" className="submit-btn">
                Add to List
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Generate From Recipe Modal */}
      {showGenModal && (
        <div className="modal-backdrop" onClick={() => setShowGenModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Missing Ingredients from Recipe</h3>
              <button className="close-btn" onClick={() => setShowGenModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleGenerateFromRecipe} className="modal-form">
              <p className="modal-info">
                We'll compare this recipe's ingredients with your current pantry inventory and automatically add only what you lack.
              </p>
              <div className="form-group">
                <label>Select Recipe</label>
                <select
                  required
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                >
                  <option value="">-- Choose Recipe --</option>
                  {allRecipes.map((r) => (
                    <option key={r.recipe_id} value={r.recipe_id}>
                      {r.recipe_name} ({r.category?.category_name || "General"})
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="submit-btn">
                Calculate &amp; Add Missing Items
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
