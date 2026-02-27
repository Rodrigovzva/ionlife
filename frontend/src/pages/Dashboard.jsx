import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function Dashboard({ user }) {
  const [sales, setSales] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState([]);
  const [stock, setStock] = useState([]);
  const [salesByType, setSalesByType] = useState([]);
  const [deliveriesByTruck, setDeliveriesByTruck] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      status: "Entregado",
    };
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        api.get("/api/reports/sales", { params: range }),
        api.get("/api/reports/orders-by-status"),
        api.get("/api/reports/stock-by-warehouse"),
        api.get("/api/reports/sales-by-client-type", { params: range }),
        api.get("/api/reports/deliveries-by-truck", { params: range }),
      ]);
      const [s, o, st, sct, dt] = results;
      if (s.status === "fulfilled") setSales(s.value.data || []);
      if (o.status === "fulfilled") setOrdersByStatus(o.value.data || []);
      if (st.status === "fulfilled") setStock(st.value.data || []);
      if (sct.status === "fulfilled") setSalesByType(sct.value.data || []);
      if (dt.status === "fulfilled") setDeliveriesByTruck(dt.value.data || []);
      if (results.every((r) => r.status === "rejected")) {
        setError("No se pudieron cargar las gráficas.");
      }
    } catch (_err) {
      setError("No se pudieron cargar las gráficas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const salesChart = {
    labels: sales.map((s) =>
      s.day ? new Date(`${String(s.day).slice(0, 10)}T12:00:00`).toLocaleDateString("es") : "-"
    ),
    datasets: [
      {
        label: "Ventas (Bs.)",
        data: sales.map((s) => Number(s.total || 0)),
        backgroundColor: "#1fbba6",
      },
    ],
  };

  const ordersStatusChart = {
    labels: ordersByStatus.map((o) => o.status),
    datasets: [
      {
        data: ordersByStatus.map((o) => Number(o.total || 0)),
        backgroundColor: ["#0b6fa4", "#1fbba6", "#f0b429", "#d64545", "#9a6bff"],
      },
    ],
  };

  const stockByWarehouse = stock.reduce((acc, row) => {
    acc[row.warehouse] = (acc[row.warehouse] || 0) + Number(row.quantity || 0);
    return acc;
  }, {});
  const stockChart = {
    labels: Object.keys(stockByWarehouse),
    datasets: [
      {
        label: "Stock total",
        data: Object.values(stockByWarehouse),
        backgroundColor: "#0b6fa4",
      },
    ],
  };

  const salesByTypeChart = {
    labels: salesByType.map((r) => r.type),
    datasets: [
      {
        data: salesByType.map((r) => Number(r.total || 0)),
        backgroundColor: ["#1fbba6", "#0b6fa4", "#f0b429", "#9a6bff"],
      },
    ],
  };

  const deliveriesByTruckChart = {
    labels: deliveriesByTruck.map((r) => r.truck),
    datasets: [
      {
        label: "Entregas",
        data: deliveriesByTruck.map((r) => Number(r.total || 0)),
        backgroundColor: "#f0b429",
      },
    ],
  };

  const chartOptions = { responsive: true, maintainAspectRatio: false };

  return (
    <div className="container page">
      <h2>Panel principal</h2>
      <p style={{ color: "var(--muted)" }}>Bienvenido/a, {user?.email}</p>
      {error && <div className="error">{error}</div>}
      <div className="grid grid-2">
        <div className="card">
          <h4>Ventas por día</h4>
          <div style={{ height: 260 }}>
            {loading ? "Cargando..." : <Bar data={salesChart} options={chartOptions} />}
          </div>
        </div>
        <div className="card">
          <h4>Pedidos por estado</h4>
          <div style={{ height: 260 }}>
            {loading ? "Cargando..." : <Pie data={ordersStatusChart} options={chartOptions} />}
          </div>
        </div>
        <div className="card">
          <h4>Stock por almacén</h4>
          <div style={{ height: 260 }}>
            {loading ? "Cargando..." : <Bar data={stockChart} options={chartOptions} />}
          </div>
        </div>
        <div className="card">
          <h4>Ventas por tipo de cliente</h4>
          <div style={{ height: 260 }}>
            {loading ? "Cargando..." : <Pie data={salesByTypeChart} options={chartOptions} />}
          </div>
        </div>
        <div className="card">
          <h4>Entregas por camión</h4>
          <div style={{ height: 260 }}>
            {loading ? "Cargando..." : <Bar data={deliveriesByTruckChart} options={chartOptions} />}
          </div>
        </div>
      </div>
    </div>
  );
}
