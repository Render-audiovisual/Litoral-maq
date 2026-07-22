require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.locals.adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "cambiar123", 10);

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Litoral Maq backend escuchando en el puerto ${port}`);
});
