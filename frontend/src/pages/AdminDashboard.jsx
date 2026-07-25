import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

const LOW_STOCK_THRESHOLD = 5;
const TIPO_LABELS = { entrada: "Entrada", salida: "Salida", ajuste: "Ajuste" };

function formatMoney(value) {
  return `$${value.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminDashboard() {
  const { token, username } = useAuth();
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const productsData = await api.getProducts(token, {});
        if (!cancelled) setProducts(productsData);

        // El historial es complementario: si falla, el dashboard sigue siendo útil.
        try {
          const movementsData = await api.getRecentMovements(token);
          if (!cancelled) setMovements(movementsData);
        } catch {
          if (!cancelled) setMovements([]);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const stats = useMemo(() => {
    const activos = products.filter((p) => p.activo !== false);
    const sinStock = products.filter((p) => p.stock === 0);
    const stockBajo = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
    const valorInventario = products.reduce((acc, p) => acc + p.precio * p.stock, 0);
    const categorias = new Set(products.map((p) => p.categoria));

    return {
      total: products.length,
      activos: activos.length,
      sinStock: sinStock.length,
      stockBajo: stockBajo.length,
      categorias: categorias.size,
      valorInventario,
    };
  }, [products]);

  const alertas = useMemo(
    () =>
      products
        .filter((p) => p.stock <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stock - b.stock || a.articulo.localeCompare(b.articulo))
        .slice(0, 8),
    [products]
  );

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            Hola {username || "administrador"}, este es el estado actual del negocio.
          </p>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      {loading ? (
        <p className="loading">Cargando datos...</p>
      ) : (
        <>
          <section className="kpi-grid">
            <article className="kpi-card">
              <span className="kpi-label">Productos cargados</span>
              <strong className="kpi-value">{stats.total}</strong>
              <span className="kpi-hint">{stats.activos} activos en el catálogo</span>
            </article>

            <article className="kpi-card kpi-card-warning">
              <span className="kpi-label">Stock bajo</span>
              <strong className="kpi-value">{stats.stockBajo}</strong>
              <span className="kpi-hint">{LOW_STOCK_THRESHOLD} unidades o menos</span>
            </article>

            <article className="kpi-card kpi-card-danger">
              <span className="kpi-label">Sin stock</span>
              <strong className="kpi-value">{stats.sinStock}</strong>
              <span className="kpi-hint">Necesitan reposición</span>
            </article>

            <article className="kpi-card kpi-card-accent">
              <span className="kpi-label">Valor del inventario</span>
              <strong className="kpi-value">{formatMoney(stats.valorInventario)}</strong>
              <span className="kpi-hint">{stats.categorias} categorías</span>
            </article>
          </section>

          <section className="dashboard-actions">
            <h2>Accesos rápidos</h2>
            <div className="quick-actions">
              <Link to="/admin/productos/nuevo" className="quick-action">
                <span className="quick-action-icon">＋</span>
                <span>
                  <strong>Nuevo producto</strong>
                  <small>Cargar un artículo al catálogo</small>
                </span>
              </Link>
              <Link to="/admin/stock" className="quick-action">
                <span className="quick-action-icon">▦</span>
                <span>
                  <strong>Revisar stock</strong>
                  <small>Ver y ajustar cantidades</small>
                </span>
              </Link>
              <Link to="/admin/productos" className="quick-action">
                <span className="quick-action-icon">▤</span>
                <span>
                  <strong>Gestionar productos</strong>
                  <small>Editar precios, marcas y estado</small>
                </span>
              </Link>
              <Link to="/admin/fotos" className="quick-action">
                <span className="quick-action-icon">▣</span>
                <span>
                  <strong>Cargar fotos</strong>
                  <small>Subir imágenes desde el celular</small>
                </span>
              </Link>
            </div>
          </section>

          <div className="dashboard-columns">
            <section className="dashboard-panel">
              <div className="dashboard-panel-head">
                <h2>Requieren atención</h2>
                <Link to="/admin/stock" className="link-more">
                  Ver todo
                </Link>
              </div>

              {alertas.length === 0 ? (
                <p className="empty-state">Todo el stock está en niveles saludables.</p>
              ) : (
                <ul className="alert-list">
                  {alertas.map((p) => (
                    <li key={p.id} className="alert-item">
                      <div className="alert-item-info">
                        <strong>{p.articulo}</strong>
                        <small>
                          {p.categoria} · #{p.codigo}
                        </small>
                      </div>
                      <span className={p.stock === 0 ? "badge-danger" : "badge-warning"}>
                        {p.stock === 0 ? "Sin stock" : `${p.stock} u.`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-panel-head">
                <h2>Movimientos recientes</h2>
              </div>

              {movements.length === 0 ? (
                <p className="empty-state">Todavía no hay movimientos registrados.</p>
              ) : (
                <ul className="movement-list">
                  {movements.slice(0, 8).map((m) => (
                    <li key={m.id} className="movement-item">
                      <div className="movement-item-info">
                        <strong>{m.product?.articulo || `Producto #${m.productId}`}</strong>
                        <small>{formatFecha(m.createdAt)}</small>
                      </div>
                      <span className={`movement-tag movement-tag-${m.tipo}`}>
                        {TIPO_LABELS[m.tipo] || m.tipo}
                        {typeof m.cantidad === "number" &&
                          ` ${m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
