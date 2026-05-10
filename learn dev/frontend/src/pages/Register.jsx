import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getErrorMessage } from "../utils/errors.js";

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/register", form);
      login(data);
      addToast("Account created", "success");
      navigate("/dashboard");
    } catch (err) {
      addToast(getErrorMessage(err, "Registration failed"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="shell auth-layout">
        <aside className="auth-intro">
          <p className="kicker">Start learning</p>
          <h1>Create a workspace for courses, notes, and progress.</h1>
          <p>
            Join Learn Dev to enroll in focused courses, save your lesson notes, and continue from your dashboard every
            time you return.
          </p>
          <div className="auth-stat-grid" aria-label="Account benefits">
            <div>
              <strong>1</strong>
              <span>Dashboard for every learner</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Access to course materials</span>
            </div>
          </div>
        </aside>

        <form className="panel form-panel auth-card" onSubmit={onSubmit}>
          <div className="auth-card-head">
            <p className="kicker">Create account</p>
            <h2>Join Learn Dev</h2>
            <p>Set up your account and start building your course dashboard.</p>
          </div>

          <label htmlFor="register-name">Name</label>
          <input
            id="register-name"
            autoComplete="name"
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <label htmlFor="register-password">Password</label>
          <div className="password-field">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a password"
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
            {busy ? "Creating..." : "Create account"}
          </button>

          <div className="auth-divider">
            <span>Already joined?</span>
          </div>

          <Link to="/login" className="btn btn-outline btn-large auth-submit">
            Log in
          </Link>

          <p className="auth-footnote">Your lessons, notes, and progress stay connected in one place.</p>
        </form>
      </div>
    </section>
  );
};

export default Register;
