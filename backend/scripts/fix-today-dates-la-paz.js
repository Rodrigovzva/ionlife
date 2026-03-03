/**
 * Ajusta registros creados recientemente para que su fecha de creación
 * sea "hoy" en La Paz, Bolivia (America/La_Paz).
 * Solo toca registros de las últimas 48 horas cuya fecha en La Paz no es hoy.
 */
const path = require("path");
try {
  require("dotenv").config({ path: path.join(__dirname, "../../.env") });
} catch (_) {}

const { pool } = require("../src/db");

function getTodayLaPaz() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

async function run() {
  const todayLaPaz = getTodayLaPaz();
  const conn = await pool.getConnection();

  try {
    await conn.query("SET time_zone = '+00:00'");
    const [rows] = await conn.query(
      "SELECT CONVERT_TZ(CONCAT(?, ' 12:00:00'), '-04:00', '+00:00') as utc_noon",
      [todayLaPaz]
    );
    const noonUtc = rows[0]?.utc_noon;
    if (!noonUtc) {
      console.error("No se pudo calcular la fecha.");
      process.exit(1);
    }

    const tables = [
      { table: "clientes", col: "fecha_creacion" },
      { table: "direcciones_clientes", col: "fecha_creacion" },
      { table: "pedidos", col: "fecha_creacion" },
      { table: "items_pedido", col: "fecha_creacion" },
      { table: "historial_estado_pedido", col: "fecha_creacion" },
      { table: "pagos", col: "fecha_creacion" },
      { table: "entregas", col: "fecha_creacion" },
      { table: "movimientos_inventario", col: "fecha_creacion" },
      { table: "devoluciones_registro", col: "creado_en" },
    ];

    let totalUpdated = 0;
    for (const { table, col } of tables) {
      const sql = `UPDATE \`${table}\` SET \`${col}\` = ? 
         WHERE DATE(CONVERT_TZ(\`${col}\`, '+00:00', '-04:00')) != ? 
         AND \`${col}\` >= DATE_SUB(NOW(), INTERVAL 48 HOUR)`;
      const [result] = await conn.query(sql, [noonUtc, todayLaPaz]);
      const n = result.affectedRows || 0;
      if (n > 0) {
        console.log(`  ${table}: ${n} registro(s) actualizado(s)`);
        totalUpdated += n;
      }
    }

    console.log(`\nFecha de hoy en La Paz: ${todayLaPaz}`);
    console.log(`Total registros corregidos: ${totalUpdated}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    conn.release();
    pool.end();
  }
}

run();
