import React from "react";
import { Link } from "react-router-dom";

export default function ProductCard({ product, onAddToCart }) {
  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart(product);
  };

  return (
    <Link
      to={`/producto/${product.id}`}
      className={`product-card ${product.stock === 0 ? "out-of-stock" : ""}`}
    >
      {product.fotoUrl ? (
        <img className="product-card-image" src={product.fotoUrl} alt={product.articulo} />
      ) : (
        <div className="product-card-image product-card-image-empty">{product.categoria}</div>
      )}
      <div className="product-header">
        <h3>{product.articulo}</h3>
        <span className="product-code">{product.codigo}</span>
      </div>
      <p className="product-categoria">
        {product.marca ? `${product.marca} · ${product.categoria}` : product.categoria}
      </p>
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
      <button className="btn-primary" onClick={handleAdd} disabled={product.stock === 0}>
        {product.stock === 0 ? "Agotado" : "Agregar al carrito"}
      </button>
    </Link>
  );
}
