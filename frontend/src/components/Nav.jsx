import { Link, NavLink, useNavigate } from "react-router-dom";

export default function Nav({ user, onLogout }) {
  const navigate = useNavigate();
  const isAdmin = user?.roles?.includes("Administrador del sistema");
  const isDriver = user?.roles?.includes("Repartidor");
  const showDeliveries = isDriver || isAdmin;

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
          {isDriver ? (
            <>
              <NavLink className="nav-link" to="/logistica">Logística</NavLink>
              <NavLink className="nav-link" to="/mis-entregas">Mis entregas</NavLink>
            </>
          ) : (
            <>
              <NavLink className="nav-link" to="/clientes">Clientes</NavLink>
              <NavLink className="nav-link" to="/productos">Productos</NavLink>
              <NavLink className="nav-link" to="/almacenes">Almacenes</NavLink>
              <NavLink className="nav-link" to="/pedidos">Pedidos</NavLink>
              <NavLink className="nav-link" to="/logistica">Logística</NavLink>
              <NavLink className="nav-link" to="/reportes">Reportes</NavLink>
              {showDeliveries && (
                <NavLink className="nav-link" to="/mis-entregas">Mis entregas</NavLink>
              )}
              {isAdmin && (
                <NavLink className="nav-link" to="/admin">Administración</NavLink>
              )}
            </>
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
