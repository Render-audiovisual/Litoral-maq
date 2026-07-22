import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    setCantidad(1);
    api
      .getProduct(id)
      .then(setProduct)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="loading">Cargando...</p>;

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <p className="error">{error || "Producto no encontrado."}</p>
        <Link to="/productos">← Volver al catálogo</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, cantidad);
  };

  return (
    <div className="product-detail-page">
      <p className="breadcrumb">
        <Link to="/productos">Catálogo</Link>
        {" / "}
        <Link to={`/productos/${encodeURIComponent(product.categoria)}`}>{product.categoria}</Link>
        {" / "}
        {product.articulo}
      </p>

      <div className="product-detail">
        <div className="product-detail-image">
          <span>{product.categoria}</span>
        </div>

        <div className="product-detail-info">
          <h1>{product.articulo}</h1>
          <span className="product-code">Código: {product.codigo}</span>

          <div className="product-price">
            ${product.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </div>

          <div className="product-stock">
            {product.stock === 0 ? (
              <span className="out-of-stock-badge">Agotado</span>
            ) : product.stock < 5 ? (
              <span className="low-stock-badge">Solo {product.stock} disponibles</span>
            ) : (
              <span className="in-stock-badge">En stock</span>
            )}
          </div>

          <div className="product-detail-actions">
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
              disabled={product.stock === 0}
              className="qty-input"
            />
            <button
              className="btn-primary btn-large"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? "Agotado" : "Agregar al carrito"}
            </button>
          </div>

          <button className="btn-secondary" onClick={() => navigate("/checkout")}>
            Ir al carrito
          </button>
        </div>
      </div>
    </div>
  );
}
