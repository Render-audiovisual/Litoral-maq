const express = require("express");
const prisma = require("../prismaClient");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const LOW_STOCK_THRESHOLD = 5;

router.get("/", async (req, res) => {
  const { search, categoria } = req.query;

  const where = {
    AND: [
      categoria ? { categoria } : {},
      search
        ? {
            OR: [
              { articulo: { contains: String(search) } },
              { codigo: { contains: String(search) } },
            ],
          }
        : {},
    ],
  };

  const products = await prisma.product.findMany({
    where,
    orderBy: { articulo: "asc" },
  });

  res.json(products.map((p) => ({ ...p, lowStock: p.stock < LOW_STOCK_THRESHOLD })));
});

router.get("/categorias", async (req, res) => {
  const rows = await prisma.product.findMany({
    distinct: ["categoria"],
    select: { categoria: true },
    orderBy: { categoria: "asc" },
  });
  res.json(rows.map((r) => r.categoria));
});

router.use(requireAuth);

router.post("/", async (req, res) => {
  const { codigo, articulo, precio, stock, categoria, fotoUrl } = req.body || {};

  if (!codigo || !articulo || precio == null || !categoria) {
    return res.status(400).json({ error: "codigo, articulo, precio y categoria son requeridos" });
  }

  try {
    const product = await prisma.product.create({
      data: {
        codigo: String(codigo),
        articulo: String(articulo),
        precio: Number(precio),
        stock: Number(stock) || 0,
        categoria: String(categoria),
        fotoUrl: fotoUrl || null,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ya existe un producto con ese código" });
    }
    res.status(500).json({ error: "Error al crear el producto" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { codigo, articulo, precio, stock, categoria, fotoUrl } = req.body || {};

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(codigo !== undefined && { codigo: String(codigo) }),
        ...(articulo !== undefined && { articulo: String(articulo) }),
        ...(precio !== undefined && { precio: Number(precio) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(categoria !== undefined && { categoria: String(categoria) }),
        ...(fotoUrl !== undefined && { fotoUrl }),
      },
    });
    res.json(product);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.status(500).json({ error: "Error al actualizar el producto" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    await prisma.product.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});

router.post("/import", async (req, res) => {
  const { rows } = req.body || {};

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "No se recibieron filas para importar" });
  }

  let created = 0;
  let updated = 0;
  const errors = [];

  for (const row of rows) {
    const codigo = String(row.codigo || "").trim();
    const articulo = String(row.articulo || "").trim();
    const precio = Number(row.precio);
    const categoria = String(row.categoria || "Sin categoría").trim();
    const stock = Number(row.stock) || 0;

    if (!codigo || !articulo || Number.isNaN(precio)) {
      errors.push({ row, reason: "Faltan datos requeridos o precio inválido" });
      continue;
    }

    const existing = await prisma.product.findUnique({ where: { codigo } });

    if (existing) {
      await prisma.product.update({
        where: { codigo },
        data: { articulo, precio, categoria, stock },
      });
      updated += 1;
    } else {
      await prisma.product.create({
        data: { codigo, articulo, precio, categoria, stock },
      });
      created += 1;
    }
  }

  res.json({ created, updated, errors });
});

module.exports = router;
