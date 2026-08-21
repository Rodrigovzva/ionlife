const { query } = require("./db");

const SALA_GLOBAL = "global";

async function ensureChatTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS mensajes_chat (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      usuario_nombre VARCHAR(120) NOT NULL,
      sala VARCHAR(20) NOT NULL DEFAULT 'global',
      contenido TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sala_created (sala, created_at),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS chat_lecturas (
      usuario_id INT NOT NULL,
      sala VARCHAR(20) NOT NULL,
      last_read_at DATETIME NOT NULL,
      PRIMARY KEY (usuario_id, sala),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
}

async function getMensajes(limit = 50) {
  const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const rows = await query(
    `SELECT id, usuario_id, usuario_nombre, sala, contenido, created_at
     FROM mensajes_chat
     WHERE sala = ?
     ORDER BY created_at DESC
     LIMIT ${l}`,
    [SALA_GLOBAL]
  );
  return rows.reverse();
}

async function saveMensaje(usuarioId, usuarioNombre, contenido) {
  const texto = String(contenido || "").trim().slice(0, 1000);
  if (!texto) {
    const err = new Error("Mensaje vacío");
    err.status = 400;
    throw err;
  }
  const result = await query(
    `INSERT INTO mensajes_chat (usuario_id, usuario_nombre, sala, contenido)
     VALUES (?, ?, ?, ?)`,
    [usuarioId, usuarioNombre || "Usuario", SALA_GLOBAL, texto]
  );
  const [row] = await query(
    `SELECT id, usuario_id, usuario_nombre, sala, contenido, created_at
     FROM mensajes_chat WHERE id = ?`,
    [result.insertId]
  );
  return row;
}

async function getNoLeidos(usuarioId) {
  const [lectura] = await query(
    "SELECT last_read_at FROM chat_lecturas WHERE usuario_id = ? AND sala = ?",
    [usuarioId, SALA_GLOBAL]
  );
  if (lectura?.last_read_at) {
    const [row] = await query(
      `SELECT COUNT(*) AS cnt FROM mensajes_chat
       WHERE sala = ? AND created_at > ? AND usuario_id <> ?`,
      [SALA_GLOBAL, lectura.last_read_at, usuarioId]
    );
    return Number(row?.cnt || 0);
  }
  const [row] = await query(
    `SELECT COUNT(*) AS cnt FROM mensajes_chat
     WHERE sala = ? AND usuario_id <> ?`,
    [SALA_GLOBAL, usuarioId]
  );
  return Number(row?.cnt || 0);
}

async function marcarLeido(usuarioId) {
  await query(
    `INSERT INTO chat_lecturas (usuario_id, sala, last_read_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE last_read_at = NOW()`,
    [usuarioId, SALA_GLOBAL]
  );
}

module.exports = {
  SALA_GLOBAL,
  ensureChatTables,
  getMensajes,
  saveMensaje,
  getNoLeidos,
  marcarLeido,
};
