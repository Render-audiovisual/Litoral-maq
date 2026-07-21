import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

const emptyForm = { codigo: "", articulo: "", precio: "", stock: "", categoria: "" };

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
      const parsed = field === "precio" || field === "stock" ? Number(value) : value;
      await api.updateProduct(token, product.id, { [field]: parsed });
      load();
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`¿Eliminar "${product.articulo}"?`)) return;
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
        <table className="products-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Artículo</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.lowStock ? "low-stock-row" : ""}>
                <td>{p.codigo}</td>
                <td>
                  <input
                    className="cell-input"
                    value={p.articulo}
                    onChange={(e) => handleFieldChange(p, "articulo", e.target.value)}
                    onBlur={(e) => handleFieldBlur(p, "articulo", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={p.categoria}
                    onChange={(e) => handleFieldChange(p, "categoria", e.target.value)}
                    onBlur={(e) => handleFieldBlur(p, "categoria", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="cell-input cell-number"
                    type="number"
                    step="0.01"
                    value={p.precio}
                    onChange={(e) => handleFieldChange(p, "precio", e.target.value)}
                    onBlur={(e) => handleFieldBlur(p, "precio", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="cell-input cell-number"
                    type="number"
                    value={p.stock}
                    onChange={(e) => handleFieldChange(p, "stock", e.target.value)}
                    onBlur={(e) => handleFieldBlur(p, "stock", e.target.value)}
                  />
                </td>
                <td>
                  <button className="btn-danger" onClick={() => handleDelete(p)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No hay productos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
