import { useEffect, useState } from "react";
import api from "../api";

function statusClass(status) {
  if (!status) return "tag";
  const normalized = status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
  return `tag status-${normalized}`;
}

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState([]);
  const [deliveriesByStatus, setDeliveriesByStatus] = useState([]);
  const [stock, setStock] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    const toIso = to.toISOString().slice(0, 10);
    const fromIso = from.toISOString().slice(0, 10);
    return { from: fromIso, to: toIso, sales_status: "all" };
  });
  const [summaryRows, setSummaryRows] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [trucks, setTrucks] = useState([]);
  const [summaryFilters, setSummaryFilters] = useState({
    date: "",
    truck_id: "",
    status: "",
  });

  async function load(nextRange) {
    setLoading(true);
    setError("");
    try {
      const params = nextRange || range;
      const [s, o, d, st, p] = await Promise.all([
        api.get("/api/reports/sales", { params }),
        api.get("/api/reports/orders-by-status"),
        api.get("/api/reports/deliveries"),
        api.get("/api/reports/stock-by-warehouse"),
        api.get("/api/reports/performance"),
      ]);
      setSales(s.data || []);
      setOrdersByStatus(o.data || []);
      setDeliveriesByStatus(d.data || []);
      setStock(st.data || []);
      setPerformance(p.data || []);
    } catch (_err) {
      setError("No se pudo cargar reportes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadSummaryOptions();
    loadSummary();
  }, []);

  async function loadSummaryOptions() {
    try {
      const [t] = await Promise.all([
        api.get("/api/reports/trucks"),
      ]);
      setTrucks(t.data || []);
    } catch (_err) {
      setTrucks([]);
    }
  }

  async function loadSummary(nextFilters) {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const params = nextFilters || summaryFilters;
      const dateValue = params.date;
      const rangeParams = {
        ...params,
        from: dateValue || "",
        to: dateValue || "",
      };
      const res = await api.get("/api/reports/orders-summary", { params: rangeParams });
      setSummaryRows(res.data || []);
    } catch (_err) {
      setSummaryError("No se pudo cargar el resumen.");
    } finally {
      setSummaryLoading(false);
    }
  }

  const salesTotal = sales.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const summaryTotal = summaryRows.length;

  function printReport() {
    const now = new Date().toLocaleString();
    const summaryFilterText = `Filtro: fecha=${summaryFilters.date || "-"}, estado=${summaryFilters.status || "-"}, camión=${summaryFilters.truck_id || "-"}`;
    const summaryRowsHtml = summaryRows
      .map(
        (s) =>
          `<tr><td>${s.order_id}</td><td>${s.customer_name}</td><td>${s.address || "-"}</td><td>${s.status}</td><td>${
            s.created_at ? new Date(s.created_at).toLocaleString() : "-"
          }</td><td>${s.truck_plate || "-"}</td><td>${s.driver_name || "-"}</td><td>${s.seller_name || "-"}</td></tr>`
      )
      .join("");

    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Resumen de estados de pedidos</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #1b2a3a; }
            h2 { margin: 0 0 6px; }
            .meta { color: #6b7a8c; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th, td { border: 1px solid #d9e3ec; padding: 6px 8px; text-align: left; font-size: 12px; }
            th { background: #eef5fb; }
          </style>
        </head>
        <body>
          <h2>Resumen de estados de pedidos</h2>
          <div class="meta">Fecha impresión: ${now}</div>
          <div class="meta">${summaryFilterText}</div>
          <table>
            <thead>
              <tr><th>Pedido</th><th>Nombre</th><th>Dirección</th><th>Estado</th><th>Fecha</th><th>Camión</th><th>Repartidor</th><th>Vendedor</th></tr>
            </thead>
            <tbody>${summaryRowsHtml || "<tr><td colspan='8'>Sin datos.</td></tr>"}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="container page">
      <h2>Reportes</h2>
      <div className="card" style={{ marginBottom: 16 }}>
        <h4>Resumen de estados de pedidos</h4>
        <div className="form-row report-filters">
          <input
            type="date"
            value={summaryFilters.date}
            onChange={(e) =>
              setSummaryFilters({ ...summaryFilters, date: e.target.value })
            }
          />
          <select
            value={summaryFilters.status}
            onChange={(e) =>
              setSummaryFilters({ ...summaryFilters, status: e.target.value })
            }
          >
            <option value="">Todos los estados</option>
            <option>Pendiente</option>
            <option>Despachado</option>
            <option>Entregado</option>
            <option>Cancelado</option>
            <option>Reprogramado</option>
          </select>
          <select
            value={summaryFilters.truck_id}
            onChange={(e) =>
              setSummaryFilters({ ...summaryFilters, truck_id: e.target.value })
            }
          >
            <option value="">Todos los camiones</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.plate}
              </option>
            ))}
          </select>
          <div className="report-actions">
            <button
              className="btn"
              type="button"
              disabled={summaryLoading}
              onClick={() => loadSummary(summaryFilters)}
            >
              {summaryLoading ? "Cargando..." : "Aplicar"}
            </button>
            <button className="btn btn-outline" type="button" onClick={printReport}>
              Imprimir
            </button>
          </div>
        </div>
        {summaryError && <div className="error">{summaryError}</div>}
        <div style={{ marginTop: 8 }}>
          Total pedidos: <strong>{summaryTotal}</strong>
        </div>
        <table className="table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Nombre</th>
              <th>Dirección</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Camión</th>
              <th>Repartidor</th>
              <th>Vendedor</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((s) => (
              <tr key={s.order_id}>
                <td>{s.order_id}</td>
                <td>{s.customer_name}</td>
                <td>{s.address || "-"}</td>
                <td><span className={statusClass(s.status)}>{s.status}</span></td>
                <td>{s.created_at ? new Date(s.created_at).toLocaleString() : "-"}</td>
                <td>{s.truck_plate || "-"}</td>
                <td>{s.driver_name || "-"}</td>
                <td>{s.seller_name || "-"}</td>
              </tr>
            ))}
            {summaryRows.length === 0 && (
              <tr>
                <td colSpan={8}>Sin datos.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-row">
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
          <select
            value={range.sales_status}
            onChange={(e) =>
              setRange({ ...range, sales_status: e.target.value })
            }
          >
            <option value="all">Ventas: Todos</option>
            <option value="Entregado">Ventas: Entregado</option>
            <option value="Confirmado">Ventas: Confirmado</option>
            <option value="Despachado">Ventas: Despachado</option>
            <option value="En ruta">Ventas: En ruta</option>
            <option value="Creado">Ventas: Creado</option>
            <option value="Cancelado">Ventas: Cancelado</option>
          </select>
          <button
            className="btn"
            type="button"
            disabled={loading}
            onClick={() => load(range)}
          >
            {loading ? "Cargando..." : "Aplicar"}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h4>Ventas por día</h4>
          <div style={{ marginBottom: 8 }}>
            Total periodo: <strong>Bs. {salesTotal.toFixed(2)}</strong>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.day}>
                  <td>{s.day}</td>
                  <td>Bs. {Number(s.total || 0).toFixed(2)}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={2}>No hay ventas en el periodo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Pedidos por estado</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ordersByStatus.map((o) => (
                <tr key={o.status}>
                  <td><span className={statusClass(o.status)}>{o.status}</span></td>
                  <td>{o.total}</td>
                </tr>
              ))}
              {ordersByStatus.length === 0 && (
                <tr>
                  <td colSpan={2}>Sin datos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Entregas por estado</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {deliveriesByStatus.map((d) => (
                <tr key={d.status}>
                  <td><span className={statusClass(d.status)}>{d.status}</span></td>
                  <td>{d.total}</td>
                </tr>
              ))}
              {deliveriesByStatus.length === 0 && (
                <tr>
                  <td colSpan={2}>Sin datos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Stock por almacén</h4>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Almacén</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s, idx) => (
                  <tr key={`${s.warehouse}-${idx}`}>
                    <td>{s.warehouse}</td>
                    <td>{s.product}</td>
                    <td>{s.quantity}</td>
                    <td>
                      {Number(s.quantity) <= Number(s.min_stock) ? (
                        <span className="tag">Bajo stock</span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {stock.length === 0 && (
                  <tr>
                    <td colSpan={4}>Sin datos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h4>Rendimiento por camión y repartidor</h4>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Camión</th>
                  <th>Repartidor</th>
                  <th>Entregas</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((p, idx) => (
                  <tr key={`${p.plate}-${idx}`}>
                    <td>{p.plate}</td>
                    <td>{p.driver}</td>
                    <td>{p.total_deliveries}</td>
                  </tr>
                ))}
                {performance.length === 0 && (
                  <tr>
                    <td colSpan={3}>Sin datos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
