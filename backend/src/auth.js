const jwt = require("jsonwebtoken");
const { query } = require("./db");

const { JWT_SECRET } = process.env;

// Estado vigente del usuario (activo + roles) leído de BD con una caché corta, para que
// desactivar un usuario o cambiar sus roles tenga efecto sin esperar a que venza el token.
const USER_STATE_TTL_MS = 30 * 1000;
const userStateCache = new Map();

async function getCurrentUserState(userId) {
  const cached = userStateCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.state;
  }
  const [user] = await query("SELECT activo FROM usuarios WHERE id = ?", [userId]);
  const roles = user
    ? await query(
        "SELECT r.nombre FROM roles r JOIN usuarios_roles ur ON ur.rol_id = r.id WHERE ur.usuario_id = ?",
        [userId]
      )
    : [];
  const state = { active: Boolean(user?.activo), roles: roles.map((r) => r.nombre) };
  userStateCache.set(userId, { state, expiresAt: Date.now() + USER_STATE_TTL_MS });
  return state;
}

function invalidateUserState(userId) {
  userStateCache.delete(Number(userId));
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "No autorizado" });
  }
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
  try {
    const state = await getCurrentUserState(Number(payload.id));
    if (!state.active) {
      return res.status(401).json({ error: "Usuario inactivo" });
    }
    req.user = { ...payload, roles: state.roles };
    return next();
  } catch (err) {
    return next(err);
  }
}

// `roles` puede ser un arreglo o una función que lo devuelve; la función se
// evalúa en cada petición para respetar los permisos recargados desde BD.
// Una lista vacía solo permite al administrador.
function requireRole(roles = []) {
  return (req, res, next) => {
    const allowedRoles = (typeof roles === "function" ? roles() : roles) || [];
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.includes("Administrador del sistema");
    const allowed = isAdmin || allowedRoles.some((r) => userRoles.includes(r));
    if (!allowed) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole, invalidateUserState };
