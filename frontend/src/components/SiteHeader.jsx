import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";

export default function SiteHeader() {
  const [categorias, setCategorias] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  const { items } = useCart();
  const navigate = useNavigate();
  const cartCount = items.length;

  useEffect(() => {
    api
      .getCategorias(null)
      .then(setCategorias)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSearchValue(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    const q = searchValue.trim();
    navigate(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
  };

  return (
    <header className="site-header">
      <div className="site-header-top">
        <Link to="/" className="site-logo" onClick={() => setMenuOpen(false)}>
          <span className="site-logo-mark">LM</span>
          <span className="site-logo-text">
            Litoral Maq
            <small>Herramientas y maquinaria</small>
          </span>
        </Link>

        <form className="site-search" onSubmit={handleSearchSubmit} role="search">
          <input
            type="text"
            placeholder="Buscar productos, códigos o marcas..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Buscar productos"
          />
          <button type="submit">Buscar</button>
        </form>

        <div className="site-header-actions">
          <button className="btn-cart" onClick={() => navigate("/checkout")}>
            <span aria-hidden="true">🛒</span>
            <span className="btn-cart-label">Carrito</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          <button
            className="btn-menu-toggle"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
          >
            ☰ Categorías
          </button>
        </div>
      </div>

      <nav className={`site-nav ${menuOpen ? "open" : ""}`}>
        <NavLink
          to="/productos"
          end
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Todos los productos
        </NavLink>
        {categorias.map((c) => (
          <NavLink
            key={c}
            to={`/productos/${encodeURIComponent(c)}`}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {c}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
