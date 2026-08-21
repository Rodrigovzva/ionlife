import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import api from "./api";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Customers from "./pages/Customers.jsx";
import Products from "./pages/Products.jsx";
import Warehouses from "./pages/Warehouses.jsx";
import Orders from "./pages/Orders.jsx";
import Logistics from "./pages/Logistics.jsx";
import Reports from "./pages/Reports.jsx";
import Admin from "./pages/Admin.jsx";
import DriverDeliveries from "./pages/DriverDeliveries.jsx";
import EntregasMovil from "./pages/EntregasMovil.jsx";
import Nav from "./components/Nav.jsx";
import ChatPanel from "./components/ChatPanel.jsx";

// Debe reflejar el objeto ACCESS de backend/src/index.js: es una guarda de UI,
// la autorización real la hace el backend en cada endpoint.
const ACCESS = {
  customers: ["Administrador del sistema", "Supervisor de call center", "Operador de call center", "Repartidor", "Jefe de logística"],
  products: ["Administrador del sistema", "Supervisor de call center", "Encargado de almacén", "Repartidor"],
  warehouses: ["Administrador del sistema", "Encargado de almacén"],
  orders: ["Administrador del sistema", "Jefe de logística", "Supervisor de call center", "Operador de call center"],
  logistics: ["Administrador del sistema", "Jefe de logística", "Repartidor", "Supervisor de call center"],
  reports: ["Administrador del sistema", "Supervisor de call center", "Jefe de logística", "Repartidor"],
  admin: ["Administrador del sistema"],
};

function PrivateRoute({ user, children, denyDriver, allow }) {
  if (!user) return <Navigate to="/login" replace />;
  if (denyDriver && user?.roles?.includes("Repartidor")) {
    return <Navigate to="/entregas-movil" replace />;
  }
  if (allow && !allow.some((role) => user?.roles?.includes(role))) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const wideMisEntregas = location.pathname === "/mis-entregas";

  useEffect(() => {
    const token = localStorage.getItem("ionlife_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/api/auth/me")
      .then((res) => {
        setUser(res.data.user);
      })
      .catch(() => {
        localStorage.removeItem("ionlife_token");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app">
        <div className="container page">Cargando...</div>
      </div>
    );
  }

  return (
    <div
      className={
        wideMisEntregas ? "app app--mis-entregas-wide" : "app"
      }
    >
      {user && <Nav user={user} onLogout={() => setUser(null)} />}
      {user && <ChatPanel user={user} />}
      <Routes>
        <Route
          path="/login"
          element={<Login onLogin={setUser} />}
        />
        <Route
          path="/"
          element={
            <PrivateRoute user={user}>
              <Dashboard user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <PrivateRoute user={user} allow={ACCESS.customers}>
              <Customers user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <PrivateRoute user={user} allow={ACCESS.products}>
              <Products />
            </PrivateRoute>
          }
        />
        <Route
          path="/almacenes"
          element={
            <PrivateRoute user={user} allow={ACCESS.warehouses}>
              <Warehouses />
            </PrivateRoute>
          }
        />
        <Route
          path="/pedidos"
          element={
            <PrivateRoute
              user={user}
              allow={[...ACCESS.orders, "Repartidor"]}
            >
              <Orders user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/logistica"
          element={
            <PrivateRoute user={user} allow={ACCESS.logistics}>
              <Logistics user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <PrivateRoute user={user} allow={ACCESS.reports}>
              <Reports />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute user={user} allow={ACCESS.admin}>
              <Admin />
            </PrivateRoute>
          }
        />
        <Route
          path="/mis-entregas"
          element={
            <PrivateRoute user={user} denyDriver allow={ACCESS.logistics}>
              <DriverDeliveries />
            </PrivateRoute>
          }
        />
        <Route
          path="/entregas-movil"
          element={
            <PrivateRoute user={user} allow={ACCESS.logistics}>
              <EntregasMovil />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
