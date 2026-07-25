require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

app.locals.adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "cambiar123", 10);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// El límite va por router: products recibe fotos en base64 e importaciones de CSV,
// el resto no tiene por qué aceptar cuerpos grandes.
app.use("/api/auth", express.json({ limit: "10kb" }), authRoutes);
app.use("/api/products", express.json({ limit: "12mb" }), productRoutes);

app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: "El contenido es demasiado grande. Si es una foto, probá con una más chica.",
    });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo de la petición no es JSON válido" });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Litoral Maq backend escuchando en el puerto ${port}`);
});
