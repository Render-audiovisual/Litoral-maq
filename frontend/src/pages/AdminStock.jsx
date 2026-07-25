import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

const LOW_STOCK_THRESHOLD = 5;
const TIPO_LABELS = { entrada: "Entrada", salida: "Salida", ajuste: "Ajuste" };
const emptyMovement = { tipo: "entrada", valor: "", motivo: "" };

function formatMoney(value) {
  return `$${value.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminStock() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const [movementRowId, setMovementRowId] = useState(null);
  const [movementForm, setMovementForm] = useState(emptyMovement);
  const [movementError, setMovementError] = useState("");

  const [historyRowId, setHistoryRowId] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [productsData, categoriasData] = await Promise.all([
        api.getProducts(token, {}),
        api.getCategorias(token),
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
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (categoriaFiltro) {
      result = result.filter((p) => p.categoria === categoriaFiltro);
    }

    if (soloAlertas) {
      result = result.filter((p) => p.stock <= LOW_STOCK_THRESHOLD);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.articulo.toLowerCase().includes(searchLower) ||
          p.codigo.toString().toLowerCase().includes(searchLower)
      );
    }

    return [...result].sort((a, b) => {
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
      return a.articulo.localeCompare(b.articulo);
    });
  }, [products, categoriaFiltro, search, soloAlertas]);

  const resumen = useMemo(
    () => ({
      total: filteredProducts.length,
      bajo: filteredProducts.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length,
      sin: filteredProducts.filter((p) => p.stock === 0).length,
    }),
    [filteredProducts]
  );

  const handleStockEdit = (product) => {
    setMovementRowId(null);
    setHistoryRowId(null);
    setEditingId(product.id);
    setEditingValue(String(product.stock));
  };

  const handleStockCancel = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const handleStockSave = async (productId) => {
    const newStock = Number(editingValue);
    if (!Number.isInteger(newStock) || newStock < 0) {
      setError("El stock debe ser un número entero mayor o igual a 0.");
      return;
    }

    // El stock no se cambia con PUT: va por movimientos, que dejan auditoría.
    try {
      await api.createMovement(token, productId, {
        tipo: "ajuste",
        valor: newStock,
        motivo: "Ajuste rápido desde la tabla",
      });
      handleStockCancel();
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleKeyDown = (e, productId) => {
    if (e.key === "Enter") handleStockSave(productId);
    if (e.key === "Escape") handleStockCancel();
  };

  const openMovement = (product) => {
    setEditingId(null);
    setHistoryRowId(null);
    setMovementError("");
    setMovementForm(emptyMovement);
    setMovementRowId((current) => (current === product.id ? null : product.id));
  };

  const handleMovementSubmit = async (product, e) => {
    e.preventDefault();
    setMovementError("");
    try {
      await api.createMovement(token, product.id, {
        tipo: movementForm.tipo,
        valor: Number(movementForm.valor),
        motivo: movementForm.motivo,
      });
      setMovementRowId(null);
      setMovementForm(emptyMovement);
      loadData();
    } catch (err) {
      setMovementError(err.message);
    }
  };

  const toggleHistory = async (product) => {
    setEditingId(null);
    setMovementRowId(null);
    if (historyRowId === product.id) {
      setHistoryRowId(null);
      return;
    }
    setHistoryRowId(product.id);
    setHistoryLoading(true);
    try {
      setHistoryData(await api.getMovements(token, product.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStockClass = (stock) => {
    if (stock === 0) return "stock-empty";
    if (stock <= LOW_STOCK_THRESHOLD) return "stock-low";
    return "";
  };

  return (
    <div className="admin-stock-page">
      <div className="page-header">
        <div>
          <h1>Stock</h1>
          <p className="page-subtitle">
            Estado en tiempo real del inventario. Editá cantidades o registrá movimientos.
          </p>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <section className="kpi-grid kpi-grid-compact">
        <article className="kpi-card">
          <span className="kpi-label">Productos listados</span>
          <strong className="kpi-value">{resumen.total}</strong>
        </article>
        <article className="kpi-card kpi-card-warning">
          <span className="kpi-label">Stock bajo (≤{LOW_STOCK_THRESHOLD})</span>
          <strong className="kpi-value">{resumen.bajo}</strong>
        </article>
        <article className="kpi-card kpi-card-danger">
          <span className="kpi-label">Sin stock</span>
          <strong className="kpi-value">{resumen.sin}</strong>
        </article>
      </section>

      <div className="filters-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="category-select"
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="filter-check">
          <input
            type="checkbox"
            checked={soloAlertas}
            onChange={(e) => setSoloAlertas(e.target.checked)}
          />
          Solo alertas
        </label>
      </div>

      {loading ? (
        <p className="loading">Cargando productos...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="empty-state">No se encontraron productos.</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Nombre</th>
                <th>Código</th>
                <th className="col-right">Precio</th>
                <th className="col-center">Stock</th>
                <th className="col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <React.Fragment key={product.id}>
                  <tr>
                    <td className="cell-muted">{product.categoria}</td>
                    <td className="cell-strong">{product.articulo}</td>
                    <td className="cell-mono">{product.codigo}</td>
                    <td className="col-right">{formatMoney(product.precio)}</td>
                    <td className="col-center">
                      {editingId === product.id ? (
                        <div className="stock-editor">
                          <input
                            type="number"
                            min="0"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, product.id)}
                            autoFocus
                            className="stock-input"
                          />
                          <button
                            type="button"
                            className="btn-icon btn-icon-save"
                            onClick={() => handleStockSave(product.id)}
                            title="Guardar"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-icon-cancel"
                            onClick={handleStockCancel}
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className={`stock-chip ${getStockClass(product.stock)}`}>
                          {product.stock === 0 ? "Sin stock" : product.stock}
                        </span>
                      )}
                    </td>
                    <td className="col-actions">
                      <div className="row-actions">
                        <button className="btn-row" onClick={() => handleStockEdit(product)}>
                          Editar
                        </button>
                        <button className="btn-row" onClick={() => openMovement(product)}>
                          {movementRowId === product.id ? "Cerrar" : "Movimiento"}
                        </button>
                        <button className="btn-row" onClick={() => toggleHistory(product)}>
                          {historyRowId === product.id ? "Cerrar" : "Historial"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {movementRowId === product.id && (
                    <tr className="expand-row">
                      <td colSpan={6}>
                        <form
                          className="movement-form"
                          onSubmit={(e) => handleMovementSubmit(product, e)}
                        >
                          <span className="movement-current">
                            Stock actual: <strong>{product.stock}</strong>
                          </span>
                          <select
                            value={movementForm.tipo}
                            onChange={(e) =>
                              setMovementForm({ ...movementForm, tipo: e.target.value })
                            }
                          >
                            <option value="entrada">Entrada</option>
                            <option value="salida">Salida</option>
                            <option value="ajuste">Ajuste (stock exacto)</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            placeholder={
                              movementForm.tipo === "ajuste" ? "Nuevo stock" : "Cantidad"
                            }
                            value={movementForm.valor}
                            onChange={(e) =>
                              setMovementForm({ ...movementForm, valor: e.target.value })
                            }
                            required
                          />
                          <input
                            type="text"
                            placeholder="Motivo (opcional)"
                            value={movementForm.motivo}
                            onChange={(e) =>
                              setMovementForm({ ...movementForm, motivo: e.target.value })
                            }
                          />
                          <button type="submit" className="btn-primary">
                            Registrar
                          </button>
                          {movementError && <span className="error">{movementError}</span>}
                        </form>
                      </td>
                    </tr>
                  )}

                  {historyRowId === product.id && (
                    <tr className="expand-row">
                      <td colSpan={6}>
                        {historyLoading ? (
                          <p className="loading">Cargando historial...</p>
                        ) : historyData.length === 0 ? (
                          <p className="empty-state">Sin movimientos registrados.</p>
                        ) : (
                          <table className="history-table">
                            <thead>
                              <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Cantidad</th>
                                <th>Anterior</th>
                                <th>Nuevo</th>
                                <th>Motivo</th>
                                <th>Usuario</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historyData.map((m) => (
                                <tr key={m.id}>
                                  <td>{formatFecha(m.createdAt)}</td>
                                  <td>{TIPO_LABELS[m.tipo] || m.tipo}</td>
                                  <td>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                                  <td>{m.stockAnterior}</td>
                                  <td>{m.stockNuevo}</td>
                                  <td>{m.motivo || "—"}</td>
                                  <td>{m.usuario || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
