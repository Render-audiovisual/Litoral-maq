import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import ProductCard from "../components/ProductCard.jsx";

const DESTACADOS_COUNT = 8;

export default function Home() {
  const [categorias, setCategorias] = useState([]);
  const [destacados, setDestacados] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    Promise.all([api.getCategorias(null), api.getProducts(null, {})])
      .then(([categoriasData, productsData]) => {
        setCategorias(categoriasData);
        setDestacados(productsData.filter((p) => p.stock > 0).slice(0, DESTACADOS_COUNT));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page">
      <section className="home-hero">
        <h1>Litoral Maq</h1>
        <p>Herramientas, maquinaria y soldadura para tu obra o taller.</p>
        <Link to="/productos" className="btn-primary btn-large">
          Ver catálogo completo
        </Link>
      </section>

      <section className="home-categorias">
        <h2>Categorías</h2>
        <div className="categorias-grid">
          {categorias.map((c) => (
            <Link key={c} to={`/productos/${encodeURIComponent(c)}`} className="categoria-card">
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="home-destacados">
        <h2>Productos</h2>
        {loading ? (
          <p className="loading">Cargando...</p>
        ) : (
          <div className="products-grid">
            {destacados.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={(prod) => addToCart(prod, 1)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
