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
    [ADMIN_EMAIL, ADMIN_EMAIL, hash]
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
  const programada = await query(
    "SHOW COLUMNS FROM pedidos LIKE 'fecha_programada'"
  );
  if (programada.length === 0) {
    await query("ALTER TABLE pedidos ADD COLUMN fecha_programada DATE NULL");
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

async function ensureTraceColumns(table) {
  const created = await query(
    `SHOW COLUMNS FROM ${table} LIKE 'creado_por_usuario_id'`
  );
  if (created.length === 0) {
    await query(
      `ALTER TABLE ${table} ADD COLUMN creado_por_usuario_id INT NULL`
    );
  }
  const updated = await query(
    `SHOW COLUMNS FROM ${table} LIKE 'actualizado_por_usuario_id'`
  );
  if (updated.length === 0) {
    await query(
      `ALTER TABLE ${table} ADD COLUMN actualizado_por_usuario_id INT NULL`
    );
  }
  const createdAt = await query(
    `SHOW COLUMNS FROM ${table} LIKE 'fecha_creacion'`
  );
  if (createdAt.length === 0) {
    await query(
      `ALTER TABLE ${table} ADD COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
    );
  }
  const updatedAt = await query(
    `SHOW COLUMNS FROM ${table} LIKE 'fecha_actualizacion'`
  );
  if (updatedAt.length === 0) {
    await query(
      `ALTER TABLE ${table} ADD COLUMN fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP`
    );
  }
  const fkCreated = await query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'creado_por_usuario_id' AND REFERENCED_TABLE_NAME = 'usuarios'`,
    [table]
  );
  if (fkCreated.length === 0) {
    await query(
      `ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_creado_por FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL`
    );
  }
  const fkUpdated = await query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'actualizado_por_usuario_id' AND REFERENCED_TABLE_NAME = 'usuarios'`,
    [table]
  );
  if (fkUpdated.length === 0) {
    await query(
      `ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_actualizado_por FOREIGN KEY (actualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL`
    );
  }
}

async function ensurePriceTypes() {
  await query(
    `CREATE TABLE IF NOT EXISTS tipos_precio (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL UNIQUE,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );
  const columns = await query(
    "SHOW COLUMNS FROM tipos_precio LIKE 'ajuste_unidades'"
  );
  if (columns.length > 0) {
    await query("ALTER TABLE tipos_precio DROP COLUMN ajuste_unidades");
  }
}

async function ensureProductPriceTypes() {
  await query(
    `CREATE TABLE IF NOT EXISTS tipos_precio_producto (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tipo_precio_id INT NOT NULL,
      producto_id INT NOT NULL,
      precio DECIMAL(10,2) NOT NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_tipo_producto (tipo_precio_id, producto_id),
      FOREIGN KEY (tipo_precio_id) REFERENCES tipos_precio(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
    )`
  );
}

async function ensureOrderItemPriceTypeColumn() {
  const columns = await query(
    "SHOW COLUMNS FROM items_pedido LIKE 'tipo_precio_id'"
  );
  if (columns.length === 0) {
    await query("ALTER TABLE items_pedido ADD COLUMN tipo_precio_id INT NULL");
  }
  const fk = await query(
    "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'items_pedido' AND COLUMN_NAME = 'tipo_precio_id' AND REFERENCED_TABLE_NAME = 'tipos_precio'"
  );
  if (fk.length === 0) {
    await query(
      "ALTER TABLE items_pedido ADD CONSTRAINT fk_items_pedido_tipo_precio FOREIGN KEY (tipo_precio_id) REFERENCES tipos_precio(id) ON DELETE SET NULL"
    );
  }
}

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const emailTrim = (email && typeof email === "string" ? email : "").trim();
  const passwordTrim = (password != null && typeof password === "string" ? password : "").trim();
  if (!emailTrim || !passwordTrim) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }
  const users = await query(
    "SELECT id, nombre as name, usuario as email, hash_contrasena, activo as is_active FROM usuarios WHERE usuario = ?",
    [emailTrim]
  );
  if (users.length === 0) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }
  const user = users[0];
  if (!user.is_active) {
    return res.status(403).json({ error: "Usuario inactivo" });
  }
  const ok = await bcrypt.compare(passwordTrim, user.hash_contrasena);
  if (!ok) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }
  const roles = await query(
    "SELECT r.nombre as name FROM roles r JOIN usuarios_roles ur ON ur.rol_id = r.id WHERE ur.usuario_id = ?",
    [user.id]
  );
  const roleNames = roles.map((r) => r.name);
  const [driver] = await query(
    "SELECT id FROM repartidores WHERE nombre = ? LIMIT 1",
    [user.name]
  );
  const token = jwt.sign(
    { id: user.id, email: user.email, roles: roleNames, driver_id: driver?.id || null },
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
  const { date } = req.query || {};
  const roles = req.user?.roles || [];
  const isAdmin = roles.includes("Administrador del sistema");
  const isDriver = roles.includes("Repartidor");
  const baseQuery =
    "SELECT e.id, e.estado, e.programado_en, e.entregado_en, p.id as pedido_id, p.fecha_programada as fecha_programada, c.nombre_completo as cliente, COALESCE(dc.direccion, c.direccion) as direccion, r.nombre as repartidor, cam.placa as camion, GROUP_CONCAT(CONCAT(pr.nombre, ' x', oi.cantidad) SEPARATOR ', ') as pedido_detalle FROM entregas e JOIN pedidos p ON p.id = e.pedido_id JOIN clientes c ON c.id = p.cliente_id LEFT JOIN direcciones_clientes dc ON dc.id = p.direccion_id JOIN repartidores r ON r.id = e.repartidor_id JOIN camiones cam ON cam.id = e.camion_id JOIN items_pedido oi ON oi.pedido_id = p.id JOIN productos pr ON pr.id = oi.producto_id";
  const todayClause =
    "DATE(CONVERT_TZ(p.fecha_creacion,'+00:00','-04:00')) = DATE(CONVERT_TZ(NOW(),'+00:00','-04:00'))";
  const dateClause = date
    ? "DATE(CONVERT_TZ(p.fecha_creacion,'+00:00','-04:00')) = ?"
    : todayClause;
  const dateParams = date ? [date] : [];
  if (isAdmin) {
    const rows = await query(
      `${baseQuery} WHERE ${dateClause} GROUP BY e.id, e.estado, e.programado_en, e.entregado_en, p.id, p.fecha_programada, c.nombre_completo, direccion, r.nombre, cam.placa ORDER BY e.id DESC`,
      dateParams
    );
    return res.json(rows);
  }
  if (!isDriver) {
    return res.json([]);
  }
  const driverId = req.user?.driver_id;
  const driverName = req.user?.name;
  const rows = driverId
    ? await query(
        `${baseQuery} WHERE r.id = ? AND ${dateClause} GROUP BY e.id, e.estado, e.programado_en, e.entregado_en, p.id, p.fecha_programada, c.nombre_completo, direccion, r.nombre, cam.placa ORDER BY e.id DESC`,
        [driverId, ...dateParams]
      )
    : await query(
        `${baseQuery} WHERE r.nombre = ? AND ${dateClause} GROUP BY e.id, e.estado, e.programado_en, e.entregado_en, p.id, p.fecha_programada, c.nombre_completo, direccion, r.nombre, cam.placa ORDER BY e.id DESC`,
        [driverName, ...dateParams]
      );
  res.json(rows);
});

app.get("/api/driver/ventas", requireAuth, async (req, res) => {
  const { date } = req.query || {};
  const roles = req.user?.roles || [];
  const isAdmin = roles.includes("Administrador del sistema");
  const isDriver = roles.includes("Repartidor");
  const baseQuery =
    "SELECT p.id as pedido_id, c.nombre_completo as cliente, cam.placa as camion, r.nombre as repartidor, e.estado as estado_entrega, e.entregado_en, SUM(oi.cantidad * oi.precio) as total FROM entregas e JOIN pedidos p ON p.id = e.pedido_id JOIN clientes c ON c.id = p.cliente_id JOIN items_pedido oi ON oi.pedido_id = p.id JOIN repartidores r ON r.id = e.repartidor_id JOIN camiones cam ON cam.id = e.camion_id WHERE (e.estado = 'Entregado' OR p.estado = 'Entregado')";
  const todayClause =
    "DATE(CONVERT_TZ(e.entregado_en,'+00:00','-04:00')) = DATE(CONVERT_TZ(NOW(),'+00:00','-04:00'))";
  const dateClause = date
    ? "DATE(CONVERT_TZ(e.entregado_en,'+00:00','-04:00')) = ?"
    : todayClause;
  const dateParams = date ? [date] : [];
  if (isAdmin) {
    const rows = await query(
      `${baseQuery} AND ${dateClause} GROUP BY p.id, c.nombre_completo, cam.placa, r.nombre, e.estado, e.entregado_en ORDER BY p.id DESC`,
      dateParams
    );
    return res.json(rows);
  }
  if (!isDriver) {
    return res.json([]);
  }
  const driverId = req.user?.driver_id;
  const driverName = req.user?.name;
  const rows = driverId
    ? await query(
        `${baseQuery} AND r.id = ? AND ${dateClause} GROUP BY p.id, c.nombre_completo, cam.placa, r.nombre, e.estado, e.entregado_en ORDER BY p.id DESC`,
        [driverId, ...dateParams]
      )
    : await query(
        `${baseQuery} AND r.nombre = ? AND ${dateClause} GROUP BY p.id, c.nombre_completo, cam.placa, r.nombre, e.estado, e.entregado_en ORDER BY p.id DESC`,
        [driverName, ...dateParams]
      );
  res.json(rows);
});

app.get("/api/tipos-cliente", requireAuth, async (_req, res) => {
  const rows = await query(
    "SELECT id, nombre, descuento_unidades FROM tipos_cliente WHERE activo = 1 ORDER BY nombre"
  );
  res.json(rows);
});

app.get("/api/tipos-precio", requireAuth, async (_req, res) => {
  const rows = await query(
    "SELECT id, nombre FROM tipos_precio WHERE activo = 1 ORDER BY nombre"
  );
  res.json(rows);
});

app.get("/api/precios-producto", requireAuth, async (_req, res) => {
  const rows = await query(
    `SELECT tpp.producto_id, tpp.tipo_precio_id, tpp.precio
     FROM tipos_precio_producto tpp
     JOIN tipos_precio tp ON tp.id = tpp.tipo_precio_id
     JOIN productos p ON p.id = tpp.producto_id
     WHERE tpp.activo = 1 AND tp.activo = 1 AND p.activo = 1`
  );
  res.json(rows);
});

app.get("/api/customers", requireRole(ACCESS.customers), async (req, res) => {
  const limit = Number(req.query?.limit);
  const hasLimit = Number.isFinite(limit) && limit > 0;
  const safeLimit = hasLimit ? Math.min(Math.floor(limit), 200) : null;
  const rows = await query(
    `SELECT c.*, u.nombre as creado_por_nombre
     FROM clientes c
     LEFT JOIN usuarios u ON u.id = c.creado_por_usuario_id
     ORDER BY c.id DESC${safeLimit ? ` LIMIT ${safeLimit}` : ""}`
  );
  res.json(rows);
});

app.get("/api/customers/search", requireAuth, async (req, res) => {
  const { nombre, telefono, direccion, zona } = req.query || {};
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
  if (direccion) {
    conditions.push("direccion LIKE ?");
    params.push(`%${direccion}%`);
  }
  if (zona) {
    conditions.push("zona LIKE ?");
    params.push(`%${zona}%`);
  }

  if (conditions.length === 0) {
    return res.json([]);
  }

  const rows = await query(
    `SELECT c.*, u.nombre as creado_por_nombre
     FROM clientes c
     LEFT JOIN usuarios u ON u.id = c.creado_por_usuario_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY c.nombre_completo
     LIMIT 20`,
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
    "INSERT INTO clientes (nombre_completo, telefono_principal, telefono_secundario, direccion, zona, datos_gps, tipo_cliente, razon_social, nit, estado, notas, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
    "UPDATE clientes SET nombre_completo = ?, telefono_principal = ?, telefono_secundario = ?, direccion = ?, zona = ?, datos_gps = ?, tipo_cliente = ?, razon_social = ?, nit = ?, estado = ?, notas = ?, actualizado_por_usuario_id = ? WHERE id = ?",
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
    "INSERT INTO direcciones_clientes (cliente_id, etiqueta, direccion, ciudad, referencia, es_principal, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      req.params.id,
      etiqueta || null,
      direccion,
      ciudad || null,
      referencia || null,
      es_principal ? 1 : 0,
      req.user?.id || null,
      req.user?.id || null,
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
    "UPDATE direcciones_clientes SET etiqueta = ?, direccion = ?, ciudad = ?, referencia = ?, es_principal = ?, actualizado_por_usuario_id = ? WHERE id = ?",
    [
      etiqueta || null,
      direccion,
      ciudad || null,
      referencia || null,
      es_principal ? 1 : 0,
      req.user?.id || null,
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
    "INSERT INTO productos (nombre, descripcion, precio, activo, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, ?, ?, ?)",
    [
      name,
      description || null,
      price,
      active === false ? 0 : 1,
      req.user?.id || null,
      req.user?.id || null,
    ]
  );
  await req.audit({ action: "CREATE", entityId: result.insertId, detail: name });
  res.status(201).json({ id: result.insertId });
});

app.put("/api/products/:id", requireRole(ACCESS.products), async (req, res) => {
  const { name, description, price, active } = req.body || {};
  await query(
    "UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, activo = ?, actualizado_por_usuario_id = ? WHERE id = ?",
    [
      name,
      description || null,
      price,
      active ? 1 : 0,
      req.user?.id || null,
      req.params.id,
    ]
  );
  await req.audit({ action: "UPDATE", entityId: req.params.id });
  res.json({ ok: true });
});

app.delete("/api/products/:id", requireRole(ACCESS.products), async (req, res) => {
  await query(
    "UPDATE productos SET activo = 0, actualizado_por_usuario_id = ? WHERE id = ?",
    [req.user?.id || null, req.params.id]
  );
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
    "INSERT INTO almacenes (nombre, ubicacion, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, ?)",
    [name, location || null, req.user?.id || null, req.user?.id || null]
  );
  await req.audit({ action: "CREATE", entityId: result.insertId, detail: name });
  res.status(201).json({ id: result.insertId });
});

app.put("/api/warehouses/:id", requireRole(ACCESS.warehouses), async (req, res) => {
  const { name, location } = req.body || {};
  await query(
    "UPDATE almacenes SET nombre = ?, ubicacion = ?, actualizado_por_usuario_id = ? WHERE id = ?",
    [name, location || null, req.user?.id || null, req.params.id]
  );
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

app.post(
  "/api/inventory/move",
  requireAuth,
  auditMiddleware("inventory"),
  async (req, res) => {
  const { warehouse_id, product_id, qty, type, order_id, note } = req.body || {};
  if (!warehouse_id || !product_id || !qty || !type) {
    return res.status(400).json({ error: "Datos incompletos" });
  }
  await query(
    "INSERT INTO movimientos_inventario (almacen_id, producto_id, cantidad, tipo, pedido_id, nota, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      warehouse_id,
      product_id,
      qty,
      type,
      order_id || null,
      note || null,
      req.user?.id || null,
      req.user?.id || null,
    ]
  );
  const existing = await query(
    "SELECT id, cantidad FROM inventario WHERE almacen_id = ? AND producto_id = ?",
    [warehouse_id, product_id]
  );
  if (existing.length === 0) {
    await query(
      "INSERT INTO inventario (almacen_id, producto_id, cantidad, stock_minimo, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, 0, ?, ?)",
      [warehouse_id, product_id, qty, req.user?.id || null, req.user?.id || null]
    );
  } else {
    await query(
      "UPDATE inventario SET cantidad = cantidad + ?, actualizado_por_usuario_id = ? WHERE id = ?",
      [qty, req.user?.id || null, existing[0].id]
    );
  }
  await req.audit({
    action: "MOVE",
    entityId: product_id,
    detail: `${type}:${qty}`,
  });
  res.json({ ok: true });
});

app.get(
  "/api/inventory/summary",
  requireAuth,
  async (_req, res) => {
    const rows = await query(
      `SELECT p.id as product_id, p.nombre as product_name, COALESCE(SUM(i.cantidad), 0) as stock
       FROM productos p
       LEFT JOIN inventario i ON i.producto_id = p.id
       GROUP BY p.id, p.nombre`
    );
    res.json(rows);
  }
);

app.get("/api/orders", requireRole(ACCESS.orders), async (_req, res) => {
  const rows = await query(
    "SELECT o.id, o.cliente_id as customer_id, o.estado as status, o.metodo_pago as payment_method, o.prioridad as priority, o.notas as notes, o.fecha_programada as scheduled_date, o.fecha_creacion as created_at, c.nombre_completo as customer_name, c.direccion as address, c.zona as zone, cam.placa as truck_plate FROM pedidos o JOIN clientes c ON c.id = o.cliente_id LEFT JOIN entregas e ON e.pedido_id = o.id LEFT JOIN camiones cam ON cam.id = e.camion_id ORDER BY o.id DESC"
  );
  res.json(rows);
});

app.get("/api/orders/:id", requireRole(ACCESS.orders), async (req, res) => {
  const [order] = await query(
    "SELECT id, cliente_id, direccion_id, estado as status, metodo_pago as payment_method, prioridad as priority, notas as notes, fecha_programada as scheduled_date, fecha_creacion as created_at FROM pedidos WHERE id = ?",
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

app.put("/api/orders/:id", requireRole(ACCESS.orders), async (req, res) => {
  const { customer_id, address_id, notes, scheduled_date, items } = req.body || {};
  if (!address_id || !items || items.length === 0) {
    return res.status(400).json({ error: "Datos incompletos" });
  }
  const [order] = await query(
    "SELECT id, cliente_id, estado FROM pedidos WHERE id = ?",
    [req.params.id]
  );
  if (!order) {
    return res.status(404).json({ error: "Pedido no encontrado" });
  }
  if (order.estado === "Entregado") {
    return res.status(409).json({ error: "No se puede editar un pedido entregado" });
  }
  const requiredByProduct = new Map();
  for (const item of items) {
    if (!item.product_id || !item.quantity || Number(item.quantity) <= 0) {
      return res.status(400).json({ error: "Cantidad inválida en productos" });
    }
    if (item.price_type_id && Number(item.price_type_id) <= 0) {
      return res.status(400).json({ error: "Tipo de precio inválido" });
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
  const priceTypeItems = items.filter((i) => i.price_type_id);
  let priceTypeMap = new Map();
  if (priceTypeItems.length > 0) {
    const priceTypeIds = Array.from(
      new Set(priceTypeItems.map((i) => Number(i.price_type_id)))
    );
    const productIdsForPrice = Array.from(
      new Set(priceTypeItems.map((i) => Number(i.product_id)))
    );
    const typePlaceholders = priceTypeIds.map(() => "?").join(", ");
    const productPlaceholders = productIdsForPrice.map(() => "?").join(", ");
    const rows = await query(
      `SELECT tpp.producto_id, tpp.tipo_precio_id, tpp.precio
       FROM tipos_precio_producto tpp
       JOIN tipos_precio tp ON tp.id = tpp.tipo_precio_id
       WHERE tpp.activo = 1 AND tp.activo = 1
       AND tpp.tipo_precio_id IN (${typePlaceholders})
       AND tpp.producto_id IN (${productPlaceholders})`,
      [...priceTypeIds, ...productIdsForPrice]
    );
    priceTypeMap = new Map(
      rows.map((r) => [`${r.producto_id}:${r.tipo_precio_id}`, Number(r.precio)])
    );
  }
  const normalizedItems = [];
  for (const item of items) {
    const productId = Number(item.product_id);
    const priceTypeId = item.price_type_id ? Number(item.price_type_id) : null;
    let basePrice = Number(item.price || 0);
    if (priceTypeId) {
      const key = `${productId}:${priceTypeId}`;
      if (!priceTypeMap.has(key)) {
        return res.status(400).json({
          error: "Tipo de precio sin precio definido para el producto.",
        });
      }
      basePrice = priceTypeMap.get(key);
    }
    if (!priceTypeId && (!item.price || Number(item.price) <= 0)) {
      return res.status(400).json({ error: "Precio inválido en productos" });
    }
    const discountUnit = Number(item.discount_unit || 0);
    const finalPrice = Math.max(0, basePrice - discountUnit);
    normalizedItems.push({
      product_id: productId,
      quantity: Number(item.quantity),
      price: finalPrice,
      price_type_id: priceTypeId,
    });
  }
  await query(
    "UPDATE pedidos SET cliente_id = ?, direccion_id = ?, notas = ?, fecha_programada = ?, actualizado_por_usuario_id = ? WHERE id = ?",
    [
      customer_id ? Number(customer_id) : order.cliente_id,
      Number(address_id),
      notes || null,
      scheduled_date || null,
      req.user?.id || null,
      req.params.id,
    ]
  );
  await query("DELETE FROM items_pedido WHERE pedido_id = ?", [req.params.id]);
  for (const item of normalizedItems) {
    await query(
      "INSERT INTO items_pedido (pedido_id, producto_id, cantidad, precio, tipo_precio_id, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        req.params.id,
        item.product_id,
        item.quantity,
        item.price,
        item.price_type_id || null,
        req.user?.id || null,
        req.user?.id || null,
      ]
    );
  }
  await req.audit({ action: "UPDATE", entityId: req.params.id });
  res.json({ ok: true });
});

app.post("/api/orders", requireRole(ACCESS.orders), async (req, res) => {
  const {
    customer_id,
    address_id,
    payment_method,
    priority,
    notes,
    scheduled_date,
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
    if (item.price_type_id && Number(item.price_type_id) <= 0) {
      return res.status(400).json({ error: "Tipo de precio inválido" });
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
  const priceTypeItems = items.filter((i) => i.price_type_id);
  let priceTypeMap = new Map();
  if (priceTypeItems.length > 0) {
    const priceTypeIds = Array.from(
      new Set(priceTypeItems.map((i) => Number(i.price_type_id)))
    );
    const productIdsForPrice = Array.from(
      new Set(priceTypeItems.map((i) => Number(i.product_id)))
    );
    const typePlaceholders = priceTypeIds.map(() => "?").join(", ");
    const productPlaceholders = productIdsForPrice.map(() => "?").join(", ");
    const rows = await query(
      `SELECT tpp.producto_id, tpp.tipo_precio_id, tpp.precio
       FROM tipos_precio_producto tpp
       JOIN tipos_precio tp ON tp.id = tpp.tipo_precio_id
       WHERE tpp.activo = 1 AND tp.activo = 1
       AND tpp.tipo_precio_id IN (${typePlaceholders})
       AND tpp.producto_id IN (${productPlaceholders})`,
      [...priceTypeIds, ...productIdsForPrice]
    );
    priceTypeMap = new Map(
      rows.map((r) => [`${r.producto_id}:${r.tipo_precio_id}`, Number(r.precio)])
    );
  }
  const normalizedItems = [];
  for (const item of items) {
    const productId = Number(item.product_id);
    const priceTypeId = item.price_type_id ? Number(item.price_type_id) : null;
    let basePrice = Number(item.price || 0);
    if (priceTypeId) {
      const key = `${productId}:${priceTypeId}`;
      if (!priceTypeMap.has(key)) {
        return res.status(400).json({
          error: "Tipo de precio sin precio definido para el producto.",
        });
      }
      basePrice = priceTypeMap.get(key);
    }
    if (!priceTypeId && (!item.price || Number(item.price) <= 0)) {
      return res.status(400).json({ error: "Precio inválido en productos" });
    }
    const discountUnit = Number(item.discount_unit || 0);
    const finalPrice = Math.max(0, basePrice - discountUnit);
    normalizedItems.push({
      product_id: productId,
      quantity: Number(item.quantity),
      price: finalPrice,
      price_type_id: priceTypeId,
    });
  }
  const result = await query(
    "INSERT INTO pedidos (cliente_id, direccion_id, estado, metodo_pago, prioridad, notas, fecha_programada, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      customer_id,
      address_id,
      "Pendiente",
      payment_method || null,
      priority || "Normal",
      notes || null,
      scheduled_date || null,
      req.user?.id || null,
      req.user?.id || null,
    ]
  );
  const orderId = result.insertId;
  for (const item of normalizedItems) {
    await query(
      "INSERT INTO items_pedido (pedido_id, producto_id, cantidad, precio, tipo_precio_id, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        orderId,
        item.product_id,
        item.quantity,
        item.price,
        item.price_type_id || null,
        req.user?.id || null,
        req.user?.id || null,
      ]
    );
  }
  await query(
    "INSERT INTO historial_estado_pedido (pedido_id, estado, nota) VALUES (?, ?, ?)",
    [orderId, "Pendiente", "Pedido creado"]
  );
  await req.audit({ action: "CREATE", entityId: orderId });
  res.status(201).json({ id: orderId });
});

app.patch("/api/orders/:id/status", requireRole(ACCESS.orders), async (req, res) => {
  const { status, note, warehouse_id } = req.body || {};
  if (!status) {
    return res.status(400).json({ error: "Estado requerido" });
  }
  await query(
    "UPDATE pedidos SET estado = ?, actualizado_por_usuario_id = ? WHERE id = ?",
    [status, req.user?.id || null, req.params.id]
  );
  await query(
    "INSERT INTO historial_estado_pedido (pedido_id, estado, nota) VALUES (?, ?, ?)",
    [req.params.id, status, note || null]
  );
  if (status === "Entregado") {
    const existing = await query(
      "SELECT id FROM movimientos_inventario WHERE pedido_id = ? AND tipo = 'SALIDA' LIMIT 1",
      [req.params.id]
    );
    if (existing.length === 0) {
      const items = await query(
        "SELECT producto_id, cantidad FROM items_pedido WHERE pedido_id = ?",
        [req.params.id]
      );
      for (const item of items) {
        const [inv] = await query(
          "SELECT almacen_id, cantidad FROM inventario WHERE producto_id = ? ORDER BY cantidad DESC LIMIT 1",
          [item.producto_id]
        );
        if (!inv || inv.cantidad < item.cantidad) {
          return res.status(400).json({
            error: "Sin existencias suficientes en almacenes.",
          });
        }
        await query(
          "INSERT INTO movimientos_inventario (almacen_id, producto_id, cantidad, tipo, pedido_id, nota, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, 'SALIDA', ?, ?, ?, ?)",
          [
            inv.almacen_id,
            item.producto_id,
            -item.cantidad,
            req.params.id,
            status === "Entregado" ? "Entrega confirmada" : "Confirmación de pedido",
            req.user?.id || null,
            req.user?.id || null,
          ]
        );
        await query(
          "UPDATE inventario SET cantidad = cantidad - ?, actualizado_por_usuario_id = ? WHERE almacen_id = ? AND producto_id = ?",
          [item.cantidad, req.user?.id || null, inv.almacen_id, item.producto_id]
        );
      }
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
    "SELECT p.id, p.estado as status, c.nombre_completo as customer_name, c.zona, c.direccion, c.telefono_principal as phone, p.fecha_creacion as created_at FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE p.estado IN ('Pendiente', 'Reprogramado', 'Creado') ORDER BY p.id DESC"
  );
  res.json(rows);
});

app.post("/api/logistics/trucks", requireRole(ACCESS.logistics), async (req, res) => {
  const { plate, capacity, active } = req.body || {};
  if (!plate) {
    return res.status(400).json({ error: "Placa requerida" });
  }
  const result = await query(
    "INSERT INTO camiones (placa, capacidad, activo, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, ?, ?)",
    [plate, capacity || null, active === false ? 0 : 1, req.user?.id || null, req.user?.id || null]
  );
  await req.audit({ action: "CREATE_TRUCK", entityId: result.insertId });
  res.status(201).json({ id: result.insertId });
});

app.put("/api/logistics/trucks/:id", requireRole(ACCESS.logistics), async (req, res) => {
  const { plate, capacity, active } = req.body || {};
  await query(
    "UPDATE camiones SET placa = ?, capacidad = ?, activo = ?, actualizado_por_usuario_id = ? WHERE id = ?",
    [plate, capacity || null, active ? 1 : 0, req.user?.id || null, req.params.id]
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
    "INSERT INTO repartidores (nombre, telefono, activo, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, ?, ?)",
    [name, phone || null, active === false ? 0 : 1, req.user?.id || null, req.user?.id || null]
  );
  await req.audit({ action: "CREATE_DRIVER", entityId: result.insertId });
  res.status(201).json({ id: result.insertId });
});

app.put("/api/logistics/drivers/:id", requireRole(ACCESS.logistics), async (req, res) => {
  const { name, phone, active } = req.body || {};
  await query(
    "UPDATE repartidores SET nombre = ?, telefono = ?, activo = ?, actualizado_por_usuario_id = ? WHERE id = ?",
    [name, phone || null, active ? 1 : 0, req.user?.id || null, req.params.id]
  );
  res.json({ ok: true });
});

app.post("/api/logistics/deliveries", requireRole(ACCESS.logistics), async (req, res) => {
  const { order_id, truck_id, driver_id, scheduled_at } = req.body || {};
  if (!order_id || !truck_id || !driver_id) {
    return res.status(400).json({ error: "Datos incompletos" });
  }
  const result = await query(
    "INSERT INTO entregas (pedido_id, camion_id, repartidor_id, estado, programado_en, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, 'Despachado', ?, ?, ?)",
    [order_id, truck_id, driver_id, scheduled_at || null, req.user?.id || null, req.user?.id || null]
  );
  await query(
    "UPDATE pedidos SET estado = 'Despachado', actualizado_por_usuario_id = ? WHERE id = ?",
    [req.user?.id || null, order_id]
  );
  await query(
    "INSERT INTO historial_estado_pedido (pedido_id, estado, nota) VALUES (?, 'Despachado', 'Asignado a camión')",
    [order_id]
  );
  await req.audit({ action: "ASSIGN_DELIVERY", entityId: result.insertId });
  res.status(201).json({ id: result.insertId });
});

app.post("/api/logistics/deliveries/bulk", requireRole(ACCESS.logistics), async (req, res) => {
  const { order_ids, truck_id, driver_id } = req.body || {};
  if (!Array.isArray(order_ids) || order_ids.length === 0 || !truck_id || !driver_id) {
    return res.status(400).json({ error: "Datos incompletos" });
  }
  let assigned = 0;
  let skipped = 0;
  for (const rawId of order_ids) {
    const orderId = Number(rawId);
    if (!orderId) continue;
    const existing = await query(
      "SELECT id FROM entregas WHERE pedido_id = ? LIMIT 1",
      [orderId]
    );
    if (existing.length > 0) {
      skipped += 1;
      continue;
    }
    const result = await query(
      "INSERT INTO entregas (pedido_id, camion_id, repartidor_id, estado, programado_en, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, 'Despachado', NULL, ?, ?)",
      [orderId, truck_id, driver_id, req.user?.id || null, req.user?.id || null]
    );
    await query(
      "UPDATE pedidos SET estado = 'Despachado', actualizado_por_usuario_id = ? WHERE id = ?",
      [req.user?.id || null, orderId]
    );
    await query(
      "INSERT INTO historial_estado_pedido (pedido_id, estado, nota) VALUES (?, 'Despachado', 'Asignado a camión (masivo)')",
      [orderId]
    );
    await req.audit({ action: "ASSIGN_DELIVERY_BULK", entityId: result.insertId });
    assigned += 1;
  }
  res.json({ ok: true, assigned, skipped });
});

app.patch(
  "/api/logistics/deliveries/:id/status",
  requireRole(ACCESS.logistics),
  async (req, res) => {
    const { status, incident_type, note } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: "Estado requerido" });
    }
    await query(
      "UPDATE entregas SET estado = ?, actualizado_por_usuario_id = ? WHERE id = ?",
      [status, req.user?.id || null, req.params.id]
    );
    if (incident_type) {
      await query(
        "INSERT INTO incidencias_entrega (entrega_id, tipo, nota) VALUES (?, ?, ?)",
        [req.params.id, incident_type, note || null]
      );
    }
    if (status === "Entregado") {
      await query(
        "UPDATE entregas SET entregado_en = COALESCE(entregado_en, NOW()), actualizado_por_usuario_id = ? WHERE id = ?",
        [req.user?.id || null, req.params.id]
      );
      const [delivery] = await query(
        "SELECT pedido_id FROM entregas WHERE id = ?",
        [req.params.id]
      );
      if (delivery) {
        await query(
          "UPDATE pedidos SET estado = 'Entregado', actualizado_por_usuario_id = ? WHERE id = ?",
          [req.user?.id || null, delivery.pedido_id]
        );
        await query(
          "INSERT INTO historial_estado_pedido (pedido_id, estado, nota) VALUES (?, 'Entregado', 'Entrega confirmada')",
          [delivery.pedido_id]
        );
      }
    }
    if (status === "Cancelado") {
      const [delivery] = await query(
        "SELECT pedido_id FROM entregas WHERE id = ?",
        [req.params.id]
      );
      if (delivery) {
        await query(
          "UPDATE pedidos SET estado = 'Cancelado', actualizado_por_usuario_id = ? WHERE id = ?",
          [req.user?.id || null, delivery.pedido_id]
        );
        await query(
          "INSERT INTO historial_estado_pedido (pedido_id, estado, nota) VALUES (?, 'Cancelado', 'Entrega cancelada')",
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

async function getCentralWarehouseId() {
  const [central] = await query(
    "SELECT id FROM almacenes WHERE LOWER(nombre) LIKE '%central%' ORDER BY id ASC LIMIT 1"
  );
  if (central) return central.id;
  const [first] = await query("SELECT id FROM almacenes ORDER BY id ASC LIMIT 1");
  return first ? first.id : null;
}

app.get("/api/logistics/truck-summary", requireRole(ACCESS.logistics), async (req, res) => {
  const { truck_id } = req.query || {};
  if (!truck_id) {
    return res.status(400).json({ error: "truck_id requerido" });
  }
  const rows = await query(
    `SELECT
      COUNT(DISTINCT p.id) as total_orders,
      COALESCE(SUM(oi.cantidad), 0) as total_items,
      COALESCE(SUM(oi.cantidad * oi.precio), 0) as total_value
     FROM entregas e
     JOIN pedidos p ON p.id = e.pedido_id
     JOIN items_pedido oi ON oi.pedido_id = p.id
     WHERE e.camion_id = ?
       AND DATE(COALESCE(e.programado_en, p.fecha_creacion)) = CURDATE()`,
    [truck_id]
  );
  res.json(rows[0] || { total_orders: 0, total_items: 0, total_value: 0 });
});

app.get("/api/logistics/truck-orders", requireRole(ACCESS.logistics), async (req, res) => {
  const { truck_id, delivered_to, scheduled_date } = req.query || {};
  if (!truck_id) {
    return res.status(400).json({ error: "truck_id requerido" });
  }
  const deliveredTo = delivered_to ? `${delivered_to} 23:59:59` : null;
  const dateClause = scheduled_date
    ? " AND DATE(p.fecha_programada) = ?"
    : deliveredTo
    ? " AND e.entregado_en <= ?"
    : "";
  const dateParams = scheduled_date ? [scheduled_date] : deliveredTo ? [deliveredTo] : [];
  const rows = await query(
    `SELECT
      p.id,
      p.estado as status,
      c.nombre_completo as customer_name,
      c.telefono_principal as phone,
      c.telefono_secundario as phone_secondary,
      c.zona,
      COALESCE(dc.direccion, c.direccion) as address,
      p.notas as notes,
      p.fecha_creacion as created_at,
      GROUP_CONCAT(CONCAT(pr.nombre, " x", oi.cantidad) SEPARATOR ", ") as items,
      COALESCE(SUM(oi.cantidad * oi.precio), 0) as total,
      COALESCE(SUM(CASE WHEN LOWER(pr.nombre) LIKE '%600%' THEN oi.cantidad ELSE 0 END), 0) as packs_600,
      COALESCE(SUM(CASE WHEN LOWER(pr.nombre) LIKE '%1 lt%' OR LOWER(pr.nombre) LIKE '%1lt%' THEN oi.cantidad ELSE 0 END), 0) as packs_1lt,
      COALESCE(SUM(CASE WHEN LOWER(pr.nombre) LIKE '%2 lt%' OR LOWER(pr.nombre) LIKE '%2lt%' THEN oi.cantidad ELSE 0 END), 0) as packs_2lt,
      COALESCE(SUM(CASE WHEN LOWER(pr.nombre) LIKE '%bidon%' OR LOWER(pr.nombre) LIKE '%bidón%' THEN oi.cantidad ELSE 0 END), 0) as bidon_5,
      COALESCE(SUM(CASE WHEN LOWER(pr.nombre) LIKE '%recarga%' THEN oi.cantidad ELSE 0 END), 0) as recarga,
      COALESCE(SUM(CASE WHEN LOWER(pr.nombre) LIKE '%base%' THEN oi.cantidad ELSE 0 END), 0) as base,
      COALESCE(SUM(CASE WHEN LOWER(pr.nombre) LIKE '%botellon%' OR LOWER(pr.nombre) LIKE '%botellón%' THEN oi.cantidad ELSE 0 END), 0) as botellon,
      COALESCE(SUM(CASE WHEN LOWER(pr.nombre) LIKE '%kit completo%' THEN oi.cantidad ELSE 0 END), 0) as kit_completo,
      COALESCE(SUM(CASE WHEN LOWER(pr.nombre) LIKE '%purificada%' THEN oi.cantidad ELSE 0 END), 0) as botellon_purificada,
      cam.placa as truck_plate,
      r.nombre as driver_name
     FROM entregas e
     JOIN pedidos p ON p.id = e.pedido_id
     JOIN clientes c ON c.id = p.cliente_id
     LEFT JOIN direcciones_clientes dc ON dc.id = p.direccion_id
     JOIN items_pedido oi ON oi.pedido_id = p.id
     JOIN productos pr ON pr.id = oi.producto_id
     JOIN camiones cam ON cam.id = e.camion_id
     JOIN repartidores r ON r.id = e.repartidor_id
     WHERE e.camion_id = ?${dateClause}
     GROUP BY p.id, p.estado, c.nombre_completo, c.telefono_principal, c.telefono_secundario, c.zona, address, p.fecha_creacion, cam.placa, r.nombre
     ORDER BY p.id DESC`,
    [truck_id, ...dateParams]
  );
  res.json(rows);
});

app.post("/api/logistics/returns", requireRole(ACCESS.logistics), async (req, res) => {
  const { order_id, truck_id, cash_amount } = req.body || {};
  if (!order_id || !truck_id) {
    return res.status(400).json({ error: "Datos incompletos" });
  }
  const warehouseId = await getCentralWarehouseId();
  if (!warehouseId) {
    return res.status(400).json({ error: "No hay almacenes disponibles" });
  }
  const items = await query(
    "SELECT producto_id, cantidad FROM items_pedido WHERE pedido_id = ?",
    [order_id]
  );
  for (const item of items) {
    await query(
      "INSERT INTO movimientos_inventario (almacen_id, producto_id, cantidad, tipo, pedido_id, nota, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, 'DEVOLUCION', ?, 'Devolución de vendedor', ?, ?)",
      [
        warehouseId,
        item.producto_id,
        item.cantidad,
        order_id,
        req.user?.id || null,
        req.user?.id || null,
      ]
    );
    const existing = await query(
      "SELECT id FROM inventario WHERE almacen_id = ? AND producto_id = ?",
      [warehouseId, item.producto_id]
    );
    if (existing.length === 0) {
      await query(
        "INSERT INTO inventario (almacen_id, producto_id, cantidad, stock_minimo, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, 0, ?, ?)",
        [
          warehouseId,
          item.producto_id,
          item.cantidad,
          req.user?.id || null,
          req.user?.id || null,
        ]
      );
    } else {
      await query(
        "UPDATE inventario SET cantidad = cantidad + ?, actualizado_por_usuario_id = ? WHERE almacen_id = ? AND producto_id = ?",
        [item.cantidad, req.user?.id || null, warehouseId, item.producto_id]
      );
    }
  }
  await query(
    "UPDATE pedidos SET estado = 'Reprogramado', actualizado_por_usuario_id = ? WHERE id = ?",
    [req.user?.id || null, order_id]
  );
  await query(
    "UPDATE entregas SET estado = 'Reprogramado', actualizado_por_usuario_id = ? WHERE pedido_id = ? AND camion_id = ?",
    [req.user?.id || null, order_id, truck_id]
  );
  if (cash_amount && Number(cash_amount) > 0) {
    await query(
      "INSERT INTO pagos (pedido_id, monto, metodo, estado, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, 'Caja', 'Recibido', ?, ?)",
      [order_id, Number(cash_amount), req.user?.id || null, req.user?.id || null]
    );
  }
  await req.audit({
    action: "RETURN_TO_WAREHOUSE",
    entityId: order_id,
    detail: `camion:${truck_id}`,
  });
  res.json({ ok: true });
});

app.get("/api/reports/sales", requireRole(ACCESS.reports), async (req, res) => {
  const { from, to, status, truck_id } = req.query;
  const rangeFrom = from || "1970-01-01";
  const rangeTo = to || "2999-12-31";
  const sameDate = rangeFrom && rangeTo && rangeFrom === rangeTo;
  const dateExpr =
    "DATE(CONVERT_TZ(COALESCE(e.entregado_en, o.fecha_creacion),'+00:00','-04:00'))";
  const where = [sameDate ? `${dateExpr} = ?` : `${dateExpr} BETWEEN ? AND ?`];
  const params = sameDate ? [rangeFrom] : [rangeFrom, rangeTo];
  const statusExpr =
    "CASE WHEN e.estado IN ('Entregado','Cancelado') THEN e.estado ELSE o.estado END";
  const normalizedStatus = status && status !== "all" ? status : "";
  if (normalizedStatus) {
    if (normalizedStatus !== "Entregado") {
      return res.json([]);
    }
    where.push(`${statusExpr} = ?`);
    params.push(normalizedStatus);
  }
  if (truck_id) {
    where.push("e.camion_id = ?");
    params.push(truck_id);
  }
  where.push("e.estado = 'Entregado'");
  const rows = await query(
    `SELECT ${dateExpr} as day, SUM(oi.cantidad * oi.precio) as total
     FROM pedidos o
     JOIN items_pedido oi ON oi.pedido_id = o.id
     JOIN entregas e ON e.pedido_id = o.id
     WHERE ${where.join(" AND ")}
     GROUP BY day
     ORDER BY day`,
    params
  );
  res.json(rows);
});

app.get("/api/reports/orders-by-status", requireRole(ACCESS.reports), async (req, res) => {
  const { from, to, truck_id, status } = req.query || {};
  const rangeFrom = from || "1970-01-01";
  const rangeTo = to || "2999-12-31";
  const sameDate = rangeFrom && rangeTo && rangeFrom === rangeTo;
  const dateExpr = "DATE(CONVERT_TZ(p.fecha_creacion,'+00:00','-04:00'))";
  const where = [sameDate ? `${dateExpr} = ?` : `${dateExpr} BETWEEN ? AND ?`];
  const params = sameDate ? [rangeFrom] : [rangeFrom, rangeTo];
  const statusExpr =
    "CASE WHEN e.estado IN ('Entregado','Cancelado') THEN e.estado ELSE p.estado END";
  if (truck_id) {
    where.push("e.camion_id = ?");
    params.push(truck_id);
  }
  if (status && status !== "all") {
    where.push(`${statusExpr} = ?`);
    params.push(status);
  }
  const rows = await query(
    `SELECT s.status, COALESCE(c.total, 0) as total
     FROM (
       SELECT 'Pendiente' as status
       UNION ALL SELECT 'Despachado'
       UNION ALL SELECT 'Entregado'
       UNION ALL SELECT 'Cancelado'
       UNION ALL SELECT 'Reprogramado'
     ) s
     LEFT JOIN (
       SELECT ${statusExpr} as status, COUNT(*) as total
       FROM pedidos p
       LEFT JOIN entregas e ON e.pedido_id = p.id
       WHERE ${where.join(" AND ")}
       GROUP BY ${statusExpr}
     ) c ON c.status = s.status
     ORDER BY s.status`,
    params
  );
  res.json(rows);
});

app.get("/api/reports/deliveries", requireRole(ACCESS.reports), async (req, res) => {
  const { from, to, truck_id, status } = req.query || {};
  const rangeFrom = from || "1970-01-01";
  const rangeTo = to || "2999-12-31";
  const sameDate = rangeFrom && rangeTo && rangeFrom === rangeTo;
  const dateExpr = "DATE(CONVERT_TZ(p.fecha_creacion,'+00:00','-04:00'))";
  const where = [sameDate ? `${dateExpr} = ?` : `${dateExpr} BETWEEN ? AND ?`];
  const params = sameDate ? [rangeFrom] : [rangeFrom, rangeTo];
  if (truck_id) {
    where.push("d.camion_id = ?");
    params.push(truck_id);
  }
  if (status && status !== "all") {
    where.push("d.estado = ?");
    params.push(status);
  }
  const rows = await query(
    `SELECT d.estado as status, COUNT(*) as total
     FROM entregas d
     JOIN pedidos p ON p.id = d.pedido_id
     WHERE ${where.join(" AND ")}
     GROUP BY d.estado`,
    params
  );
  res.json(rows);
});

app.get("/api/reports/sales-by-client-type", requireRole(ACCESS.reports), async (req, res) => {
  const { from, to, status } = req.query;
  const fromDate = from || "1970-01-01";
  const toDate = to || "2999-12-31";
  const where = ["DATE(o.fecha_creacion) BETWEEN ? AND ?"];
  const params = [fromDate, toDate];
  if (status && status !== "all") {
    where.push("o.estado = ?");
    params.push(status);
  }
  const rows = await query(
    `SELECT COALESCE(c.tipo_cliente, 'Sin tipo') as type,
            SUM(oi.cantidad * oi.precio) as total
     FROM pedidos o
     JOIN items_pedido oi ON oi.pedido_id = o.id
     JOIN clientes c ON c.id = o.cliente_id
     WHERE ${where.join(" AND ")}
     GROUP BY c.tipo_cliente
     ORDER BY total DESC`,
    params
  );
  res.json(rows);
});

app.get("/api/reports/deliveries-by-truck", requireRole(ACCESS.reports), async (req, res) => {
  const { from, to } = req.query;
  const fromDate = from || "1970-01-01";
  const toDate = to || "2999-12-31";
  const rows = await query(
    `SELECT cam.placa as truck, COUNT(*) as total
     FROM entregas e
     JOIN camiones cam ON cam.id = e.camion_id
     JOIN pedidos p ON p.id = e.pedido_id
     WHERE DATE(COALESCE(e.programado_en, p.fecha_creacion)) BETWEEN ? AND ?
     GROUP BY cam.placa
     ORDER BY total DESC`,
    [fromDate, toDate]
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
    const sameDate = rangeFrom && rangeTo && rangeFrom === rangeTo;
    const dateExpr = "DATE(CONVERT_TZ(p.fecha_creacion,'+00:00','-04:00'))";
    const where = [sameDate ? `${dateExpr} = ?` : `${dateExpr} BETWEEN ? AND ?`];
    const params = sameDate ? [rangeFrom] : [rangeFrom, rangeTo];
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
    const statusExpr =
      "CASE WHEN e.estado IN ('Entregado','Cancelado') THEN e.estado ELSE p.estado END";
    const rows = await query(
      `SELECT ${statusExpr} as status, COUNT(*) as total
       FROM pedidos p
       LEFT JOIN entregas e ON e.pedido_id = p.id
       WHERE ${where.join(" AND ")}
       GROUP BY ${statusExpr}
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
    const { from, to, truck_id, status } = req.query || {};
    const rangeFrom = from || "1970-01-01";
    const rangeTo = to || "2999-12-31";
    const sameDate = rangeFrom && rangeTo && rangeFrom === rangeTo;
    const dateExpr = "DATE(CONVERT_TZ(p.fecha_creacion,'+00:00','-04:00'))";
    const where = [sameDate ? `${dateExpr} = ?` : `${dateExpr} BETWEEN ? AND ?`];
    const params = sameDate ? [rangeFrom] : [rangeFrom, rangeTo];
    if (truck_id) {
      where.push("e.camion_id = ?");
      params.push(truck_id);
    }
    if (status) {
      where.push(
        "CASE WHEN e.estado IN ('Entregado','Cancelado') THEN e.estado ELSE p.estado END = ?"
      );
      params.push(status);
    }
    const rows = await query(
      `SELECT
        p.id as order_id,
        CASE WHEN e.estado IN ('Entregado','Cancelado') THEN e.estado ELSE p.estado END as status,
        p.fecha_creacion as created_at,
        c.nombre_completo as customer_name,
        COALESCE(dc.direccion, c.direccion) as address,
        cam.placa as truck_plate,
        rep.nombre as driver_name,
        u.nombre as seller_name,
        GROUP_CONCAT(CONCAT(pr.nombre, ' x', oi.cantidad) SEPARATOR ', ') as order_detail,
        SUM(oi.cantidad * oi.precio) as total
       FROM pedidos p
       JOIN clientes c ON c.id = p.cliente_id
       LEFT JOIN direcciones_clientes dc ON dc.id = p.direccion_id
       LEFT JOIN entregas e ON e.pedido_id = p.id
       LEFT JOIN camiones cam ON cam.id = e.camion_id
       LEFT JOIN repartidores rep ON rep.id = e.repartidor_id
       LEFT JOIN usuarios u ON u.id = p.creado_por_usuario_id
       JOIN items_pedido oi ON oi.pedido_id = p.id
       JOIN productos pr ON pr.id = oi.producto_id
       WHERE ${where.join(" AND ")}
       GROUP BY p.id, CASE WHEN e.estado IN ('Entregado','Cancelado') THEN e.estado ELSE p.estado END, p.fecha_creacion, c.nombre_completo, address, cam.placa, rep.nombre, u.nombre
       ORDER BY p.id DESC`,
      params
    );
    res.json(rows);
  }
);

app.get(
  "/api/reports/stock-by-warehouse",
  requireRole(ACCESS.reports),
  async (req, res) => {
    const { from, to } = req.query || {};
    const rangeTo = to || from || "";
    if (!rangeTo) {
      const rows = await query(
        "SELECT w.nombre as warehouse, p.nombre as product, i.cantidad as quantity, i.stock_minimo as min_stock FROM inventario i JOIN almacenes w ON w.id = i.almacen_id JOIN productos p ON p.id = i.producto_id ORDER BY w.nombre"
      );
      return res.json(rows);
    }
    const dateExpr = "DATE(CONVERT_TZ(m.fecha_creacion,'+00:00','-04:00'))";
    const rows = await query(
      `SELECT
         w.nombre as warehouse,
         p.nombre as product,
         (i.cantidad - COALESCE(SUM(CASE WHEN ${dateExpr} > ? THEN
           CASE WHEN m.tipo IN ('SALIDA') THEN m.cantidad * -1 ELSE m.cantidad END
         ELSE 0 END), 0)) as quantity,
         i.stock_minimo as min_stock
       FROM inventario i
       JOIN almacenes w ON w.id = i.almacen_id
       JOIN productos p ON p.id = i.producto_id
       LEFT JOIN movimientos_inventario m ON m.almacen_id = i.almacen_id AND m.producto_id = i.producto_id
       GROUP BY i.id, w.nombre, p.nombre, i.cantidad, i.stock_minimo
       ORDER BY w.nombre`,
      [rangeTo]
    );
    res.json(rows);
  }
);

app.get("/api/reports/performance", requireRole(ACCESS.reports), async (req, res) => {
  const { from, to, truck_id } = req.query || {};
  const rangeFrom = from || "1970-01-01";
  const rangeTo = to || "2999-12-31";
  const sameDate = rangeFrom && rangeTo && rangeFrom === rangeTo;
  const dateExpr = "DATE(CONVERT_TZ(p.fecha_creacion,'+00:00','-04:00'))";
  const where = [sameDate ? `${dateExpr} = ?` : `${dateExpr} BETWEEN ? AND ?`];
  const params = sameDate ? [rangeFrom] : [rangeFrom, rangeTo];
  if (truck_id) {
    where.push("del.camion_id = ?");
    params.push(truck_id);
  }
  const rows = await query(
    `SELECT t.placa as plate, d.nombre as driver, COUNT(del.id) as total_deliveries
     FROM entregas del
     JOIN camiones t ON t.id = del.camion_id
     JOIN repartidores d ON d.id = del.repartidor_id
     JOIN pedidos p ON p.id = del.pedido_id
     WHERE ${where.join(" AND ")}
     GROUP BY t.placa, d.nombre
     ORDER BY total_deliveries DESC`,
    params
  );
  res.json(rows);
});

app.get("/api/admin/roles", requireRole(ACCESS.admin), async (_req, res) => {
  const roles = await query("SELECT id, nombre as name FROM roles ORDER BY nombre");
  res.json(roles);
});

app.post("/api/admin/roles", requireRole(ACCESS.admin), async (req, res) => {
  const { name } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "Nombre requerido" });
  }
  try {
    const result = await query("INSERT INTO roles (nombre) VALUES (?)", [name]);
    await req.audit({ action: "CREATE_ROLE", entityId: result.insertId, detail: name });
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "El rol ya existe" });
    }
    throw err;
  }
});

app.put("/api/admin/roles/:id", requireRole(ACCESS.admin), async (req, res) => {
  const { name } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "Nombre requerido" });
  }
  try {
    await query("UPDATE roles SET nombre = ? WHERE id = ?", [name, req.params.id]);
    await req.audit({ action: "UPDATE_ROLE", entityId: req.params.id, detail: name });
    res.json({ ok: true });
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "El rol ya existe" });
    }
    throw err;
  }
});

app.get("/api/admin/tipos-cliente", requireRole(ACCESS.admin), async (_req, res) => {
  const rows = await query(
    "SELECT id, nombre, activo, descuento_unidades, fecha_creacion FROM tipos_cliente ORDER BY nombre"
  );
  res.json(rows);
});

app.get("/api/admin/tipos-precio", requireRole(ACCESS.admin), async (_req, res) => {
  const rows = await query(
    "SELECT id, nombre, activo, fecha_creacion FROM tipos_precio ORDER BY nombre"
  );
  res.json(rows);
});

app.get("/api/admin/precios-producto", requireRole(ACCESS.admin), async (_req, res) => {
  const rows = await query(
    `SELECT tpp.id, tpp.precio, tpp.activo, tpp.tipo_precio_id, tp.nombre as tipo_precio,
      tpp.producto_id, p.nombre as producto
     FROM tipos_precio_producto tpp
     JOIN tipos_precio tp ON tp.id = tpp.tipo_precio_id
     JOIN productos p ON p.id = tpp.producto_id
     ORDER BY tp.nombre, p.nombre`
  );
  res.json(rows);
});

app.post("/api/admin/tipos-cliente", requireRole(ACCESS.admin), async (req, res) => {
  const { nombre, descuento_unidades } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: "Nombre requerido" });
  }
  const result = await query(
    "INSERT INTO tipos_cliente (nombre, activo, descuento_unidades, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, 1, ?, ?, ?)",
    [nombre, Number(descuento_unidades || 0), req.user?.id || null, req.user?.id || null]
  );
  await req.audit({ action: "CREATE_TIPO_CLIENTE", entityId: result.insertId, detail: nombre });
  res.status(201).json({ id: result.insertId });
});

app.post("/api/admin/tipos-precio", requireRole(ACCESS.admin), async (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: "Nombre requerido" });
  }
  const result = await query(
    "INSERT INTO tipos_precio (nombre, activo, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, 1, ?, ?)",
    [nombre, req.user?.id || null, req.user?.id || null]
  );
  await req.audit({ action: "CREATE_TIPO_PRECIO", entityId: result.insertId, detail: nombre });
  res.status(201).json({ id: result.insertId });
});

app.post("/api/admin/precios-producto", requireRole(ACCESS.admin), async (req, res) => {
  const { tipo_precio_id, producto_id, precio, activo } = req.body || {};
  if (!tipo_precio_id || !producto_id || precio === undefined) {
    return res.status(400).json({ error: "Datos incompletos" });
  }
  try {
  const result = await query(
    "INSERT INTO tipos_precio_producto (tipo_precio_id, producto_id, precio, activo, creado_por_usuario_id, actualizado_por_usuario_id) VALUES (?, ?, ?, ?, ?, ?)",
    [
      Number(tipo_precio_id),
      Number(producto_id),
      Number(precio),
      activo === false ? 0 : 1,
      req.user?.id || null,
      req.user?.id || null,
    ]
  );
    await req.audit({
      action: "CREATE_PRECIO_PRODUCTO",
      entityId: result.insertId,
      detail: `${tipo_precio_id}:${producto_id}`,
    });
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "El precio ya existe para este producto" });
    }
    throw err;
  }
});

app.put("/api/admin/tipos-cliente/:id", requireRole(ACCESS.admin), async (req, res) => {
  const { nombre, activo, descuento_unidades } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: "Nombre requerido" });
  }
  await query(
    "UPDATE tipos_cliente SET nombre = ?, activo = ?, descuento_unidades = ?, actualizado_por_usuario_id = ? WHERE id = ?",
    [nombre, activo ? 1 : 0, Number(descuento_unidades || 0), req.user?.id || null, req.params.id]
  );
  await req.audit({ action: "UPDATE_TIPO_CLIENTE", entityId: req.params.id, detail: nombre });
  res.json({ ok: true });
});

app.put("/api/admin/tipos-precio/:id", requireRole(ACCESS.admin), async (req, res) => {
  const { nombre, activo } = req.body || {};
  if (!nombre) {
    return res.status(400).json({ error: "Nombre requerido" });
  }
  await query(
    "UPDATE tipos_precio SET nombre = ?, activo = ?, actualizado_por_usuario_id = ? WHERE id = ?",
    [nombre, activo ? 1 : 0, req.user?.id || null, req.params.id]
  );
  await req.audit({ action: "UPDATE_TIPO_PRECIO", entityId: req.params.id, detail: nombre });
  res.json({ ok: true });
});

app.put("/api/admin/precios-producto/:id", requireRole(ACCESS.admin), async (req, res) => {
  const { precio, activo } = req.body || {};
  if (precio === undefined) {
    return res.status(400).json({ error: "Precio requerido" });
  }
  await query(
    "UPDATE tipos_precio_producto SET precio = ?, activo = ?, actualizado_por_usuario_id = ? WHERE id = ?",
    [Number(precio), activo ? 1 : 0, req.user?.id || null, req.params.id]
  );
  await req.audit({
    action: "UPDATE_PRECIO_PRODUCTO",
    entityId: req.params.id,
  });
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

app.put("/api/admin/users/:id/password", requireRole(ACCESS.admin), async (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: "Contraseña requerida" });
  }
  const hash = await bcrypt.hash(password, 10);
  await query("UPDATE usuarios SET hash_contrasena = ? WHERE id = ?", [
    hash,
    req.params.id,
  ]);
  await req.audit({ action: "UPDATE_USER_PASSWORD", entityId: req.params.id });
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
  await ensurePriceTypes();
  await ensureProductPriceTypes();
  await ensureOrderItemPriceTypeColumn();
  const traceTables = [
    "clientes",
    "direcciones_clientes",
    "productos",
    "almacenes",
    "inventario",
    "movimientos_inventario",
    "pedidos",
    "items_pedido",
    "camiones",
    "repartidores",
    "entregas",
    "pagos",
    "tipos_cliente",
    "tipos_precio",
    "tipos_precio_producto",
  ];
  for (const table of traceTables) {
    await ensureTraceColumns(table);
  }
  app.listen(PORT, () => {
    console.log(`Ionlife API escuchando en puerto ${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});
