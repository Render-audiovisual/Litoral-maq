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

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  res.json({ ...product, lowStock: product.stock < LOW_STOCK_THRESHOLD });
});

router.use(requireAuth);

router.post("/", async (req, res) => {
  const { codigo, articulo, precio, stock, categoria, fotoUrl } = req.body || {};

  if (!codigo || !articulo || precio == null || !categoria) {
    return res.status(400).json({ error: "codigo, articulo, precio y categoria son requeridos" });
  }

  const stockInicial = Number(stock) || 0;

  try {
    const product = await prisma.product.create({
      data: {
        codigo: String(codigo),
        articulo: String(articulo),
        precio: Number(precio),
        stock: stockInicial,
        categoria: String(categoria),
        fotoUrl: fotoUrl || null,
      },
    });

    if (stockInicial > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          tipo: "entrada",
          cantidad: stockInicial,
          stockAnterior: 0,
          stockNuevo: stockInicial,
          motivo: "Alta de producto — carga inicial",
          usuario: req.user?.username || null,
        },
      });
    }

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
  const { codigo, articulo, precio, categoria, fotoUrl } = req.body || {};

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(codigo !== undefined && { codigo: String(codigo) }),
        ...(articulo !== undefined && { articulo: String(articulo) }),
        ...(precio !== undefined && { precio: Number(precio) }),
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

const TIPOS_MOVIMIENTO = ["entrada", "salida", "ajuste"];

router.post("/:id/movimientos", async (req, res) => {
  const id = Number(req.params.id);
  const { tipo, valor, motivo } = req.body || {};

  if (!TIPOS_MOVIMIENTO.includes(tipo)) {
    return res.status(400).json({ error: "Tipo de movimiento inválido (entrada, salida o ajuste)" });
  }

  const valorNum = Number(valor);
  if (!Number.isInteger(valorNum) || (tipo !== "ajuste" && valorNum <= 0) || (tipo === "ajuste" && valorNum < 0)) {
    return res.status(400).json({ error: "Valor inválido para el movimiento" });
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  const stockAnterior = product.stock;
  let stockNuevo;
  if (tipo === "entrada") stockNuevo = stockAnterior + valorNum;
  if (tipo === "salida") stockNuevo = stockAnterior - valorNum;
  if (tipo === "ajuste") stockNuevo = valorNum;

  if (stockNuevo < 0) {
    return res.status(400).json({ error: "No hay stock suficiente para esa salida" });
  }

  const [, movimiento] = await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { stock: stockNuevo } }),
    prisma.stockMovement.create({
      data: {
        productId: id,
        tipo,
        cantidad: stockNuevo - stockAnterior,
        stockAnterior,
        stockNuevo,
        motivo: motivo ? String(motivo).trim() : null,
        usuario: req.user?.username || null,
      },
    }),
  ]);

  res.status(201).json(movimiento);
});

router.get("/:id/movimientos", async (req, res) => {
  const id = Number(req.params.id);
  const movimientos = await prisma.stockMovement.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(movimientos);
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
      if (stock !== existing.stock) {
        await prisma.stockMovement.create({
          data: {
            productId: existing.id,
            tipo: "ajuste",
            cantidad: stock - existing.stock,
            stockAnterior: existing.stock,
            stockNuevo: stock,
            motivo: "Importación CSV",
            usuario: req.user?.username || null,
          },
        });
      }
      updated += 1;
    } else {
      const created_ = await prisma.product.create({
        data: { codigo, articulo, precio, categoria, stock },
      });
      if (stock > 0) {
        await prisma.stockMovement.create({
          data: {
            productId: created_.id,
            tipo: "entrada",
            cantidad: stock,
            stockAnterior: 0,
            stockNuevo: stock,
            motivo: "Importación CSV — carga inicial",
            usuario: req.user?.username || null,
          },
        });
      }
      created += 1;
    }
  }

  res.json({ created, updated, errors });
});

router.get("/movimientos/recientes", async (req, res) => {
  const movimientos = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: { select: { codigo: true, articulo: true } } },
  });
  res.json(movimientos);
});

module.exports = router;
