export default function Dashboard({ user }) {
  return (
    <div className="container page">
      <h2>Panel principal</h2>
      <p style={{ color: "var(--muted)" }}>Bienvenido/a, {user?.email}</p>
      <div className="grid grid-2">
        <div className="card">
          <h3>Operación diaria</h3>
          <ul>
            <li>Gestión de clientes y direcciones</li>
            <li>Pedidos y estados</li>
            <li>Logística y entregas</li>
          </ul>
        </div>
        <div className="card">
          <h3>Inventario y control</h3>
          <ul>
            <li>Productos y precios</li>
            <li>Almacenes e inventario</li>
            <li>Reportes operativos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
