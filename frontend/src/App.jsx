import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

import PublicLayout from "./components/PublicLayout.jsx";
import AdminLayout from "./components/AdminLayout.jsx";

import Home from "./pages/Home.jsx";
import Catalog from "./pages/Catalog.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import Checkout from "./pages/Checkout.jsx";
import Login from "./pages/Login.jsx";

import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminProducts from "./pages/AdminProducts.jsx";
import AdminProductForm from "./pages/AdminProductForm.jsx";
import AdminStock from "./pages/AdminStock.jsx";
import AdminPhotoUpload from "./pages/AdminPhotoUpload.jsx";

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* ---------- Sitio público ---------- */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/productos" element={<Catalog />} />
        <Route path="/productos/:categoria" element={<Catalog />} />
        <Route path="/producto/:id" element={<ProductDetail />} />
        <Route path="/checkout" element={<Checkout />} />
      </Route>

      {/* ---------- Login ---------- */}
      <Route path="/admin/login" element={<Login />} />

      {/* ---------- Panel de administración ---------- */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="productos" element={<AdminProducts />} />
        <Route path="productos/nuevo" element={<AdminProductForm />} />
        <Route path="productos/:id/editar" element={<AdminProductForm />} />
        <Route path="stock" element={<AdminStock />} />
        <Route path="fotos" element={<AdminPhotoUpload />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
