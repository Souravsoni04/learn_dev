import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";
import { SUPPORT_ENABLED } from "../config/features.js";

const navLinkClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    const fetchUnread = async () => {
      if (SUPPORT_ENABLED && user && user.role !== "admin") {
        try {
          const { data } = await api.get("/support/unread-count");
          setUnreadCount(data.count || 0);
        } catch (err) {
          console.error("Failed to fetch unread count");
        }
      }
    };

    if (!SUPPORT_ENABLED) {
      setUnreadCount(0);
      return undefined;
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [user]);

  const onLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="site-header">
      <div className="site-header-inner shell">
        <button type="button" className="brand" onClick={() => navigate("/")}>
          <span className="brand-mark">LD</span>
          <span className="brand-copy">
            <span className="brand-text">Learn Dev</span>
            <span className="brand-subtitle">Build skills faster</span>
          </span>
        </button>

        <button
          type="button"
          className="mobile-toggle"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`site-nav ${menuOpen ? "open" : ""}`}>
          <NavLink to="/" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/courses" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Courses
          </NavLink>
          {user?.role === "student" && (
            <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMenuOpen(false)}>
              Dashboard
            </NavLink>
          )}
          {user?.role === "admin" && (
            <NavLink to="/admin" className={navLinkClass} onClick={() => setMenuOpen(false)}>
              Admin
            </NavLink>
          )}
          {user && (
            <NavLink to="/settings" className={navLinkClass} onClick={() => setMenuOpen(false)}>
              Settings
              {unreadCount > 0 && (
                <span className="ml-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse inline-block" title={`${unreadCount} new support updates`}></span>
              )}
            </NavLink>
          )}
        </nav>

        <div className={`auth-actions ${!user ? "guest-actions" : ""}`}>
          {!user && (
            <>
              <NavLink to="/login" className="btn btn-outline nav-login-btn" onClick={() => setMenuOpen(false)}>
                Log in
              </NavLink>
              <NavLink to="/register" className="btn nav-start-btn" onClick={() => setMenuOpen(false)}>
                Start learning
              </NavLink>
            </>
          )}
          {user && (
            <span className="account-pill">
              <span className="account-avatar">{userInitial}</span>
              <span className="account-copy">
                <span>{user.name}</span>
                <small>{user.role}</small>
              </span>
            </span>
          )}
          {user && (
            <button type="button" className="btn btn-outline" onClick={onLogout}>
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
