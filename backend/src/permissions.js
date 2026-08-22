const { query } = require("./db");

/** Módulos configurables desde Administración → Roles. */
const MODULE_CATALOG = [
  { key: "customers", label: "Clientes", path: "/clientes" },
  { key: "products", label: "Productos", path: "/productos" },
  { key: "warehouses", label: "Almacenes", path: "/almacenes" },
  { key: "orders", label: "Pedidos", path: "/pedidos" },
  { key: "logistics", label: "Logística", path: "/logistica" },
  { key: "logisticsManage", label: "Gestión de flota / reasignación", path: "/logistica" },
  { key: "reports", label: "Reportes", path: "/reportes" },
  { key: "deliveries", label: "Entregas (móvil / mis entregas)", path: "/entregas-movil" },
  { key: "admin", label: "Administración", path: "/admin" },
];

const MODULE_KEYS = MODULE_CATALOG.map((m) => m.key);

/** Permisos iniciales (igual que el ACCESS histórico hardcodeado). */
const DEFAULT_ROLE_MODULES = {
  "Administrador del sistema": MODULE_KEYS.slice(),
  "Supervisor de call center": [
    "customers",
    "products",
    "orders",
    "logistics",
    "logisticsManage",
    "reports",
  ],
  "Operador de call center": ["customers", "orders"],
  "Encargado de almacén": ["products", "warehouses"],
  "Jefe de logística": [
    "customers",
    "orders",
    "logistics",
    "logisticsManage",
    "reports",
    "deliveries",
  ],
  "Repartidor": ["customers", "products", "logistics", "reports", "deliveries"],
};

function emptyAccess() {
  return Object.fromEntries(MODULE_KEYS.map((key) => [key, []]));
}

let ACCESS = emptyAccess();

async function ensureRolePermissionsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS roles_permisos (
      rol_id INT NOT NULL,
      modulo VARCHAR(40) NOT NULL,
      PRIMARY KEY (rol_id, modulo),
      FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  const [{ total }] = await query("SELECT COUNT(*) as total FROM roles_permisos");
  if (Number(total) > 0) {
    await reloadAccessMatrix();
    return;
  }

  for (const [roleName, modules] of Object.entries(DEFAULT_ROLE_MODULES)) {
    const [role] = await query("SELECT id FROM roles WHERE nombre = ?", [roleName]);
    if (!role) continue;
    for (const modulo of modules) {
      await query(
        "INSERT IGNORE INTO roles_permisos (rol_id, modulo) VALUES (?, ?)",
        [role.id, modulo]
      );
    }
  }
  await reloadAccessMatrix();
}

async function reloadAccessMatrix() {
  const next = emptyAccess();
  const rows = await query(
    `SELECT r.nombre as role_name, rp.modulo
     FROM roles_permisos rp
     JOIN roles r ON r.id = rp.rol_id
     ORDER BY r.nombre, rp.modulo`
  );
  for (const row of rows) {
    if (!next[row.modulo]) next[row.modulo] = [];
    if (!next[row.modulo].includes(row.role_name)) {
      next[row.modulo].push(row.role_name);
    }
  }
  // Seguridad: el admin siempre conserva acceso a administración.
  if (!next.admin.includes("Administrador del sistema")) {
    next.admin.push("Administrador del sistema");
  }
  ACCESS = next;
  return ACCESS;
}

async function getModulesForRoleIds(roleIds = []) {
  if (!roleIds.length) return [];
  const placeholders = roleIds.map(() => "?").join(", ");
  const rows = await query(
    `SELECT DISTINCT modulo FROM roles_permisos WHERE rol_id IN (${placeholders})`,
    roleIds
  );
  return rows.map((r) => r.modulo).filter((m) => MODULE_KEYS.includes(m));
}

async function getModulesForRoleNames(roleNames = []) {
  if (!roleNames.length) return [];
  if (roleNames.includes("Administrador del sistema")) {
    return MODULE_KEYS.slice();
  }
  const placeholders = roleNames.map(() => "?").join(", ");
  const rows = await query(
    `SELECT DISTINCT rp.modulo
     FROM roles_permisos rp
     JOIN roles r ON r.id = rp.rol_id
     WHERE r.nombre IN (${placeholders})`,
    roleNames
  );
  const modules = rows.map((r) => r.modulo).filter((m) => MODULE_KEYS.includes(m));
  return [...new Set(modules)];
}

async function getRoleModulesMap() {
  const roles = await query(
    `SELECT r.id, r.nombre as name,
            COUNT(DISTINCT ur.usuario_id) as users_count
     FROM roles r
     LEFT JOIN usuarios_roles ur ON ur.rol_id = r.id
     GROUP BY r.id, r.nombre
     ORDER BY r.nombre`
  );
  const perms = await query(
    `SELECT rol_id, modulo FROM roles_permisos ORDER BY rol_id, modulo`
  );
  const byRole = new Map();
  for (const p of perms) {
    if (!byRole.has(p.rol_id)) byRole.set(p.rol_id, []);
    byRole.get(p.rol_id).push(p.modulo);
  }
  return roles.map((r) => ({
    ...r,
    modules: byRole.get(r.id) || [],
  }));
}

async function setRoleModules(roleId, modules = []) {
  const clean = [...new Set(modules.map(String))].filter((m) =>
    MODULE_KEYS.includes(m)
  );
  const [role] = await query("SELECT id, nombre FROM roles WHERE id = ?", [roleId]);
  if (!role) {
    const err = new Error("Rol no encontrado");
    err.status = 404;
    throw err;
  }
  // No dejar al admin sin módulo admin.
  if (role.nombre === "Administrador del sistema" && !clean.includes("admin")) {
    clean.push("admin");
  }
  await query("DELETE FROM roles_permisos WHERE rol_id = ?", [roleId]);
  for (const modulo of clean) {
    await query("INSERT INTO roles_permisos (rol_id, modulo) VALUES (?, ?)", [
      roleId,
      modulo,
    ]);
  }
  await reloadAccessMatrix();
  return clean;
}

function getAccess() {
  return ACCESS;
}

module.exports = {
  MODULE_CATALOG,
  MODULE_KEYS,
  DEFAULT_ROLE_MODULES,
  ensureRolePermissionsTable,
  reloadAccessMatrix,
  getModulesForRoleIds,
  getModulesForRoleNames,
  getRoleModulesMap,
  setRoleModules,
  getAccess,
};
