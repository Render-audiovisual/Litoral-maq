import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";

export default function AdminStock() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    loadData();
  }, []);

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

  const filteredProducts = useMemo(() => {
    let result = products;

    if (categoriaFiltro) {
      result = result.filter((p) => p.categoria === categoriaFiltro);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.articulo.toLowerCase().includes(searchLower) ||
          p.codigo.toString().includes(searchLower)
      );
    }

    return result.sort((a, b) => {
      if (a.categoria !== b.categoria) {
        return a.categoria.localeCompare(b.categoria);
      }
      return a.articulo.localeCompare(b.articulo);
    });
  }, [products, categoriaFiltro, search]);

  const handleStockClick = (product) => {
    setEditingId(product.id);
    setEditingValue(product.stock.toString());
  };

  const handleStockSave = async (productId) => {
    const newStock = Number(editingValue);
    if (isNaN(newStock) || newStock < 0) {
      setError("Stock inválido");
      return;
    }

    try {
      await api.updateProduct(token, productId, { stock: newStock });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
      );
      setEditingId(null);
      setEditingValue("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStockCancel = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const handleKeyDown = (e, productId) => {
    if (e.key === "Enter") {
      handleStockSave(productId);
    } else if (e.key === "Escape") {
      handleStockCancel();
    }
  };

  const getStockClass = (stock) => {
    if (stock === 0) return "stock-empty";
    if (stock <= 5) return "stock-low";
    return "";
  };

  const getStockDisplay = (stock) => {
    return stock === 0 ? "Sin stock" : stock;
  };

  return (
    <div className="admin-stock-page">
      <div className="page-header">
        <h1>Gestión de Stock</h1>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <div className="stock-controls">
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="category-select"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="loading">Cargando productos...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="empty-state">No se encontraron productos.</p>
      ) : (
        <div className="table-container">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Nombre</th>
                <th>Código</th>
                <th>Precio</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className="categoria">{product.categoria}</td>
                  <td className="nombre">{product.articulo}</td>
                  <td className="codigo">{product.codigo}</td>
                  <td className="precio">
                    ${product.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    className={`stock ${getStockClass(product.stock)}`}
                    onDoubleClick={() => handleStockClick(product)}
                  >
                    {editingId === product.id ? (
                      <div className="stock-editor">
                        <input
                          type="number"
                          min="0"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, product.id)}
                          onBlur={() => handleStockSave(product.id)}
                          autoFocus
                          className="stock-input"
                        />
                      </div>
                    ) : (
                      <span className="stock-display">{getStockDisplay(product.stock)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="stock-info">
        <p>Total de productos: {filteredProducts.length}</p>
        <p className="low-stock-info">
          Productos con stock bajo (≤5):{" "}
          <strong>{filteredProducts.filter((p) => p.stock <= 5 && p.stock > 0).length}</strong>
        </p>
        <p className="empty-stock-info">
          Productos sin stock (0):{" "}
          <strong>{filteredProducts.filter((p) => p.stock === 0).length}</strong>
        </p>
      </div>
    </div>
  );
}
