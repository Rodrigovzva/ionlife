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
          <Link to="/">Inicio</Link>
          <Link to="/clientes">Clientes</Link>
          <Link to="/productos">Productos</Link>
          <Link to="/almacenes">Almacenes</Link>
          <Link to="/pedidos">Pedidos</Link>
          <Link to="/logistica">Logística</Link>
          <Link to="/reportes">Reportes</Link>
          {showDeliveries && <Link to="/mis-entregas">Mis entregas</Link>}
          {isAdmin && <Link to="/admin">Administración</Link>}
        </div>
        <div className="nav-user">
          <span>{user?.email}</span>
          <button className="btn btn-outline" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
