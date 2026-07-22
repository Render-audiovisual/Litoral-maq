import React, { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";

export default function PublicLayout() {
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
    <div className="site">
      <header className="site-header">
        <div className="site-header-top">
          <Link to="/" className="site-logo" onClick={() => setMenuOpen(false)}>
            Litoral Maq
          </Link>

          <form className="site-search" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button type="submit">Buscar</button>
          </form>

          <div className="site-header-actions">
            <button className="btn-cart" onClick={() => navigate("/checkout")}>
              🛒 Carrito ({cartCount})
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
          <Link to="/productos" onClick={() => setMenuOpen(false)}>
            Todos los productos
          </Link>
          {categorias.map((c) => (
            <Link
              key={c}
              to={`/productos/${encodeURIComponent(c)}`}
              onClick={() => setMenuOpen(false)}
            >
              {c}
            </Link>
          ))}
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>Litoral Maq — Herramientas, maquinaria y soldadura</p>
        <a
          href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_PHONE || ""}`}
          target="_blank"
          rel="noreferrer"
        >
          Contactanos por WhatsApp
        </a>
      </footer>
    </div>
  );
}
