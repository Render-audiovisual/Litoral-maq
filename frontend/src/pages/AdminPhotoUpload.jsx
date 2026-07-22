import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import { compressImage } from "../utils/image.js";

function sortProducts(products) {
  return [...products].sort((a, b) => {
    const cat = a.categoria.localeCompare(b.categoria, "es");
    if (cat !== 0) return cat;
    return a.articulo.localeCompare(b.articulo, "es");
  });
}

function findNextPending(order, fromIndex, direction) {
  const n = order.length;
  if (n === 0) return -1;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + direction * step + n * 10) % n;
    if (!order[idx].fotoUrl) return idx;
  }
  return -1;
}

export default function AdminPhotoUpload() {
  const { token, username, logout } = useAuth();
  const [order, setOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cursorIndex, setCursorIndex] = useState(-1);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .getProducts(token, {})
      .then((data) => {
        const sorted = sortProducts(data);
        setOrder(sorted);
        const start = findNextPending(sorted, -1, 1);
        setCursorIndex(start === -1 ? 0 : start);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const pendingCount = useMemo(() => order.filter((p) => !p.fotoUrl).length, [order]);
  const current = cursorIndex >= 0 && cursorIndex < order.length ? order[cursorIndex] : null;

  useEffect(() => {
    setPreview(current?.fotoUrl || null);
  }, [current?.id]);

  const searchMatches = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return order
      .filter((p) => p.codigo.toLowerCase().includes(q) || p.articulo.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, order]);

  const jumpTo = (product) => {
    const idx = order.findIndex((p) => p.id === product.id);
    if (idx !== -1) setCursorIndex(idx);
    setSearch("");
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
    } catch (err) {
      setError(err.message);
    }
  };

  const goNextPending = () => {
    setCursorIndex((idx) => {
      const next = findNextPending(order, idx, 1);
      return next === -1 ? idx : next;
    });
  };

  const goPrevious = () => {
    setCursorIndex((idx) => Math.max(0, idx - 1));
  };

  const handleSaveAndNext = async () => {
    if (!current || !preview) return;
    setSaving(true);
    setError("");
    try {
      await api.updateProduct(token, current.id, { fotoUrl: preview });
      setOrder((prev) => prev.map((p) => (p.id === current.id ? { ...p, fotoUrl: preview } : p)));
      goNextPending();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!current) return;
    setSaving(true);
    setError("");
    try {
      await api.updateProduct(token, current.id, { fotoUrl: null });
      setOrder((prev) => prev.map((p) => (p.id === current.id ? { ...p, fotoUrl: null } : p)));
      setPreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="loading">Cargando...</p>;

  const allDone = pendingCount === 0;

  return (
    <div className="photo-upload-page">
      <header className="admin-header">
        <div>
          <h1>Litoral Maq</h1>
          <p className="subtitle">Carga rápida de fotos</p>
        </div>
        <div className="admin-header-right">
          <span>Hola, {username}</span>
          <button className="btn-secondary" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <Link to="/admin" className="btn-back">
        ← Volver al panel
      </Link>

      <p className="photo-progress">
        {pendingCount} de {order.length} productos sin foto
      </p>

      <div className="photo-search">
        <input
          type="text"
          placeholder="Buscar producto por código o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searchMatches.length > 0 && (
          <ul className="photo-search-results">
            {searchMatches.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => jumpTo(p)}>
                  <span className="product-code">{p.codigo}</span> {p.articulo}
                  {p.fotoUrl ? " ✓" : ""}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {allDone && <p className="photo-done">🎉 Todos los productos tienen foto.</p>}

      {current ? (
        <div className="photo-card">
          <p className="photo-card-category">{current.categoria}</p>
          <h2>{current.articulo}</h2>
          <p className="photo-card-code">
            Código: {current.codigo}
            {current.marca && ` · ${current.marca}`}
          </p>

          {preview ? (
            <img className="photo-card-preview" src={preview} alt={current.articulo} />
          ) : (
            <div className="photo-card-preview photo-card-preview-empty">Sin foto</div>
          )}

          <label className="photo-card-file-label">
            {preview ? "Cambiar foto" : "Sacar / elegir foto"}
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />
          </label>

          <button
            className="btn-primary btn-large"
            onClick={handleSaveAndNext}
            disabled={saving || !preview}
          >
            {saving ? "Guardando..." : "Guardar y siguiente"}
          </button>

          <div className="photo-card-secondary-actions">
            <button className="btn-secondary" onClick={goPrevious} disabled={cursorIndex === 0}>
              ← Anterior
            </button>
            <button className="btn-secondary" onClick={goNextPending} disabled={saving}>
              Saltar →
            </button>
            {current.fotoUrl && (
              <button className="btn-danger" onClick={handleRemovePhoto} disabled={saving}>
                Quitar foto
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="empty-state">No hay productos.</p>
      )}
    </div>
  );
}
