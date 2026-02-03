const jwt = require("jsonwebtoken");

const { JWT_SECRET } = process.env;

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "No autorizado" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes("Administrador del sistema");
    const allowed =
      isAdmin || roles.length === 0 || roles.some((r) => userRoles.includes(r));
    if (!allowed) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
