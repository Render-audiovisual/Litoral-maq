import React from "react";
import { Link } from "react-router-dom";

const WHATSAPP = import.meta.env.VITE_WHATSAPP_PHONE || "";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span className="site-logo-mark">LM</span>
          <div>
            <strong>Litoral Maq</strong>
            <p>Herramientas, maquinaria y soldadura para tu obra o taller.</p>
          </div>
        </div>

        <div className="site-footer-col">
          <h4>Navegación</h4>
          <Link to="/">Inicio</Link>
          <Link to="/productos">Catálogo</Link>
          <Link to="/checkout">Mi carrito</Link>
        </div>

        <div className="site-footer-col">
          <h4>Contacto</h4>
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <span>Lun a Vie · 8 a 18 hs</span>
          <span>Sábados · 8 a 13 hs</span>
        </div>

        <div className="site-footer-col">
          <h4>Cómo comprar</h4>
          <span>Pedidos por WhatsApp</span>
          <span>Retiro en local</span>
          <span>Envíos a domicilio</span>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} Litoral Maq. Todos los derechos reservados.</span>
        <Link to="/admin/login" className="site-footer-admin">
          Acceso administración
        </Link>
      </div>
    </footer>
  );
}
