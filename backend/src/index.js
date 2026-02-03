require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query, pool } = require("./db");
const { requireAuth, requireRole } = require("./auth");
const { auditMiddleware } = require("./audit");

const {
  PORT = 18081,
  JWT_SECRET,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} = process.env;

const ROLE_NAMES = [
  "Administrador del sistema",
  "Supervisor de call center",
  "Operador de call center",
  "Encargado de almacén",
  "Repartidor",
  "Jefe de logística",
];

const ACCESS = {
  customers: [
    "Administrador del sistema",
    "Supervisor de call center",
    "Operador de call center",
  ],
  products: [
    "Administrador del sistema",
    "Supervisor de call center",
    "Encargado de almacén",
  ],
  warehouses: [
    "Administrador del sistema",
    "Encargado de almacén",
  ],
  orders: [
    "Administrador del sistema",
    "Supervisor de call center",
    "Operador de call center",
  ],
  logistics: [
    "Administrador del sistema",
    "Jefe de logística",
    "Repartidor",
  ],
  reports: [
    "Administrador del sistema",
    "Supervisor de call center",
    "Jefe de logística",
  ],
  admin: ["Administrador del sistema"],
};

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

async function ensureBaseRoles() {
  for (const role of ROLE_NAMES) {
    const existing = await query("SELECT id FROM roles WHERE nombre = ?", [role]);
    if (existing.length === 0) {
      await query("INSERT INTO roles (nombre) VALUES (?)", [role]);
    }
  }
}

async function ensureAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return;
  }
  const users = await query("SELECT id FROM usuarios WHERE usuario = ?", [
    ADMIN_EMAIL,
  ]);
  if (users.length > 0) {
    return;
  }
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const result = await query(
    "INSERT INTO usuarios (nombre, usuario, hash_contrasena, activo) VALUES (?, ?, ?, 1)",
    ["Administrador", ADMIN_EMAIL, hash]
  );
  const [role] = await query("SELECT id FROM roles WHERE nombre = ?", [
    "Administrador del sistema",
  ]);
  if (role) {
    await query("INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (?, ?)", [
      result.insertId,
      role.id,
    ]);
  }
}

async function ensureOrderColumns() {
  const columns = await query(
    "SHOW COLUMNS FROM pedidos LIKE 'creado_por_usuario_id'"
  );
  if (columns.length === 0) {
    await query("ALTER TABLE pedidos ADD COLUMN creado_por_usuario_id INT NULL");
  }
  const fk = await query(
    "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pedidos' AND COLUMN_NAME = 'creado_por_usuario_id' AND REFERENCED_TABLE_NAME = 'usuarios'"
  );
  if (fk.length === 0) {
    await query(
      "ALTER TABLE pedidos ADD CONSTRAINT fk_pedidos_creado_por_usuario FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL"
    );
  }
}

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }
  const users = await query(
    "SELECT id, nombre as name, usuario as email, hash_contrasena, activo as is_active FROM usuarios WHERE usuario = ?",
    [email]
  );
  if (users.length === 0) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }
  const user = users[0];
  if (!user.is_active) {
    return res.status(403).json({ error: "Usuario inactivo" });
  }
  const ok = await bcrypt.compare(password, user.hash_contrasena);
  if (!ok) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }
  const roles = await query(
    "SELECT r.nombre as name FROM roles r JOIN usuarios_roles ur ON ur.rol_id = r.id WHERE ur.usuario_id = ?",
    [user.id]
  );
  const roleNames = roles.map((r) => r.name);
  const token = jwt.sign(
    { id: user.id, email: user.email, roles: roleNames },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, roles: roleNames },
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.use("/api/customers", requireAuth, auditMiddleware("customers"));
app.use("/api/products", requireAuth, auditMiddleware("products"));
app.use("/api/warehouses", requireAuth, auditMiddleware("warehouses"));
app.use("/api/orders", requireAuth, auditMiddleware("orders"));
app.use("/api/logistics", requireAuth, auditMiddleware("logistics"));
app.use("/api/reports", requireAuth, auditMiddleware("reports"));
app.use("/api/admin", requireAuth, auditMiddleware("admin"));

app.get("/api/driver/entregas", requireAuth, async (req, res) => {
  const roles = req.user?.roles || [];
  const isAdmin = roles.includes("Administrador del sistema");
  const baseQuery =
    "SELECT e.id, e.estado, e.programado_en, e.entregado_en, p.id as pedido_id, c.nombre_completo as cliente, r.nombre as repartidor, cam.placa as camion FROM entregas e JOIN pedidos p ON p.id = e.pedido_id JOIN clientes c ON c.id = p.cliente_id JOIN repartidores r ON r.id = e.repartidor_id JOIN camiones cam ON cam.id = e.camion_id";
  if (isAdmin) {
    const rows = await query(`${baseQuery} ORDER BY e.id DESC`);
    return res.json(rows);
  }
  const driverName = req.user?.name;
  if (!driverName) {
    return res.json([]);
  }
  const rows = await query(
    `${baseQuery} WHERE r.nombre = ? ORDER BY e.id DESC`,
    [driverName]
  );
  res.json(rows);
});

app.get("/api/driver/ventas", requireAuth, async (req, res) => {
  const roles = req.user?.roles || [];
  const isAdmin = roles.includes("Administrador del sistema");
  const baseQuery =
    "SELECT p.id as pedido_id, c.nombre_completo as cliente, cam.placa as camion, r.nombre as repartidor, e.estado as estado_entrega, e.entregado_en, SUM(oi.cantidad * oi.precio) as total FROM entregas e JOIN pedidos p ON p.id = e.pedido_id JOIN clientes c ON c.id = p.cliente_id JOIN items_pedido oi ON oi.pedido_id = p.id JOIN repartidores r ON r.id = e.repartidor_id JOIN camiones cam ON cam.id = e.camion_id WHERE (e.estado = 'Entregado' OR p.estado = 'Entregado')";
  if (isAdmin) {
    const rows = await query(
      `${baseQuery} GROUP BY p.id, c.nombre_completo, cam.placa, r.nombre, e.estado, e.entregado_en ORDER BY p.id DESC`
    );
    return res.json(rows);
  }
  const driverName = req.user?.name;
  if (!driverName) {
    return res.json([]);
  }
  const rows = await query(
    `${baseQuery} AND r.nombre = ? GROUP BY p.id, c.nombre_completo, cam.placa, r.nombre, e.estado, e.entregado_en ORDER BY p.id DESC`,
    [driverName]
  );
  res.json(rows);
});

app.get("/api/tipos-cliente", requireAuth, async (_req, res) => {
  const rows = await query(
    "SELECT id, nombre, descuento_unidades FROM tipos_cliente WHERE activo = 1 ORDER BY nombre"
  );
  res.json(rows);
});

app.get("/api/customers", requireRole(ACCESS.customers), async (_req, res) => {
  const rows = await query(
    "SELECT c.*, u.nombre as creado_por_nombre FROM clientes c LEFT JOIN usuarios u ON u.id = c.creado_por_usuario_id ORDER BY c.id DESC"
  );
  res.json(rows);
});

app.get("/api/customers/search", requireRole(ACCESS.orders), async (req, res) => {
  const { nombre, telefono, nit } = req.query || {};
  const conditions = [];
  const params = [];

  if (nombre) {
    conditions.push("nombre_completo LIKE ?");
    params.push(`%${nombre}%`);
  }
  if (telefono) {
    conditions.push("telefono_principal LIKE ?");
    params.push(`%${telefono}%`);
  }
  if (nit) {
    conditions.push("nit LIKE ?");
    params.push(`%${nit}%`);
  }

  if (conditions.length === 0) {
    return res.json([]);
  }

  const rows = await query(
    `SELECT id, nombre_completo, telefono_principal, nit, zona, direccion, tipo_cliente, notas FROM clientes WHERE ${conditions.join(
      " AND "
    )} ORDER BY nombre_completo LIMIT 20`,
    params
  );
  res.json(rows);
});

app.post("/api/customers", requireRole(ACCESS.customers), async (req, res) => {
  const {
    nombre_completo,
    telefono_principal,
    telefono_secundario,
    direccion,
    zona,
    datos_gps,
    tipo_cliente,
    razon_social,
    nit,
    estado,
    notas,
  } = req.body || {};
  if (!nombre_completo || !telefono_principal) {
    return res.status(400).json({ error: "Nombre y teléfono requeridos" });
  }
  const result = await query(
    "INSERT INTO clientes (nombre_completo, telefono_principal, telefono_secundario, direccion, zona, datos_gps, tipo_cliente, razon_social, nit, estado, notas, creado_por_usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      nombre_completo,
      telefono_principal,
      telefono_secundario || null,
      direccion || null,
      zona || null,
      datos_gps || null,
      tipo_cliente || null,
      razon_social || null,
      nit || null,
      estado || "Activo",
      notas || null,
      req.user?.id || null,
    ]
  );
  await req.audit({
    action: "CREATE",
    entityId: result.insertId,
    detail: nombre_completo,
  });
  res.status(201).json({ id: result.insertId });
});

app.get("/api/customers/:id", requireRole(ACCESS.customers), async (req, res) => {
  const [customer] = await query(
    "SELECT c.*, u.nombre as creado_por_nombre FROM clientes c LEFT JOIN usuarios u ON u.id = c.creado_por_usuario_id WHERE c.id = ?",
    [req.params.id]
  );
  if (!customer) {
    return res.status(404).json({ error: "Cliente no encontrado" });
  }
  const addresses = await query(
    "SELECT * FROM direcciones_clientes WHERE cliente_id = ?",
    [req.params.id]
  );
  res.json({ ...customer, addresses });
});

app.put("/api/customers/:id", requireRole(ACCESS.customers), async (req, res) => {
  const {
    nombre_completo,
    telefono_principal,
    telefono_secundario,
    direccion,
    zona,
    datos_gps,
    tipo_cliente,
    razon_social,
    nit,
    estado,
    notas,
  } = req.body || {};
  await query(
    "UPDATE clientes SET nombre_completo = ?, telefono_principal = ?, telefono_secundario = ?, direccion = ?, zona = ?, datos_gps = ?, tipo_cliente = ?, razon_social = ?, nit = ?, estado = ?, notas = ? WHERE id = ?",
    [
      nombre_completo,
      telefono_principal,
      telefono_secundario || null,
      direccion || null,
      zona || null,
      datos_gps || null,
      tipo_cliente || null,
      razon_social || null,
      nit || null,
      estado || "Activo",
      notas || null,
      req.params.id,
    ]
  );
  await req.audit({ action: "UPDATE", entityId: req.params.id });
  res.json({ ok: true });
});

app.delete("/api/customers/:id", requireRole(ACCESS.customers), async (req, res) => {
  await query("DELETE FROM clientes WHERE id = ?", [req.params.id]);
  await req.audit({ action: "DELETE", entityId: req.params.id });
  res.json({ ok: true });
});

app.get("/api/customers/:id/addresses", requireRole([...ACCESS.customers, ...ACCESS.orders]), async (req, res) => {
  const rows = await query(
    "SELECT * FROM direcciones_clientes WHERE cliente_id = ?",
    [req.params.id]
  );
  res.json(rows);
});

app.post("/api/customers/:id/addresses", requireRole(ACCESS.customers), async (req, res) => {
  const { etiqueta, direccion, ciudad, referencia, es_principal } = req.body || {};
  if (!direccion) {
    return res.status(400).json({ error: "Dirección requerida" });
  }
  const result = await query(
    "INSERT INTO direcciones_clientes (cliente_id, etiqueta, direccion, ciudad, referencia, es_principal) VALUES (?, ?, ?, ?, ?, ?)",
    [
      req.params.id,
      etiqueta || null,
      direccion,
      ciudad || null,
      referencia || null,
      es_principal ? 1 : 0,
    ]
  );
  await req.audit({
    action: "CREATE_ADDRESS",
    entityId: result.insertId,
    detail: direccion,
  });
  res.status(201).json({ id: result.insertId });
});

app.put("/api/addresses/:id", requireAuth, requireRole(ACCESS.customers), async (req, res) => {
  const { etiqueta, direccion, ciudad, referencia, es_principal } = req.body || {};
  await query(
    "UPDATE direcciones_clientes SET etiqueta = ?, direccion = ?, ciudad = ?, referencia = ?, es_principal = ? WHERE id = ?",
    [
      etiqueta || null,
      direccion,
      ciudad || null,
      referencia || null,
      es_principal ? 1 : 0,
      req.params.id,
    ]
  );
  res.json({ ok: true });
});

app.delete("/api/addresses/:id", requireAuth, requireRole(ACCESS.customers), async (req, res) => {
  await query("DELETE FROM direcciones_clientes WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/products", requireRole([...ACCESS.products, ...ACCESS.orders]), async (_req, res) => {
  const rows = await query(
    "SELECT id, nombre as name, descripcion as description, precio as price, activo as active FROM productos ORDER BY id DESC"
  );
  res.json(rows);
});

app.post("/api/products", requireRole(ACCESS.products), async (req, res) => {
  const { name, description, price, active } = req.body || {};
  if (!name || price == null) {
    return res.status(400).json({ error: "Nombre y precio requeridos" });
  }
  const result = await query(
    "INSERT INTO productos (nombre, descripcion, precio, activo) VALUES (?, ?, ?, ?)",
    [name, description || null, price, active === false ? 0 : 1]
  );
  await req.audit({ action: "CREATE", entityId: result.insertId, detail: name });
  res.status(201).json({ id: result.insertId });
});

app.put("/api/products/:id", requireRole(ACCESS.products), async (req, res) => {
  const { name, description, price, active } = req.body || {};
  await query(
    "UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, activo = ? WHERE id = ?",
    [name, description || null, price, active ? 1 : 0, req.params.id]
  );
  await req.audit({ action: "UPDATE", entityId: req.params.id });
  res.json({ ok: true });
});

app.delete("/api/products/:id", requireRole(ACCESS.products), async (req, res) => {
  await query("UPDATE productos SET activo = 0 WHERE id = ?", [req.params.id]);
  await req.audit({ action: "DEACTIVATE", entityId: req.params.id });
  res.json({ ok: true });
});

app.get("/api/warehouses", requireRole(ACCESS.warehouses), async (_req, res) => {
  const rows = await query(
    "SELECT id, nombre as name, ubicacion as location FROM almacenes ORDER BY id DESC"
  );
  res.json(rows);
});

app.post("/api/warehouses", requireRole(ACCESS.warehouses), async (req, res) => {
  const { name, location } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "Nombre requerido" });
  }
  const result = await query(
    "INSERT INTO almacenes (nombre, ubicacion) VALUES (?, ?)",
    [name, location || null]
  );
  await req.audit({ action: "CREATE", entityId: result.insertId, detail: name });
  res.status(201).json({ id: result.insertId });
});

app.put("/api/warehouses/:id", requireRole(ACCESS.warehouses), async (req, res) => {
  const { name, location } = req.body || {};
  await query("UPDATE almacenes SET nombre = ?, ubicacion = ? WHERE id = ?", [
    name,
    location || null,
    req.params.id,
  ]);
  await req.audit({ action: "UPDATE", entityId: req.params.id });
  res.json({ ok: true });
});

app.delete("/api/warehouses/:id", requireRole(ACCESS.warehouses), async (req, res) => {
  await query("DELETE FROM almacenes WHERE id = ?", [req.params.id]);
  await req.audit({ action: "DELETE", entityId: req.params.id });
  res.json({ ok: true });
});

app.get(
  "/api/warehouses/:id/inventory",
  requireRole(ACCESS.warehouses),
  async (req, res) => {
    const rows = await query(
      "SELECT i.id, i.cantidad as quantity, i.stock_minimo as min_stock, p.nombre as product_name, p.id as product_id FROM inventario i JOIN productos p ON p.id = i.producto_id WHERE i.almacen_id = ?",
      [req.params.id]
    );
    res.json(rows);
  }
);

app.post("/api/inventory/move", requireAuth, async (req, res) => {
  const { warehouse_id, product_id, qty, type, order_id, note } = req.body || {};
  if (!warehouse_id || !product_id || !qty || !type) {
    return res.status(400).json({ error: "Datos incompletos" });
  }
  await query(
    "INSERT INTO movimientos_inventario (almacen_id, producto_id, cantidad, tipo, pedido_id, nota) VALUES (?, ?, ?, ?, ?, ?)",
    [warehouse_id, product_id, qty, type, order_id || null, note || null]
  );
  const existing = await query(
    "SELECT id, cantidad FROM inventario WHERE almacen_id = ? AND producto_id = ?",
    [warehouse_id, product_id]
  );
  if (existing.length === 0) {
    await query(
      "INSERT INTO inventario (almacen_id, producto_id, cantidad, stock_minimo) VALUES (?, ?, ?, 0)",
      [warehouse_id, product_id, qty]
    );
  } else {
    await query(
      "UPDATE inventario SET cantidad = cantidad + ? WHERE id = ?",
      [qty, existing[0].id]
    );
  }
  await req.audit({
    action: "MOVE",
    entityId: product_id,
    detail: `${type}:${qty}`,
  });
  res.json({ ok: true });
});

app.get("/api/orders", requireRole(ACCESS.orders), async (_req, res) => {
  const rows = await query(
    "SELECT o.id, o.estado as status, o.metodo_pago as payment_method, o.prioridad as priority, o.notas as notes, o.fecha_creacion as created_at, c.nombre_completo as customer_name, cam.placa as truck_plate FROM pedidos o JOIN clientes c ON c.id = o.cliente_id LEFT JOIN entregas e ON e.pedido_id = o.id LEFT JOIN camiones cam ON cam.id = e.camion_id ORDER BY o.id DESC"
  );
  res.json(rows);
});

app.get("/api/orders/:id", requireRole(ACCESS.orders), async (req, res) => {
  const [order] = await query(
    "SELECT id, cliente_id, direccion_id, estado as status, metodo_pago as payment_method, prioridad as priority, notas as notes, fecha_creacion as created_at FROM pedidos WHERE id = ?",
    [req.params.id]
  );
  if (!order) {
    return res.status(404).json({ error: "Pedido no encontrado" });
  }
  const items = await query(
    "SELECT oi.*, p.nombre as product_name FROM items_pedido oi JOIN productos p ON p.id = oi.producto_id WHERE oi.pedido_id = ?",
    [req.params.id]
  );
  const history = await query(
    "SELECT * FROM historial_estado_pedido WHERE pedido_id = ? ORDER BY id DESC",
    [req.params.id]
  );
  res.json({ ...order, items, history });
});

app.post("/api/orders", requireRole(ACCESS.orders), async (req, res) => {
  const {
    customer_id,
    address_id,
    payment_method,
    priority,
    notes,
    items,
  } = req.body || {};
  if (!customer_id || !address_id || !items || items.length === 0) {
    return res.status(400).json({ error: "Datos incompletos" });
  }
  const requiredByProduct = new Map();
  for (const item of items) {
    if (!item.product_id || !item.quantity || Number(item.quantity) <= 0) {
      return res.status(400).json({ error: "Cantidad inválida en productos" });
    }
    const productId = Number(item.product_id);
    const qty = Number(item.quantity);
    requiredByProduct.set(productId, (requiredByProduct.get(productId) || 0) + qty);
  }
  const productIds = Array.from(requiredByProduct.keys());
  const placeholders = productIds.map(() => "?").join(", ");
  const stockRows = await query(
    `SELECT p.id, p.nombre as name, COALESCE(SUM(i.cantidad), 0) as stock
     FROM productos p
     LEFT JOIN inventario i ON i.producto_id = p.id
     WHERE p.id IN (${placeholders})
     GROUP BY p.id`,
    productIds
  );
  const stockMap = new Map(stockRows.map((r) => [r.id, r]));
  const insufficient = [];
  for (const [productId, required] of requiredByProduct.entries()) {
    const row = stockMap.get(productId);
    const stock = row ? Number(row.stock) : 0;
    if (stock < required) {
      insufficient.push({
        product_id: productId,
        name: row?.name || "Producto",
        stock,
        required,
      });
    }
  }
  if (insufficient.length > 0) {
    return res.status(400).json({
      error: "Sin existencias suficientes en almacenes.",
      details: insufficient,
    });
  }
  const result = await query(
    "INSERT INTO pedidos (cliente_id, direccion_id, estado, metodo_pago, prioridad, notas, creado_por_usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      customer_id,
      address_id,
      "Creado",
      payment_method || null,
      priority || "Normal",
      notes || null,
      req.user?.id || null,
    ]
  );
  const orderId = result.insertId;
  for (const item of items) {
    await query(
      "INSERT INTO items_pedido (pedido_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)",
      [orderId, item.product_id, item.quantity, item.price]
    );
  }
  await query(
    "INSERT INTO historial_estado_pedido (pedido_id, estado, nota) VALUES (?, ?, ?)",
    [orderId, "Creado", "Pedido creado"]
  );
  await req.audit({ action: "CREATE", entityId: orderId });
  res.status(201).json({ id: orderId });
});

app.patch("/api/orders/:id/status", requireRole(ACCESS.orders), async (req, res) => {
  const { status, note, warehouse_id } = req.body || {};
  if (!status) {
    return res.status(400).json({ error: "Estado requerido" });
  }
  await query("UPDATE pedidos SET estado = ? WHERE id = ?", [
    status,
    req.params.id,
  ]);
  await query(
    "INSERT INTO historial_estado_pedido (pedido_id, estado, nota) VALUES (?, ?, ?)",
    [req.params.id, status, note || null]
  );
  if (status === "Confirmado" && warehouse_id) {
    const items = await query(
      "SELECT producto_id, cantidad FROM items_pedido WHERE pedido_id = ?",
      [req.params.id]
    );
    for (const item of items) {
      await query(
        "INSERT INTO movimientos_inventario (almacen_id, producto_id, cantidad, tipo, pedido_id, nota) VALUES (?, ?, ?, 'SALIDA', ?, 'Confirmación de pedido')",
        [warehouse_id, item.producto_id, -item.cantidad, req.params.id]
      );
      await query(
        "UPDATE inventario SET cantidad = cantidad - ? WHERE almacen_id = ? AND producto_id = ?",
        [item.cantidad, warehouse_id, item.producto_id]
      );
    }
  }
  await req.audit({
    action: "STATUS",
    entityId: req.params.id,
    detail: status,
  });
  res.json({ ok: true });
});

app.get("/api/logistics/trucks", requireRole(ACCESS.logistics), async (_req, res) => {
  const rows = await query(
    "SELECT id, placa as plate, capacidad as capacity, activo as active FROM camiones ORDER BY id DESC"
  );
  res.json(rows);
});

app.get("/api/logistics/pending-orders", requireRole(ACCESS.logistics), async (_req, res) => {
  const rows = await query(
    "SELECT p.id, p.estado as status, c.nombre_completo as customer_name, p.fecha_creacion as created_at FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE p.estado IN ('Creado', 'Confirmado', 'En preparación') ORDER BY p.id DESC"
  );
  res.json(rows);
});

app.post("/api/logistics/trucks", requireRole(ACCESS.logistics), async (req, res) => {
  const { plate, capacity, active } = req.body || {};
  if (!plate) {
    return res.status(400).json({ error: "Placa requerida" });
  }
  const result = await query(
    "INSERT INTO camiones (placa, capacidad, activo) VALUES (?, ?, ?)",
    [plate, capacity || null, active === false ? 0 : 1]
  );
  await req.audit({ action: "CREATE_TRUCK", entityId: result.insertId });
  res.status(201).json({ id: result.insertId });
});

app.put("/api/logistics/trucks/:id", requireRole(ACCESS.logistics), async (req, res) => {
  const { plate, capacity, active } = req.body || {};
  await query(
    "UPDATE camiones SET placa = ?, capacidad = ?, activo = ? WHERE id = ?",
    [plate, capacity || null, active ? 1 : 0, req.params.id]
  );
  res.json({ ok: true });
});

app.get("/api/logistics/drivers", requireRole(ACCESS.logistics), async (_req, res) => {
  const rows = await query(
    "SELECT id, nombre as name, telefono as phone, activo as active FROM repartidores ORDER BY id DESC"
  );
  res.json(rows);
});

app.post("/api/logistics/drivers", requireRole(ACCESS.logistics), async (req, res) => {
  const { name, phone, active } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "Nombre requerido" });
  }
  const result = await query(
    "INSERT INTO repartidores (nombre, telefono, activo) VALUES (?, ?, ?)",
    [name, phone || null, active === false ? 0 : 1]
  );
  await req.audit({ action: "CREATE_DRIVER", entityId: result.insertId });
  res.status(201).json({ id: result.insertId });
});

app.put("/api/logistics/drivers/:id", requireRole(ACCESS.logistics), async (req, res) => {
  const { name, phone, active } = req.body || {};
  await query("UPDATE repartidores SET nombre = ?, telefono = ?, activo = ? WHERE id = ?", [
    name,
    phone || null,
    active ? 1 : 0,
    req.params.id,
  ]);
  res.json({ ok: true });
});

app.post("/api/logistics/deliveries", requireRole(ACCESS.logistics), async (req, res) => {
  const { order_id, truck_id, driver_id, scheduled_at } = req.body || {};
  if (!order_id || !truck_id || !driver_id) {
    return res.status(400).json({ error: "Datos incompletos" });
  }
  const result = await query(
    "INSERT INTO entregas (pedido_id, camion_id, repartidor_id, estado, programado_en) VALUES (?, ?, ?, 'Despachado', ?)",
    [order_id, truck_id, driver_id, scheduled_at || null]
  );
  await query("UPDATE pedidos SET estado = 'Despachado' WHERE id = ?", [
    order_id,
  ]);
  await query(
    "INSERT INTO historial_estado_pedido (pedido_id, estado, nota) VALUES (?, 'Despachado', 'Asignado a camión')",
    [order_id]
  );
  await req.audit({ action: "ASSIGN_DELIVERY", entityId: result.insertId });
  res.status(201).json({ id: result.insertId });
});

app.patch(
  "/api/logistics/deliveries/:id/status",
  requireRole(ACCESS.logistics),
  async (req, res) => {
    const { status, incident_type, note } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: "Estado requerido" });
    }
    await query("UPDATE entregas SET estado = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    if (incident_type) {
      await query(
        "INSERT INTO incidencias_entrega (entrega_id, tipo, nota) VALUES (?, ?, ?)",
        [req.params.id, incident_type, note || null]
      );
    }
    if (status === "Entregado") {
      const [delivery] = await query(
        "SELECT pedido_id FROM entregas WHERE id = ?",
        [req.params.id]
      );
      if (delivery) {
        await query("UPDATE pedidos SET estado = 'Entregado' WHERE id = ?", [
          delivery.pedido_id,
        ]);
        await query(
          "INSERT INTO historial_estado_pedido (pedido_id, estado, nota) VALUES (?, 'Entregado', 'Entrega confirmada')",
          [delivery.pedido_id]
        );
      }
    }
    await req.audit({
      action: "DELIVERY_STATUS",
      entityId: req.params.id,
      detail: status,
    });
    res.json({ ok: true });
  }
);

app.get("/api/reports/sales", requireRole(ACCESS.reports), async (req, res) => {
  const { from, to, status } = req.query;
  const where = ["o.fecha_creacion BETWEEN ? AND ?"];
  const params = [from || "1970-01-01", to || "2999-12-31"];
  if (status && status !== "all") {
    where.push("o.estado = ?");
    params.push(status);
  }
  const rows = await query(
    `SELECT DATE(o.fecha_creacion) as day, SUM(oi.cantidad * oi.precio) as total
     FROM pedidos o
     JOIN items_pedido oi ON oi.pedido_id = o.id
     WHERE ${where.join(" AND ")}
     GROUP BY day
     ORDER BY day`,
    params
  );
  res.json(rows);
});

app.get("/api/reports/orders-by-status", requireRole(ACCESS.reports), async (_req, res) => {
  const rows = await query(
    "SELECT estado as status, COUNT(*) as total FROM pedidos GROUP BY estado"
  );
  res.json(rows);
});

app.get("/api/reports/deliveries", requireRole(ACCESS.reports), async (_req, res) => {
  const rows = await query(
    "SELECT d.estado as status, COUNT(*) as total FROM entregas d GROUP BY d.estado"
  );
  res.json(rows);
});

app.get("/api/reports/trucks", requireRole(ACCESS.reports), async (_req, res) => {
  const rows = await query(
    "SELECT id, placa as plate FROM camiones ORDER BY placa"
  );
  res.json(rows);
});

app.get("/api/reports/drivers", requireRole(ACCESS.reports), async (_req, res) => {
  const rows = await query(
    "SELECT id, nombre as name FROM repartidores ORDER BY nombre"
  );
  res.json(rows);
});

app.get("/api/reports/users", requireRole(ACCESS.reports), async (_req, res) => {
  const rows = await query(
    "SELECT id, nombre as name FROM usuarios WHERE activo = 1 ORDER BY nombre"
  );
  res.json(rows);
});

app.get(
  "/api/reports/orders-status-summary",
  requireRole(ACCESS.reports),
  async (req, res) => {
    const { from, to, month, truck_id, driver_id, seller_id } = req.query || {};
    let rangeFrom = from || "1970-01-01";
    let rangeTo = to || "2999-12-31";
    if (month) {
      const [year, monthStr] = String(month).split("-");
      const y = Number(year);
      const m = Number(monthStr);
      if (y && m) {
        const lastDay = new Date(y, m, 0).getDate();
        rangeFrom = `${year}-${String(m).padStart(2, "0")}-01`;
        rangeTo = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      }
    }
    const where = ["p.fecha_creacion BETWEEN ? AND ?"];
    const params = [rangeFrom, rangeTo];
    if (truck_id) {
      where.push("e.camion_id = ?");
      params.push(truck_id);
    }
    if (driver_id) {
      where.push("e.repartidor_id = ?");
      params.push(driver_id);
    }
    if (seller_id) {
      where.push("p.creado_por_usuario_id = ?");
      params.push(seller_id);
    }
    const rows = await query(
      `SELECT p.estado as status, COUNT(*) as total
       FROM pedidos p
       LEFT JOIN entregas e ON e.pedido_id = p.id
       WHERE ${where.join(" AND ")}
       GROUP BY p.estado
       ORDER BY total DESC`,
      params
    );
    res.json(rows);
  }
);

app.get(
  "/api/reports/orders-summary",
  requireRole(ACCESS.reports),
  async (req, res) => {
    const { from, to, month, truck_id, driver_id, seller_id } = req.query || {};
    let rangeFrom = from || "1970-01-01";
    let rangeTo = to || "2999-12-31";
    if (month) {
      const [year, monthStr] = String(month).split("-");
      const y = Number(year);
      const m = Number(monthStr);
      if (y && m) {
        const lastDay = new Date(y, m, 0).getDate();
        rangeFrom = `${year}-${String(m).padStart(2, "0")}-01`;
        rangeTo = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      }
    }
    const where = ["p.fecha_creacion BETWEEN ? AND ?"];
    const params = [rangeFrom, rangeTo];
    if (truck_id) {
      where.push("e.camion_id = ?");
      params.push(truck_id);
    }
    if (driver_id) {
      where.push("e.repartidor_id = ?");
      params.push(driver_id);
    }
    if (seller_id) {
      where.push("p.creado_por_usuario_id = ?");
      params.push(seller_id);
    }
    const rows = await query(
      `SELECT
        p.id as order_id,
        p.estado as status,
        p.fecha_creacion as created_at,
        c.nombre_completo as customer_name,
        COALESCE(dc.direccion, c.direccion) as address,
        cam.placa as truck_plate,
        rep.nombre as driver_name,
        u.nombre as seller_name
       FROM pedidos p
       JOIN clientes c ON c.id = p.cliente_id
       LEFT JOIN direcciones_clientes dc ON dc.id = p.direccion_id
       LEFT JOIN entregas e ON e.pedido_id = p.id
       LEFT JOIN camiones cam ON cam.id = e.camion_id
       LEFT JOIN repartidores rep ON rep.id = e.repartidor_id
       LEFT JOIN usuarios u ON u.id = p.creado_por_usuario_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.id DESC`,
      params
    );
    res.json(rows);
  }
);

app.get(
  "/api/reports/stock-by-warehouse",
  requireRole(ACCESS.reports),
  async (_req, res) => {
    const rows = await query(
      "SELECT w.nombre as warehouse, p.nombre as product, i.cantidad as quantity, i.stock_minimo as min_stock FROM inventario i JOIN almacenes w ON w.id = i.almacen_id JOIN productos p ON p.id = i.producto_id ORDER BY w.nombre"
    );
    res.json(rows);
  }
);

app.get("/api/reports/performance", requireRole(ACCESS.reports), async (_req, res) => {
  const rows = await query(
    "SELECT t.placa as plate, d.nombre as driver, COUNT(del.id) as total_deliveries FROM entregas del JOIN camiones t ON t.id = del.camion_id JOIN repartidores d ON d.id = del.repartidor_id GROUP BY t.placa, d.nombre ORDER BY total_deliveries DESC"
  );
  res.json(rows);
});

app.get("/api/admin/roles", requireRole(ACCESS.admin), async (_req, res) => {
  const roles = await query("SELECT id, nombre as name FROM roles ORDER BY nombre");
  res.json(roles);
});

app.get("/api/admin/tipos-cliente", requireRole(ACCESS.admin), async (_req, res) => {
  const rows = await query(
    "SELECT id, nombre, activo, descuento_unidades, fecha_creacion FROM tipos_cliente ORDER BY nombre"
  );
  res.json(rows);
});

app.post("/api/admin/tipos-cliente", requireRole(ACCESS.admin), async (req, res) => {
  const { nombre, descuento_unidades } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: "Nombre requerido" });
  }
  const result = await query(
    "INSERT INTO tipos_cliente (nombre, activo, descuento_unidades) VALUES (?, 1, ?)",
    [nombre, Number(descuento_unidades || 0)]
  );
  await req.audit({ action: "CREATE_TIPO_CLIENTE", entityId: result.insertId, detail: nombre });
  res.status(201).json({ id: result.insertId });
});

app.put("/api/admin/tipos-cliente/:id", requireRole(ACCESS.admin), async (req, res) => {
  const { nombre, activo, descuento_unidades } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: "Nombre requerido" });
  }
  await query(
    "UPDATE tipos_cliente SET nombre = ?, activo = ?, descuento_unidades = ? WHERE id = ?",
    [nombre, activo ? 1 : 0, Number(descuento_unidades || 0), req.params.id]
  );
  await req.audit({ action: "UPDATE_TIPO_CLIENTE", entityId: req.params.id, detail: nombre });
  res.json({ ok: true });
});

app.get("/api/admin/users", requireRole(ACCESS.admin), async (_req, res) => {
  const rows = await query(
    "SELECT u.id, u.nombre as name, u.usuario as email, u.activo as is_active, u.fecha_creacion as created_at, GROUP_CONCAT(r.nombre ORDER BY r.nombre SEPARATOR ', ') as roles FROM usuarios u LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id LEFT JOIN roles r ON r.id = ur.rol_id GROUP BY u.id ORDER BY u.id DESC"
  );
  res.json(rows);
});

app.post("/api/admin/users", requireRole(ACCESS.admin), async (req, res) => {
  const { name, email, password, is_active } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nombre, usuario y contraseña requeridos" });
  }
  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    "INSERT INTO usuarios (nombre, usuario, hash_contrasena, activo) VALUES (?, ?, ?, ?)",
    [name, email, hash, is_active === false ? 0 : 1]
  );
  await req.audit({ action: "CREATE_USER", entityId: result.insertId, detail: email });
  res.status(201).json({ id: result.insertId });
});

app.put("/api/admin/users/:id", requireRole(ACCESS.admin), async (req, res) => {
  const { name, email, is_active } = req.body || {};
  await query(
    "UPDATE usuarios SET nombre = ?, usuario = ?, activo = ? WHERE id = ?",
    [name, email, is_active ? 1 : 0, req.params.id]
  );
  await req.audit({ action: "UPDATE_USER", entityId: req.params.id, detail: email });
  res.json({ ok: true });
});

app.put("/api/admin/users/:id/roles", requireRole(ACCESS.admin), async (req, res) => {
  const { role_ids } = req.body || {};
  if (!Array.isArray(role_ids)) {
    return res.status(400).json({ error: "role_ids debe ser un arreglo" });
  }
  await query("DELETE FROM usuarios_roles WHERE usuario_id = ?", [req.params.id]);
  for (const roleId of role_ids) {
    await query("INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (?, ?)", [
      req.params.id,
      roleId,
    ]);
  }
  await req.audit({ action: "SET_ROLES", entityId: req.params.id });
  res.json({ ok: true });
});

async function start() {
  await ensureBaseRoles();
  await ensureAdminUser();
  await ensureOrderColumns();
  app.listen(PORT, () => {
    console.log(`Ionlife API escuchando en puerto ${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});
