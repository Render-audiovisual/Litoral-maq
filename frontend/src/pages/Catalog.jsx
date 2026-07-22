import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import ProductCard from "../components/ProductCard.jsx";

export default function Catalog() {
  const { categoria: categoriaParam } = useParams();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [categoriaFiltro, setCategoriaFiltro] = useState(categoriaParam || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToCart } = useCart();

  useEffect(() => {
    setCategoriaFiltro(categoriaParam || "");
  }, [categoriaParam]);

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
  }, [searchParams]);

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

  return (
    <div className="catalog-page">
      <div className="page-title-row">
        <h1>{categoriaParam || "Catálogo"}</h1>
      </div>

      {categoriaParam && (
        <p className="breadcrumb">
          <Link to="/productos">Todos los productos</Link>
          {" / "}
          {categoriaParam}
        </p>
      )}

      <div className="catalog-filters">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!categoriaParam && (
          <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="loading">Cargando productos...</p>
      ) : products.length === 0 ? (
        <p className="empty-state">No hay productos que coincidan con la búsqueda.</p>
      ) : (
        <div className="products-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={(prod) => addToCart(prod, 1)} />
          ))}
        </div>
      )}
    </div>
  );
}
