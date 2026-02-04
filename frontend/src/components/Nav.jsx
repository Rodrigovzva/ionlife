import { Link, useNavigate } from "react-router-dom";

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
          <Link className="nav-link" to="/">Inicio</Link>
          <Link className="nav-link" to="/clientes">Clientes</Link>
          <Link className="nav-link" to="/productos">Productos</Link>
          <Link className="nav-link" to="/almacenes">Almacenes</Link>
          <Link className="nav-link" to="/pedidos">Pedidos</Link>
          <Link className="nav-link" to="/logistica">Logística</Link>
          <Link className="nav-link" to="/reportes">Reportes</Link>
          {showDeliveries && (
            <Link className="nav-link" to="/mis-entregas">Mis entregas</Link>
          )}
          {isAdmin && (
            <Link className="nav-link" to="/admin">Administración</Link>
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
