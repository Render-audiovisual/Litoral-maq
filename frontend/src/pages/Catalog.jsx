import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToCart, items } = useCart();
  const navigate = useNavigate();
  const cartCount = items.length;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [productsData, categoriasData] = await Promise.all([
        api.getProducts(null, { search, categoria: categoriaFiltro }),
        api.getCategorias(null),
      ]);
      setProducts(productsData);
      setCategorias(categoriasData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoriaFiltro]);

  const handleAddToCart = (product, e) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <h1>Litoral Maq</h1>
        <button className="btn-cart" onClick={() => navigate("/checkout")}>
          🛒 Carrito ({cartCount})
        </button>
      </header>

      <div className="catalog-filters">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading">Cargando productos...</p>
      ) : products.length === 0 ? (
        <p className="empty-state">No hay productos que coincidan con la búsqueda.</p>
      ) : (
        <div className="products-grid">
          {products.map((p) => (
            <div key={p.id} className={`product-card ${p.stock === 0 ? "out-of-stock" : ""}`}>
              <div className="product-header">
                <h3>{p.articulo}</h3>
                <span className="product-code">{p.codigo}</span>
              </div>
              <p className="product-categoria">{p.categoria}</p>
              <div className="product-price">
                ${p.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </div>
              <div className="product-stock">
                {p.stock === 0 ? (
                  <span className="out-of-stock-badge">Agotado</span>
                ) : p.stock < 5 ? (
                  <span className="low-stock-badge">Solo {p.stock} disponibles</span>
                ) : (
                  <span className="in-stock-badge">En stock</span>
                )}
              </div>
              <button
                className="btn-primary"
                onClick={(e) => handleAddToCart(p, e)}
                disabled={p.stock === 0}
              >
                {p.stock === 0 ? "Agotado" : "Agregar al carrito"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
