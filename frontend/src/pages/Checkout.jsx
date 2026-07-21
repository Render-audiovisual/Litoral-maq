import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, updateQuantity, removeFromCart, clearCart } = useCart();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState("retiro");
  const [direccion, setDireccion] = useState("");
  const [error, setError] = useState("");

  if (items.length === 0) {
    return (
      <div className="checkout-page">
        <header className="checkout-header">
          <button className="btn-back" onClick={() => navigate("/")}>
            ← Volver al catálogo
          </button>
          <h1>Carrito</h1>
        </header>
        <p className="empty-state">Tu carrito está vacío.</p>
      </div>
    );
  }

  const handleSubmitOrder = () => {
    if (!nombre.trim()) {
      setError("Por favor ingresá tu nombre");
      return;
    }
    if (!telefono.trim()) {
      setError("Por favor ingresá tu teléfono");
      return;
    }
    if (tipoEntrega === "envio" && !direccion.trim()) {
      setError("Por favor ingresá tu dirección de envío");
      return;
    }

    const itemsText = items
      .map((i) => `${i.cantidad}x ${i.articulo} - $${i.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`)
      .join("\n");

    const mensaje = `Hola, me gustaría hacer un pedido:

${itemsText}

*Total: $${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}*

*Mi datos:*
Nombre: ${nombre}
Teléfono: ${telefono}
Tipo de entrega: ${tipoEntrega === "retiro" ? "Retiro en local" : "Envío a domicilio"}
${tipoEntrega === "envio" ? `Dirección: ${direccion}\n` : ""}
¡Gracias!`;

    const encoded = encodeURIComponent(mensaje);
    const whatsappPhone = import.meta.env.VITE_WHATSAPP_PHONE || "5493624123456";
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encoded}`;

    clearCart();
    window.open(whatsappUrl, "_blank");
    navigate("/");
  };

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <button className="btn-back" onClick={() => navigate("/")}>
          ← Volver al catálogo
        </button>
        <h1>Carrito</h1>
      </header>

      <div className="checkout-container">
        <div className="checkout-items">
          <h2>Tu pedido</h2>
          <table className="checkout-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Cantidad</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.articulo}</td>
                  <td>${i.precio.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={i.cantidad}
                      onChange={(e) => updateQuantity(i.id, Number(e.target.value))}
                      className="qty-input"
                    />
                  </td>
                  <td>${(i.precio * i.cantidad).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                  <td>
                    <button
                      className="btn-small"
                      onClick={() => removeFromCart(i.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="checkout-total">
            <h3>Total: ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="checkout-form">
          <h2>Tus datos</h2>

          <label>
            Nombre completo
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez"
            />
          </label>

          <label>
            Teléfono / WhatsApp
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="123456789"
            />
          </label>

          <fieldset>
            <legend>Tipo de entrega</legend>
            <label>
              <input
                type="radio"
                value="retiro"
                checked={tipoEntrega === "retiro"}
                onChange={(e) => setTipoEntrega(e.target.value)}
              />
              Retiro en el local
            </label>
            <label>
              <input
                type="radio"
                value="envio"
                checked={tipoEntrega === "envio"}
                onChange={(e) => setTipoEntrega(e.target.value)}
              />
              Envío a domicilio
            </label>
          </fieldset>

          {tipoEntrega === "envio" && (
            <label>
              Dirección de envío
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle 123, Departamento B"
              />
            </label>
          )}

          {error && <p className="error">{error}</p>}

          <button className="btn-primary btn-large" onClick={handleSubmitOrder}>
            Enviar pedido por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
