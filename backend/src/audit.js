const { query } = require("./db");

async function logAudit({ userId, action, entity, entityId, detail }) {
  await query(
    "INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle) VALUES (?, ?, ?, ?, ?)",
    [userId || null, action, entity, entityId || null, detail || null]
  );
}

function auditMiddleware(entity) {
  return async (req, _res, next) => {
    req.audit = async ({ action, entityId, detail }) => {
      const userId = req.user?.id || null;
      await logAudit({ userId, action, entity, entityId, detail });
    };
    next();
  };
}

module.exports = { logAudit, auditMiddleware };
