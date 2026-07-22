# Litoral Maq — Sistema de gestión

Proyecto separado de "SISTEMA RENDER". Etapa 1: panel de administración de
productos y stock para Gonzalo (login simple, tabla editable, alerta de
stock bajo, importación desde el Google Sheet actual vía CSV).

## Estructura

- `backend/` — API en Express + Prisma (SQLite en desarrollo).
- `frontend/` — Panel de administración en React + Vite.

## Requisitos

Necesitás Node.js instalado (v18 o superior) y npm. Este entorno de
desarrollo no tiene Node instalado, así que estos pasos hay que correrlos
en tu máquina o directamente en Render.

## Backend

```bash
cd backend
cp .env.example .env      # editar ADMIN_USER / ADMIN_PASSWORD / JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run dev                # http://localhost:4000
```

Usuario y contraseña del admin se configuran por variables de entorno
(`ADMIN_USER`, `ADMIN_PASSWORD`) — no hay tabla de usuarios todavía, es un
solo admin (Gonzalo) para esta etapa.

## Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL apuntando al backend, VITE_WHATSAPP_PHONE con el número de Gonzalo
npm install
npm run dev                # http://localhost:5173
```

URLs:
- `http://localhost:5173/` → catálogo público (clientes)
- `http://localhost:5173/checkout` → carrito de compras
- `http://localhost:5173/admin` → panel de productos (protegido, requiere login)
- `http://localhost:5173/admin/login` → login para Gonzalo

## Importar los productos del Google Sheet actual

1. En el Sheet, `Archivo > Descargar > Valores separados por comas (.csv)`.
2. Asegurate de que las columnas se llamen `CODIGO`, `ARTICULO`, `PRECIO`
   (y opcionalmente `STOCK`, `CATEGORIA` si ya las agregaste).
3. En el panel, botón "Importar CSV" y elegí el archivo. Si un código ya
   existe, se actualiza; si no, se crea.
4. Como el stock hoy no está en el Sheet, después de importar hay que
   completar el stock producto por producto en la tabla (click y editar).

## Deploy a Render (gratis)

Este repo incluye un `render.yaml` (Blueprint) que crea de una sola vez la
base Postgres, el backend y el frontend. En el dashboard de Render:
"New" → "Blueprint" → conectar este repo de GitHub → Render lee
`render.yaml` y muestra los 3 recursos a crear.

Variables que Render va a pedir a mano (marcadas `sync: false` en el
blueprint, porque son secretos/config específica de cada quien):
- Backend: `ADMIN_USER`, `ADMIN_PASSWORD`, `CORS_ORIGIN` (la URL del
  frontend una vez creado, ej. `https://litoral-maq-frontend.onrender.com`).
- Frontend: `VITE_API_URL` (la URL del backend + `/api`, ej.
  `https://litoral-maq-backend.onrender.com/api`), `VITE_WHATSAPP_PHONE`.

`DATABASE_URL` y `JWT_SECRET` los genera Render automáticamente.

Nota técnica: producción usa Postgres, no SQLite. Por eso existe
`backend/prisma/schema.production.prisma` (idéntico a `schema.prisma`
pero con `provider = "postgresql"`) — el build command del backend lo
usa explícitamente. El `schema.prisma` normal sigue siendo SQLite y es
el que se usa en desarrollo local; no hace falta tocarlo.

Los 461 productos importados desde el Google Sheet viven solo en la base
local (SQLite, no se sube a git) — después del primer deploy hay que
volver a correr la importación CSV contra la base de producción desde el
panel admin ya en Render.

## Próximas etapas

1. ~~Panel de productos y stock~~ (Etapa 1)
2. ~~Catálogo web público + carrito + checkout por WhatsApp~~ (Etapa 2 — esta etapa)
   - `/` → catálogo público con búsqueda y filtro por categoría
   - `/checkout` → carrito editable, datos de cliente, opción retiro/envío
   - "Enviar pedido por WhatsApp" abre chat pre-armado con detalle del pedido
   - Número de WhatsApp configurable en `VITE_WHATSAPP_PHONE` (.env)
3. Mercado Pago + integración con catálogo de Meta
# Litoral-maq
