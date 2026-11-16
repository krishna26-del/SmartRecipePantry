import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { CloseIcon } from "./Icons";

export default function AuthModal({ isOpen, onClose }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let res;
      if (isRegister) {
        res = await register(name, email, password);
      } else {
        res = await login(email, password);
      }

      if (res.success) {
        onClose();
      } else {
        setError(res.message || "Authentication failed. Please check your credentials.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister((v) => !v);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isRegister ? "Create Account" : "Sign In"}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>{isRegister ? "Create an Account" : "Welcome Back"}</h3>
            <p className="modal-sub">
              {isRegister
                ? "Start managing your kitchen smarter."
                : "Sign in to access your Recipe Management System."}
            </p>
          </div>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close authentication dialog"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert-error" role="alert">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Johnson"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              required
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            id="auth-submit-btn"
            className="submit-btn"
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : isRegister
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>

        {/* Footer toggle */}
        <div className="modal-footer" style={{ marginTop: "16px" }}>
          {isRegister ? (
            <p>
              Already have an account?{" "}
              <button className="link-btn" onClick={switchMode}>
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don&apos;t have an account?{" "}
              <button className="link-btn" onClick={switchMode}>
                Sign Up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
