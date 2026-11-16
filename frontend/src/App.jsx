import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
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
import AnalyticsPage from "./pages/AnalyticsPage";
import { MenuIcon, LogInIcon } from "./components/Icons";
import "./App.css";

function AppContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSelectRecipeFromFavorites = (recipe) => {
    setSelectedRecipeForDetail(recipe);
    setActiveTab("recipes");
  };

  return (
    <div className="rms-app-container">
      {/* ── Mobile Top Bar (Only visible on screens <= 1024px) ─────────── */}
      <header className="rms-mobile-header">
        <button
          className="mobile-hamburger-btn"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open Navigation Menu"
        >
          <MenuIcon size={22} />
        </button>

        <div className="mobile-brand-title" onClick={() => setActiveTab("dashboard")}>
          <span className="brand-dot" />
          <span className="brand-text">Recipe Management System</span>
        </div>

        <div className="mobile-header-actions">
          {user ? (
            <div className="mobile-user-avatar" title={user.name}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <button
              className="mobile-auth-btn"
              onClick={() => setAuthModalOpen(true)}
              aria-label="Sign In"
            >
              <LogInIcon size={18} />
            </button>
          )}
        </div>
      </header>

      {/* ── Left Sidebar Navigation ────────────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setAuthModalOpen(true)}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* ── Main Viewport Content ──────────────────────────────────────── */}
      <div className="rms-main-wrapper">
        <main className="rms-main-content">
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
          {activeTab === "analytics" && (
            <AnalyticsPage
              onOpenAuth={() => setAuthModalOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}
        </main>

        <footer className="rms-footer">
          <div className="footer-inner">
            <span className="footer-title">Recipe Management System</span>
            <span className="footer-divider">&bull;</span>
            <span className="footer-tagline">Professional Kitchen Inventory, Meal Planning & Recipe Engine</span>
            <span className="footer-divider">&bull;</span>
            <span className="footer-copy">&copy; {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
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
