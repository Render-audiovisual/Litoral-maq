import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import { compressImage } from "../utils/image.js";

const emptyForm = { codigo: "", articulo: "", precio: "", stock: "", categoria: "", marca: "" };
const emptyMovement = { tipo: "entrada", valor: "", motivo: "" };

const TIPO_LABELS = { entrada: "Entrada", salida: "Salida", ajuste: "Ajuste" };

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminProducts() {
  const { token, username, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);
  const [movementRowId, setMovementRowId] = useState(null);
  const [movementForm, setMovementForm] = useState(emptyMovement);
  const [movementError, setMovementError] = useState("");
  const [historyRowId, setHistoryRowId] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [imageRowId, setImageRowId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState("");
  const [imageSaving, setImageSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [productsData, categoriasData] = await Promise.all([
        api.getProducts(token, { search, categoria: categoriaFiltro }),
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
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoriaFiltro]);

  const lowStockCount = useMemo(() => products.filter((p) => p.lowStock).length, [products]);

  const handleFieldChange = async (product, field, value) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, [field]: value } : p))
    );
  };

  const handleFieldBlur = async (product, field, value) => {
    try {
      const parsed = field === "precio" ? Number(value) : value;
      await api.updateProduct(token, product.id, { [field]: parsed });
      load();
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  const handleToggleActivo = async (product) => {
    try {
      await api.updateProduct(token, product.id, { activo: !product.activo });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`¿Eliminar "${product.articulo}" definitivamente? Se borra también su historial de movimientos. Si preferís conservarlo, usá "Desactivar".`)) return;
    try {
      await api.deleteProduct(token, product.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createProduct(token, {
        ...form,
        precio: Number(form.precio),
        stock: Number(form.stock) || 0,
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.map((r) => ({
          codigo: r.CODIGO || r.codigo,
          articulo: r.ARTICULO || r.articulo,
          precio: r.PRECIO || r.precio,
          stock: r.STOCK || r.stock || 0,
          categoria: r.CATEGORIA || r.categoria || "Sin categoría",
          marca: r.MARCA || r.marca || "",
        }));
        try {
          const summary = await api.importProducts(token, rows);
          setImportSummary(summary);
          load();
        } catch (err) {
          setError(err.message);
        }
      },
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openMovement = (product) => {
    setHistoryRowId(null);
    setImageRowId(null);
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
      load();
    } catch (err) {
      setMovementError(err.message);
    }
  };

  const toggleHistory = async (product) => {
    setMovementRowId(null);
    setImageRowId(null);
    if (historyRowId === product.id) {
      setHistoryRowId(null);
      return;
    }
    setHistoryRowId(product.id);
    setHistoryLoading(true);
    try {
      const data = await api.getMovements(token, product.id);
      setHistoryData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openImage = (product) => {
    setMovementRowId(null);
    setHistoryRowId(null);
    setImageError("");
    setImagePreview(product.fotoUrl || null);
    setImageRowId((current) => (current === product.id ? null : product.id));
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");
    try {
      const dataUrl = await compressImage(file);
      setImagePreview(dataUrl);
    } catch (err) {
      setImageError(err.message);
    }
  };

  const handleImageSave = async (product) => {
    setImageSaving(true);
    setImageError("");
    try {
      await api.updateProduct(token, product.id, { fotoUrl: imagePreview });
      setImageRowId(null);
      load();
    } catch (err) {
      setImageError(err.message);
    } finally {
      setImageSaving(false);
    }
  };

  const handleImageRemove = async (product) => {
    setImageSaving(true);
    setImageError("");
    try {
      await api.updateProduct(token, product.id, { fotoUrl: null });
      setImagePreview(null);
      setImageRowId(null);
      load();
    } catch (err) {
      setImageError(err.message);
    } finally {
      setImageSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Litoral Maq</h1>
          <p className="subtitle">Productos y stock</p>
        </div>
        <div className="admin-header-right">
          <span>Hola, {username}</span>
          <button className="btn-secondary" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Buscar por código o artículo..."
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

        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Nuevo producto"}
        </button>

        <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
          Importar CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          hidden
          onChange={handleImportFile}
        />
        <Link to="/admin/fotos" className="btn-secondary">
          📷 Cargar fotos
        </Link>
      </div>

      {lowStockCount > 0 && (
        <p className="low-stock-banner">
          ⚠️ {lowStockCount} producto(s) con stock bajo (menos de 5 unidades)
        </p>
      )}

      {importSummary && (
        <p className="import-summary">
          Importación: {importSummary.created} creados, {importSummary.updated} actualizados
          {importSummary.errors.length > 0 && `, ${importSummary.errors.length} con errores`}.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {showForm && (
        <form className="new-product-form" onSubmit={handleCreate}>
          <input
            placeholder="Código"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            required
          />
          <input
            placeholder="Artículo"
            value={form.articulo}
            onChange={(e) => setForm({ ...form, articulo: e.target.value })}
            required
          />
          <input
            placeholder="Marca (opcional)"
            value={form.marca}
            onChange={(e) => setForm({ ...form, marca: e.target.value })}
          />
          <input
            placeholder="Precio"
            type="number"
            step="0.01"
            value={form.precio}
            onChange={(e) => setForm({ ...form, precio: e.target.value })}
            required
          />
          <input
            placeholder="Stock"
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
          <input
            placeholder="Categoría"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            required
          />
          <button type="submit" className="btn-primary">
            Guardar
          </button>
        </form>
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="products-list">
          <div className="product-row product-row-header">
            <span>Código</span>
            <span>Artículo</span>
            <span>Marca</span>
            <span>Categoría</span>
            <span>Precio</span>
            <span>Stock</span>
            <span></span>
          </div>

          {products.map((p) => (
            <div key={p.id} className="product-row-group">
              <div
                className={[
                  "product-row",
                  p.lowStock ? "low-stock-row" : "",
                  !p.activo ? "inactive-row" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="product-field product-field-code">
                  <span className="field-label">Código</span>
                  {p.codigo}
                  {!p.activo && <span className="inactive-badge">Inactivo</span>}
                </span>

                <label className="product-field">
                  <span className="field-label">Artículo</span>
                  <input
                    className="cell-input"
                    value={p.articulo}
                    onChange={(e) => handleFieldChange(p, "articulo", e.target.value)}
                    onBlur={(e) => handleFieldBlur(p, "articulo", e.target.value)}
                  />
                </label>

                <label className="product-field">
                  <span className="field-label">Marca</span>
                  <input
                    className="cell-input"
                    value={p.marca || ""}
                    placeholder="—"
                    onChange={(e) => handleFieldChange(p, "marca", e.target.value)}
                    onBlur={(e) => handleFieldBlur(p, "marca", e.target.value)}
                  />
                </label>

                <label className="product-field">
                  <span className="field-label">Categoría</span>
                  <input
                    className="cell-input"
                    value={p.categoria}
                    onChange={(e) => handleFieldChange(p, "categoria", e.target.value)}
                    onBlur={(e) => handleFieldBlur(p, "categoria", e.target.value)}
                  />
                </label>

                <label className="product-field">
                  <span className="field-label">Precio</span>
                  <input
                    className="cell-input cell-number"
                    type="number"
                    step="0.01"
                    value={p.precio}
                    onChange={(e) => handleFieldChange(p, "precio", e.target.value)}
                    onBlur={(e) => handleFieldBlur(p, "precio", e.target.value)}
                  />
                </label>

                <span className="product-field">
                  <span className="field-label">Stock</span>
                  <span className="stock-value">{p.stock}</span>
                </span>

                <div className="product-field actions-cell">
                  <button className="btn-secondary" onClick={() => openMovement(p)}>
                    {movementRowId === p.id ? "Cerrar" : "Movimiento"}
                  </button>
                  <button className="btn-secondary" onClick={() => toggleHistory(p)}>
                    {historyRowId === p.id ? "Cerrar" : "Historial"}
                  </button>
                  <button className="btn-secondary" onClick={() => openImage(p)}>
                    {imageRowId === p.id ? "Cerrar" : "Imagen"}
                  </button>
                  <button className="btn-secondary" onClick={() => handleToggleActivo(p)}>
                    {p.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button className="btn-danger" onClick={() => handleDelete(p)}>
                    Eliminar
                  </button>
                </div>
              </div>

              {movementRowId === p.id && (
                <div className="movement-row">
                  <form className="movement-form" onSubmit={(e) => handleMovementSubmit(p, e)}>
                    <span>
                      Stock actual: <strong>{p.stock}</strong>
                    </span>
                    <select
                      value={movementForm.tipo}
                      onChange={(e) => setMovementForm({ ...movementForm, tipo: e.target.value })}
                    >
                      <option value="entrada">Entrada</option>
                      <option value="salida">Salida</option>
                      <option value="ajuste">Ajuste (nuevo stock exacto)</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      placeholder={movementForm.tipo === "ajuste" ? "Nuevo stock" : "Cantidad"}
                      value={movementForm.valor}
                      onChange={(e) => setMovementForm({ ...movementForm, valor: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Motivo (opcional)"
                      value={movementForm.motivo}
                      onChange={(e) => setMovementForm({ ...movementForm, motivo: e.target.value })}
                    />
                    <button type="submit" className="btn-primary">
                      Registrar
                    </button>
                    {movementError && <span className="error">{movementError}</span>}
                  </form>
                </div>
              )}

              {historyRowId === p.id && (
                <div className="history-row">
                  {historyLoading ? (
                    <p>Cargando historial...</p>
                  ) : historyData.length === 0 ? (
                    <p className="empty-state">Sin movimientos registrados para este producto.</p>
                  ) : (
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Cantidad</th>
                          <th>Stock anterior</th>
                          <th>Stock nuevo</th>
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
                </div>
              )}

              {imageRowId === p.id && (
                <div className="image-row">
                  <div className="image-form">
                    {imagePreview ? (
                      <img className="image-preview" src={imagePreview} alt={p.articulo} />
                    ) : (
                      <div className="image-preview image-preview-empty">Sin imagen</div>
                    )}
                    <div className="image-form-actions">
                      <input type="file" accept="image/*" onChange={handleImageFile} />
                      <div>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleImageSave(p)}
                          disabled={imageSaving || !imagePreview}
                        >
                          Guardar imagen
                        </button>
                        {p.fotoUrl && (
                          <button
                            type="button"
                            className="btn-danger"
                            onClick={() => handleImageRemove(p)}
                            disabled={imageSaving}
                          >
                            Quitar imagen
                          </button>
                        )}
                      </div>
                      {imageError && <span className="error">{imageError}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {products.length === 0 && <p className="empty-state">No hay productos que coincidan con la búsqueda.</p>}
        </div>
      )}
    </div>
  );
}
