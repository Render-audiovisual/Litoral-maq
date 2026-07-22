const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Error de red");
  }

  return data;
}

export const api = {
  login: (username, password) => request("/auth/login", { method: "POST", body: { username, password } }),
  getProducts: (token, { search, categoria } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoria) params.set("categoria", categoria);
    const qs = params.toString();
    return request(`/products${qs ? `?${qs}` : ""}`, { ...(token ? { token } : {}) });
  },
  getCategorias: (token) => request("/products/categorias", { ...(token ? { token } : {}) }),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (token, data) => request("/products", { method: "POST", body: data, token }),
  updateProduct: (token, id, data) => request(`/products/${id}`, { method: "PUT", body: data, token }),
  deleteProduct: (token, id) => request(`/products/${id}`, { method: "DELETE", token }),
  importProducts: (token, rows) => request("/products/import", { method: "POST", body: { rows }, token }),
  createMovement: (token, id, data) =>
    request(`/products/${id}/movimientos`, { method: "POST", body: data, token }),
  getMovements: (token, id) => request(`/products/${id}/movimientos`, { token }),
  getRecentMovements: (token) => request("/products/movimientos/recientes", { token }),
};
