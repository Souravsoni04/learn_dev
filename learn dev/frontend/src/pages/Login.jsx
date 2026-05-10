import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getErrorMessage } from "../utils/errors.js";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data);
      addToast("Login successful", "success");
      navigate(data.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      addToast(getErrorMessage(err, "Login failed"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="shell auth-layout">
        <aside className="auth-intro">
          <p className="kicker">Welcome back</p>
          <h1>Keep your learning streak moving.</h1>
          <p>
            Sign in to continue courses, review saved notes, and pick up your development path from where you left off.
          </p>
          <div className="auth-stat-grid" aria-label="Platform highlights">
            <div>
              <strong>68%</strong>
              <span>Sample path progress</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Focused learning modes</span>
            </div>
          </div>
        </aside>

        <form className="panel form-panel auth-card" onSubmit={onSubmit}>
          <div className="auth-card-head">
            <p className="kicker">Account access</p>
            <h2>Log in</h2>
            <p>Use your Learn Dev account to open your dashboard.</p>
          </div>

          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <div className="field-label-row">
            <label htmlFor="login-password">Password</label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <div className="password-field">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 4.2A9.8 9.8 0 0 1 12 4c5 0 8.5 4.2 9.8 6a2.2 2.2 0 0 1 0 2.1 15 15 0 0 1-3 3.4" />
                  <path d="M6.6 6.6A15.6 15.6 0 0 0 2.2 10a2.2 2.2 0 0 0 0 2.1C3.5 13.8 7 18 12 18a9.7 9.7 0 0 0 3.4-.6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.2 10a2.2 2.2 0 0 0 0 2.1C3.5 13.8 7 18 12 18s8.5-4.2 9.8-5.9a2.2 2.2 0 0 0 0-2.1C20.5 8.2 17 4 12 4S3.5 8.2 2.2 10Z" />
                  <circle cx="12" cy="11" r="3" />
                </svg>
              )}
            </button>
          </div>

          <button type="submit" className="btn btn-large auth-submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <div className="auth-divider">
            <span>New to Learn Dev?</span>
          </div>

          <Link to="/register" className="btn btn-outline btn-large auth-submit">
            Create Account
          </Link>

          <p className="auth-footnote">
            Join free and build a dashboard for courses, notes, reviews, and progress.
          </p>
        </form>
      </div>
    </section>
  );
};

export default Login;
