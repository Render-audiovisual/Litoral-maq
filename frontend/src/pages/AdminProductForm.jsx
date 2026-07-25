import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import { compressImage } from "../utils/image.js";

const emptyForm = {
  codigo: "",
  articulo: "",
  marca: "",
  categoria: "",
  precio: "",
  stock: "",
  activo: true,
  // undefined = sin cambios (no se manda), null = quitar, "data:..." = foto nueva
  fotoUrl: undefined,
  fotoActualUrl: null,
};

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getCategorias(token)
      .then(setCategorias)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    api
      .getProduct(id)
      .then((p) =>
        setForm({
          codigo: p.codigo,
          articulo: p.articulo,
          marca: p.marca || "",
          categoria: p.categoria,
          precio: String(p.precio),
          stock: String(p.stock),
          activo: p.activo !== false,
          fotoUrl: undefined,
          fotoActualUrl: p.hasFoto ? api.fotoUrl(p) : null,
        })
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setField("fotoUrl", dataUrl);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      codigo: form.codigo.trim(),
      articulo: form.articulo.trim(),
      marca: form.marca.trim(),
      categoria: form.categoria.trim(),
      precio: Number(form.precio),
      activo: form.activo,
      // Solo se manda si el usuario la cambió; undefined la deja como está.
      ...(form.fotoUrl !== undefined && { fotoUrl: form.fotoUrl }),
    };

    try {
      if (isEdit) {
        // El stock de un producto existente solo cambia por movimientos.
        await api.updateProduct(token, id, payload);
      } else {
        await api.createProduct(token, { ...payload, stock: Number(form.stock) || 0 });
      }
      navigate("/admin/productos");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${form.articulo}" definitivamente? Se borra su historial de movimientos.`)) {
      return;
    }
    setSaving(true);
    try {
      await api.deleteProduct(token, id);
      navigate("/admin/productos");
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) return <p className="loading">Cargando producto...</p>;

  return (
    <div className="product-form-page">
      <div className="page-header">
        <div>
          <Link to="/admin/productos" className="link-back">
            ← Volver a productos
          </Link>
          <h1>{isEdit ? "Editar producto" : "Nuevo producto"}</h1>
          <p className="page-subtitle">
            {isEdit
              ? "Actualizá los datos del artículo y guardá los cambios."
              : "Cargá un artículo nuevo al catálogo."}
          </p>
        </div>
      </div>

      {error && <p className="error-banner">{error}</p>}

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="form-card">
          <h2>Información general</h2>

          <div className="form-grid">
            <label className="form-field">
              <span>Código *</span>
              <input
                value={form.codigo}
                onChange={(e) => setField("codigo", e.target.value)}
                placeholder="3403"
                required
              />
            </label>

            <label className="form-field form-field-wide">
              <span>Nombre del artículo *</span>
              <input
                value={form.articulo}
                onChange={(e) => setField("articulo", e.target.value)}
                placeholder="ALAMBRE MIG GAS LESS X 1 KG"
                required
              />
            </label>

            <label className="form-field">
              <span>Marca</span>
              <input
                value={form.marca}
                onChange={(e) => setField("marca", e.target.value)}
                placeholder="Opcional"
              />
            </label>

            <label className="form-field">
              <span>Categoría *</span>
              <input
                value={form.categoria}
                onChange={(e) => setField("categoria", e.target.value)}
                list="categorias-existentes"
                placeholder="Soldadura"
                required
              />
              <datalist id="categorias-existentes">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
          </div>
        </div>

        <div className="form-card">
          <h2>Precio y stock</h2>

          <div className="form-grid">
            <label className="form-field">
              <span>Precio *</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.precio}
                onChange={(e) => setField("precio", e.target.value)}
                placeholder="10000.00"
                required
              />
            </label>

            {isEdit ? (
              <div className="form-field">
                <span>Stock actual</span>
                <p className="form-field-readonly">
                  {form.stock} unidades
                  <Link to="/admin/stock">Ajustar en Stock</Link>
                </p>
              </div>
            ) : (
              <label className="form-field">
                <span>Stock inicial</span>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setField("stock", e.target.value)}
                  placeholder="0"
                />
              </label>
            )}

            <label className="form-field form-field-checkbox">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setField("activo", e.target.checked)}
              />
              <span>Visible en el sitio público</span>
            </label>
          </div>
        </div>

        <div className="form-card">
          <h2>Imagen</h2>

          <div className="form-image-row">
            <div className="form-image-preview">
              {form.fotoUrl ? (
                <img src={form.fotoUrl} alt={form.articulo || "Producto"} />
              ) : form.fotoUrl === undefined && form.fotoActualUrl ? (
                <img src={form.fotoActualUrl} alt={form.articulo || "Producto"} />
              ) : (
                <span className="form-image-empty">Sin imagen</span>
              )}
            </div>

            <div className="form-image-actions">
              <label className="btn-secondary file-label">
                Elegir imagen
                <input type="file" accept="image/*" hidden onChange={handleImageFile} />
              </label>
              {(form.fotoUrl || (form.fotoUrl === undefined && form.fotoActualUrl)) && (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setField("fotoUrl", null)}
                >
                  Quitar imagen
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary btn-large" disabled={saving}>
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
          </button>
          <Link to="/admin/productos" className="btn-secondary">
            Cancelar
          </Link>
          {isEdit && (
            <button
              type="button"
              className="btn-danger form-delete"
              onClick={handleDelete}
              disabled={saving}
            >
              Eliminar producto
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
