import React, { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "◲", end: true },
  { to: "/admin/productos", label: "Productos", icon: "▤" },
  { to: "/admin/stock", label: "Stock", icon: "▦" },
  { to: "/admin/fotos", label: "Fotos", icon: "▣" },
];

export default function AdminLayout() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-brand">
          <span className="site-logo-mark">LM</span>
          <div>
            <strong>Litoral Maq</strong>
            <small>Panel de gestión</small>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-nav-link admin-nav-link-muted">
            <span className="admin-nav-icon" aria-hidden="true">
              ↗
            </span>
            Ver sitio público
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="admin-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-burger"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <div className="admin-topbar-user">
            <span className="admin-user-name">{username || "Administrador"}</span>
            <button className="btn-secondary" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
