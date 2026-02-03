import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import Nav from "./components/Nav.jsx";

function PrivateRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <div className="app">
      {user && <Nav user={user} onLogout={() => setUser(null)} />}
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
            <PrivateRoute user={user}>
              <Customers />
            </PrivateRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <PrivateRoute user={user}>
              <Products />
            </PrivateRoute>
          }
        />
        <Route
          path="/almacenes"
          element={
            <PrivateRoute user={user}>
              <Warehouses />
            </PrivateRoute>
          }
        />
        <Route
          path="/pedidos"
          element={
            <PrivateRoute user={user}>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route
          path="/logistica"
          element={
            <PrivateRoute user={user}>
              <Logistics />
            </PrivateRoute>
          }
        />
        <Route
          path="/reportes"
          element={
            <PrivateRoute user={user}>
              <Reports />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute user={user}>
              <Admin />
            </PrivateRoute>
          }
        />
        <Route
          path="/mis-entregas"
          element={
            <PrivateRoute user={user}>
              <DriverDeliveries />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
