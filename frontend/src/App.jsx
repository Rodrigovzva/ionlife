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

function userHasModule(user, moduleKey) {
  if (!user) return false;
  if (user.roles?.includes("Administrador del sistema")) return true;
  return (user.modules || []).includes(moduleKey);
}

function PrivateRoute({ user, children, allowModules, denyDriver }) {
  if (!user) return <Navigate to="/login" replace />;
  if (denyDriver && user?.roles?.includes("Repartidor") && !userHasModule(user, "admin")) {
    return <Navigate to="/entregas-movil" replace />;
  }
  if (
    allowModules &&
    !allowModules.some((moduleKey) => userHasModule(user, moduleKey))
  ) {
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
            <PrivateRoute user={user} allowModules={["customers"]}>
              <Customers user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <PrivateRoute user={user} allowModules={["products"]}>
              <Products />
            </PrivateRoute>
          }
        />
        <Route
          path="/almacenes"
          element={
            <PrivateRoute user={user} allowModules={["warehouses"]}>
              <Warehouses />
            </PrivateRoute>
          }
        />
        <Route
          path="/pedidos"
          element={
            <PrivateRoute user={user} allowModules={["orders", "deliveries"]}>
              <Orders user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/logistica"
          element={
            <PrivateRoute user={user} allowModules={["logistics"]}>
              <Logistics user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <PrivateRoute user={user} allowModules={["reports"]}>
              <Reports />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute user={user} allowModules={["admin"]}>
              <Admin />
            </PrivateRoute>
          }
        />
        <Route
          path="/mis-entregas"
          element={
            <PrivateRoute user={user} denyDriver allowModules={["deliveries", "logistics"]}>
              <DriverDeliveries />
            </PrivateRoute>
          }
        />
        <Route
          path="/entregas-movil"
          element={
            <PrivateRoute user={user} allowModules={["deliveries", "logistics"]}>
              <EntregasMovil />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
