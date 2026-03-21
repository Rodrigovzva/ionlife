const mysql = require("mysql2/promise");

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Ejecuta fn(exec) dentro de una transacción. Hace rollback automático si fn lanza error.
// exec(sql, params) es equivalente a query() pero usa la misma conexión.
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const exec = (sql, params = []) =>
      conn.execute(sql, params).then(([rows]) => rows);
    const result = await fn(exec);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, withTransaction };
