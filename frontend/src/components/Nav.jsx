import { Link, NavLink, useNavigate } from "react-router-dom";

function hasModule(user, moduleKey) {
  if (!user) return false;
  if (user.roles?.includes("Administrador del sistema")) return true;
  return (user.modules || []).includes(moduleKey);
}

export default function Nav({ user, onLogout }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("ionlife_token");
    onLogout?.();
    navigate("/login");
  }

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link className="nav-brand" to="/">Ionlife</Link>
        <div className="nav-links">
          <NavLink className="nav-link" to="/">Inicio</NavLink>
          {hasModule(user, "customers") && (
            <NavLink className="nav-link" to="/clientes">Clientes</NavLink>
          )}
          {hasModule(user, "products") && (
            <NavLink className="nav-link" to="/productos">Productos</NavLink>
          )}
          {hasModule(user, "warehouses") && (
            <NavLink className="nav-link" to="/almacenes">Almacenes</NavLink>
          )}
          {hasModule(user, "orders") && (
            <NavLink className="nav-link" to="/pedidos">Pedidos</NavLink>
          )}
          {hasModule(user, "logistics") && (
            <NavLink className="nav-link" to="/logistica">Logística</NavLink>
          )}
          {hasModule(user, "reports") && (
            <NavLink className="nav-link" to="/reportes">Reportes</NavLink>
          )}
          {hasModule(user, "deliveries") && (
            <>
              {!user?.roles?.includes("Repartidor") && (
                <NavLink className="nav-link" to="/mis-entregas">Mis entregas</NavLink>
              )}
              <NavLink className="nav-link" to="/entregas-movil">Entregas móvil</NavLink>
            </>
          )}
          {hasModule(user, "admin") && (
            <NavLink className="nav-link" to="/admin">Administración</NavLink>
          )}
        </div>
        <div className="nav-user">
          <span className="nav-user-name">{user?.email}</span>
          <button className="btn btn-outline nav-logout" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
