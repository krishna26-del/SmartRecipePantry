import React, { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import DashboardPage from "./pages/DashboardPage";
import RecipesPage from "./pages/RecipesPage";
import PantryPage from "./pages/PantryPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import ShoppingListPage from "./pages/ShoppingListPage";
import FavoritesPage from "./pages/FavoritesPage";
import MealPlanPage from "./pages/MealPlanPage";
import CookingHistoryPage from "./pages/CookingHistoryPage";
import FoodWastePage from "./pages/FoodWastePage";
import "./App.css";

function AppContent() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = useState(null);

  const handleSelectRecipeFromFavorites = (recipe) => {
    setSelectedRecipeForDetail(recipe);
    setActiveTab("recipes");
  };

  return (
    <div className="app-layout">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <main className="main-content">
        {activeTab === "dashboard" && (
          <DashboardPage
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === "recipes" && (
          <RecipesPage
            onOpenAuth={() => setAuthModalOpen(true)}
            initialSelectedRecipe={selectedRecipeForDetail}
          />
        )}
        {activeTab === "pantry" && (
          <PantryPage onOpenAuth={() => setAuthModalOpen(true)} />
        )}
        {activeTab === "recommendations" && (
          <RecommendationsPage
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateToShopping={() => setActiveTab("shopping")}
          />
        )}
        {activeTab === "shopping" && (
          <ShoppingListPage onOpenAuth={() => setAuthModalOpen(true)} />
        )}
        {activeTab === "favorites" && (
          <FavoritesPage
            onOpenAuth={() => setAuthModalOpen(true)}
            onSelectRecipe={handleSelectRecipeFromFavorites}
          />
        )}
        {activeTab === "mealplans" && (
          <MealPlanPage onOpenAuth={() => setAuthModalOpen(true)} />
        )}
        {activeTab === "history" && (
          <CookingHistoryPage onOpenAuth={() => setAuthModalOpen(true)} />
        )}
        {activeTab === "waste" && (
          <FoodWastePage onOpenAuth={() => setAuthModalOpen(true)} />
        )}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <footer className="app-footer">
        <p>Smart Recipe Pantry &copy; {new Date().getFullYear()} &bull; Cook smarter, waste less.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
