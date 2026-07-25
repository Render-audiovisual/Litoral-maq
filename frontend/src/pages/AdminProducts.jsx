import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

const LOW_STOCK_THRESHOLD = 5;

function formatMoney(value) {
  return `$${value.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export default function AdminProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const visibleProducts = useMemo(() => {
    if (estadoFiltro === "activos") return products.filter((p) => p.activo !== false);
    if (estadoFiltro === "inactivos") return products.filter((p) => p.activo === false);
    return products;
  }, [products, estadoFiltro]);

  const handleToggleActivo = async (product) => {
    try {
      await api.updateProduct(token, product.id, { activo: !product.activo });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (product) => {
    if (
      !confirm(
        `¿Eliminar "${product.articulo}" definitivamente? Se borra también su historial de movimientos. Si preferís conservarlo, usá "Desactivar".`
      )
    ) {
      return;
    }
    try {
      await api.deleteProduct(token, product.id);
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

  return (
    <div className="admin-products-page">
      <div className="page-header">
        <div>
          <h1>Productos</h1>
          <p className="page-subtitle">
            Alta, edición y baja de artículos del catálogo.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Importar CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleImportFile} />
          <Link to="/admin/productos/nuevo" className="btn-primary">
            + Nuevo producto
          </Link>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      {importSummary && (
        <p className="import-summary">
          Importación: {importSummary.created} creados, {importSummary.updated} actualizados
          {importSummary.errors.length > 0 && `, ${importSummary.errors.length} con errores`}.
        </p>
      )}

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

        <select
          className="category-select"
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
        >
          <option value="todos">Todos los estados</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>
      </div>

      {loading ? (
        <p className="loading">Cargando productos...</p>
      ) : visibleProducts.length === 0 ? (
        <p className="empty-state">No hay productos que coincidan con los filtros.</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Código</th>
                <th>Categoría</th>
                <th className="col-right">Precio</th>
                <th className="col-center">Stock</th>
                <th className="col-center">Estado</th>
                <th className="col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((p) => (
                <tr key={p.id} className={p.activo === false ? "row-inactive" : ""}>
                  <td className="cell-strong">
                    {p.articulo}
                    {p.marca && <small className="cell-sub">{p.marca}</small>}
                  </td>
                  <td className="cell-mono">{p.codigo}</td>
                  <td className="cell-muted">{p.categoria}</td>
                  <td className="col-right">{formatMoney(p.precio)}</td>
                  <td className="col-center">
                    <span
                      className={
                        p.stock === 0
                          ? "badge-danger"
                          : p.stock <= LOW_STOCK_THRESHOLD
                          ? "badge-warning"
                          : "badge-neutral"
                      }
                    >
                      {p.stock === 0 ? "Sin stock" : p.stock}
                    </span>
                  </td>
                  <td className="col-center">
                    <span className={p.activo === false ? "badge-muted" : "badge-success"}>
                      {p.activo === false ? "Inactivo" : "Activo"}
                    </span>
                  </td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <Link to={`/admin/productos/${p.id}/editar`} className="btn-row">
                        Editar
                      </Link>
                      <button className="btn-row" onClick={() => handleToggleActivo(p)}>
                        {p.activo === false ? "Activar" : "Desactivar"}
                      </button>
                      <button className="btn-row btn-row-danger" onClick={() => handleDelete(p)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="table-footnote">
        Mostrando {visibleProducts.length} de {products.length} productos.
      </p>
    </div>
  );
}
