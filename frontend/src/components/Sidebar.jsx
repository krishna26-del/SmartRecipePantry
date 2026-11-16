import React from "react";
import { useAuth } from "../context/AuthContext";
import {
  DashboardIcon,
  RecipesIcon,
  PantryIcon,
  SparklesIcon,
  ShoppingCartIcon,
  HeartIcon,
  CalendarIcon,
  HistoryIcon,
  TrashIcon,
  AnalyticsIcon,
  UserIcon,
  LogOutIcon,
  LogInIcon,
  CloseIcon,
} from "./Icons";

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenAuth,
  isMobileOpen,
  setIsMobileOpen,
}) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: DashboardIcon },
    { id: "recipes", label: "Recipes", Icon: RecipesIcon },
    { id: "pantry", label: "Pantry", Icon: PantryIcon },
    { id: "recommendations", label: "Recommendations", Icon: SparklesIcon },
    { id: "shopping", label: "Shopping Lists", Icon: ShoppingCartIcon },
    { id: "favorites", label: "Favorites", Icon: HeartIcon },
    { id: "mealplans", label: "Meal Planning", Icon: CalendarIcon },
    { id: "history", label: "Cooking History", Icon: HistoryIcon },
    { id: "waste", label: "Food Waste", Icon: TrashIcon },
    { id: "analytics", label: "Analytics", Icon: AnalyticsIcon },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      <aside className={`app-sidebar ${isMobileOpen ? "open" : ""}`}>
        {/* Top: Branding */}
        <div className="sidebar-brand-container">
          <div className="sidebar-brand" onClick={() => handleNavClick("dashboard")}>
            <div className="brand-accent-mark" />
            <div className="brand-text-block">
              <span className="brand-title">Recipe Management</span>
              <span className="brand-subtitle">System</span>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            className="sidebar-close-btn"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Middle: Vertical Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">MAIN NAVIGATION</div>
          <ul className="nav-list">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const { Icon } = item;
              return (
                <li key={item.id} className="nav-item">
                  <button
                    className={`nav-link ${isActive ? "active" : ""}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <span className="nav-icon-wrap">
                      <Icon size={18} />
                    </span>
                    <span className="nav-label">{item.label}</span>
                    {isActive && <span className="active-indicator" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: User Profile / Auth */}
        <div className="sidebar-footer">
          {user ? (
            <div className="user-profile-section">
              <div className="user-avatar-circle">
                {getInitials(user.name)}
              </div>
              <div className="user-details">
                <span className="user-name" title={user.name}>{user.name}</span>
                <span className="user-role-badge">Online</span>
              </div>
              <button
                className="sidebar-logout-btn"
                onClick={() => {
                  logout();
                  if (setIsMobileOpen) setIsMobileOpen(false);
                }}
                title="Sign out of account"
              >
                <LogOutIcon size={18} />
              </button>
            </div>
          ) : (
            <button
              className="sidebar-login-btn"
              onClick={() => {
                onOpenAuth();
                if (setIsMobileOpen) setIsMobileOpen(false);
              }}
            >
              <LogInIcon size={18} />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
