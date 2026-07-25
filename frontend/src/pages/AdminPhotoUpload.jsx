import React, { useEffect, useMemo, useState } from "react";
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
    if (!order[idx].hasFoto) return idx;
  }
  return -1;
}

export default function AdminPhotoUpload() {
  const { token } = useAuth();
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

  const pendingCount = useMemo(() => order.filter((p) => !p.hasFoto).length, [order]);
  const current = cursorIndex >= 0 && cursorIndex < order.length ? order[cursorIndex] : null;

  useEffect(() => {
    // La foto existente se muestra desde el endpoint; una recién elegida, como data URL.
    setPreview(current?.hasFoto ? api.fotoUrl(current) : null);
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

  // Solo hay algo nuevo para guardar si el preview es un data URL recién elegido
  // (la foto ya guardada se muestra como URL del endpoint, no hay que re-subirla).
  const hasNewPhoto = Boolean(preview && preview.startsWith("data:"));

  const handleSaveAndNext = async () => {
    if (!current || !hasNewPhoto) return;
    setSaving(true);
    setError("");
    try {
      await api.updateProduct(token, current.id, { fotoUrl: preview });
      setOrder((prev) => prev.map((p) => (p.id === current.id ? { ...p, hasFoto: true } : p)));
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
      setOrder((prev) => prev.map((p) => (p.id === current.id ? { ...p, hasFoto: false } : p)));
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
      <div className="page-header">
        <div>
          <h1>Carga de fotos</h1>
          <p className="page-subtitle">
            Subí imágenes de los productos directamente desde el celular.
          </p>
        </div>
      </div>

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
                  {p.hasFoto ? " ✓" : ""}
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
            disabled={saving || !hasNewPhoto}
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
            {current.hasFoto && (
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
