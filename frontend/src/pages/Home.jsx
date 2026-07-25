import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import ProductCard from "../components/ProductCard.jsx";

const DESTACADOS_COUNT = 8;

const BENEFICIOS = [
  { icon: "⚡", title: "Entrega rápida", text: "Retiro en el local o envío a domicilio." },
  { icon: "🛠️", title: "Asesoramiento", text: "Te ayudamos a elegir la herramienta correcta." },
  { icon: "💬", title: "Pedidos por WhatsApp", text: "Armá tu carrito y lo cerramos por chat." },
  { icon: "🏷️", title: "Precios claros", text: "Sin sorpresas: el precio que ves es el que pagás." },
];

export default function Home() {
  const [destacados, setDestacados] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    api
      .getProducts(null, {})
      .then((productsData) => {
        setDestacados(productsData.filter((p) => p.stock > 0).slice(0, DESTACADOS_COUNT));
      })
      .catch(() => setDestacados([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-content">
          <span className="hero-eyebrow">Corrientes · Litoral Maq</span>
          <h1>Herramientas y maquinaria para tu obra o taller</h1>
          <p>
            Soldadura, herramientas eléctricas, generadores y todo lo que necesitás para
            trabajar. Consultá el catálogo y cerrá tu pedido por WhatsApp.
          </p>
          <div className="hero-actions">
            <Link to="/productos" className="btn-primary btn-large">
              Ver catálogo completo
            </Link>
            <a
              href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_PHONE || ""}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost btn-large"
            >
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="home-beneficios">
        {BENEFICIOS.map((b) => (
          <article key={b.title} className="beneficio-card">
            <span className="beneficio-icon" aria-hidden="true">
              {b.icon}
            </span>
            <div>
              <strong>{b.title}</strong>
              <p>{b.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="home-destacados">
        <div className="section-head">
          <div>
            <h2>Productos destacados</h2>
            <p className="section-subtitle">Lo más buscado, disponible ahora.</p>
          </div>
          <Link to="/productos" className="link-more">
            Ver todos →
          </Link>
        </div>

        {loading ? (
          <div className="products-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="product-card-skeleton" />
            ))}
          </div>
        ) : destacados.length === 0 ? (
          <p className="empty-state">Todavía no hay productos disponibles.</p>
        ) : (
          <div className="products-grid">
            {destacados.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={(prod) => addToCart(prod, 1)} />
            ))}
          </div>
        )}
      </section>

      <section className="home-cta">
        <div>
          <h2>¿No encontrás lo que buscás?</h2>
          <p>Escribinos y te conseguimos la herramienta que necesitás.</p>
        </div>
        <a
          href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_PHONE || ""}`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary btn-large"
        >
          Hablar con un asesor
        </a>
      </section>
    </div>
  );
}
