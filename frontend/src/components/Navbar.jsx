import React from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ activeTab, setActiveTab, onOpenAuth }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "recipes", label: "Recipes", icon: "🍳" },
    { id: "pantry", label: "Pantry", icon: "🥫" },
    { id: "recommendations", label: "Recommendations", icon: "✨" },
    { id: "shopping", label: "Shopping Lists", icon: "🛒" },
    { id: "favorites", label: "Favorites", icon: "❤️" },
    { id: "mealplans", label: "Meal Planner", icon: "📅" },
    { id: "history", label: "Cooking History", icon: "📖" },
    { id: "waste", label: "Food Waste", icon: "♻️" },
  ];

  return (
    <header className="app-navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => setActiveTab("dashboard")}>
          <span className="brand-icon">🥗</span>
          <span className="brand-title">Smart Recipe Pantry</span>
        </div>

        <nav className="navbar-links">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="navbar-auth">
          {user ? (
            <div className="user-profile-badge">
              <span className="user-name">👤 {user.name}</span>
              <button className="logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={onOpenAuth}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
