/**
 * Vacía las tablas indicadas y reinicia los AUTO_INCREMENT.
 * Uso con Docker (desde la raíz del proyecto):
 *   docker compose run --rm --env-file .env -v $(pwd)/backend:/app backend node scripts/run-truncate.js
 * O con Node local (requiere .env en la raíz):
 *   cd backend && node -r dotenv/config scripts/run-truncate.js (DOTENV_CONFIG_PATH=../.env)
 */
const path = require("path");
try {
  require("dotenv").config({ path: path.join(__dirname, "../../.env") });
} catch (_) {
  // dotenv opcional si las env ya vienen inyectadas (ej. Docker --env-file)
}

const { pool } = require("../src/db");

const TABLES = [
  "movimientos_inventario",
  "items_pedido",
  "historial_estado_pedido",
  "pagos",
  "incidencias_entrega",
  "entregas",
  "devoluciones_registro",
  "pedidos",
  "inventario",
  "direcciones_clientes",
  "clientes",
];

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of TABLES) {
      await conn.query(`TRUNCATE TABLE ??`, [table]);
      console.log(`  ✓ ${table}`);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("\nTablas vaciadas e IDs reiniciados correctamente.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    conn.release();
    pool.end();
  }
}

run();
