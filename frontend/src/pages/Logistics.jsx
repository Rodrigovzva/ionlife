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

export default function Logistics() {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [bulkForm, setBulkForm] = useState({
    truck_id: "",
    driver_id: "",
  });
  const [bulkSelection, setBulkSelection] = useState({});
  const [bulkError, setBulkError] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [summaryTruckId, setSummaryTruckId] = useState("");
  const [truckSummary, setTruckSummary] = useState({
    total_orders: 0,
    total_items: 0,
    total_value: 0,
  });
  const [summaryError, setSummaryError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [returnForm, setReturnForm] = useState({
    truck_id: "",
    order_id: "",
    cash_amount: "",
  });
  const [truckOrders, setTruckOrders] = useState([]);
  const [returnError, setReturnError] = useState("");
  const [printTruckId, setPrintTruckId] = useState("");
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState("");

  async function load() {
    const [t, d, p] = await Promise.all([
      api.get("/api/logistics/trucks"),
      api.get("/api/logistics/drivers"),
      api.get("/api/logistics/pending-orders"),
    ]);
    setTrucks(t.data);
    setDrivers(d.data);
    setPendingOrders(p.data || []);
  }

  async function loadDeliveries() {
    const res = await api.get("/api/reports/deliveries");
    setDeliveries(res.data);
  }

  async function loadPendingOrders() {
    const res = await api.get("/api/logistics/pending-orders");
    setPendingOrders(res.data || []);
    setBulkSelection({});
    setBulkResult(null);
  }

  async function loadTruckSummary(truckId) {
    if (!truckId) {
      setTruckSummary({ total_orders: 0, total_items: 0, total_value: 0 });
      return;
    }
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const res = await api.get("/api/logistics/truck-summary", {
        params: { truck_id: truckId },
      });
      setTruckSummary(res.data || { total_orders: 0, total_items: 0, total_value: 0 });
    } catch (_err) {
      setSummaryError("No se pudo cargar el resumen del camión.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadTruckOrders(truckId) {
    if (!truckId) {
      setTruckOrders([]);
      return;
    }
    const res = await api.get("/api/logistics/truck-orders", {
      params: { truck_id: truckId },
    });
    setTruckOrders(res.data || []);
  }

  useEffect(() => {
    load();
    loadDeliveries();
    loadPendingOrders();
  }, []);

  function toggleBulkSelection(orderId) {
    setBulkSelection((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }

  function toggleAllBulk(selectAll) {
    if (!selectAll) {
      setBulkSelection({});
      return;
    }
    const next = {};
    pendingOrders.forEach((o) => {
      next[o.id] = true;
    });
    setBulkSelection(next);
  }

  async function assignBulk(e) {
    e.preventDefault();
    setBulkError("");
    setBulkResult(null);
    const orderIds = Object.keys(bulkSelection).filter((id) => bulkSelection[id]);
    if (orderIds.length === 0 || !bulkForm.truck_id || !bulkForm.driver_id) {
      setBulkError("Seleccione pedidos, camión y repartidor.");
      return;
    }
    setBulkLoading(true);
    try {
      const res = await api.post("/api/logistics/deliveries/bulk", {
        order_ids: orderIds.map(Number),
        truck_id: Number(bulkForm.truck_id),
        driver_id: Number(bulkForm.driver_id),
      });
      setBulkResult(res.data);
      await loadPendingOrders();
      await loadDeliveries();
    } catch (_err) {
      setBulkError("No se pudo asignar en forma masiva.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleReturn(e) {
    e.preventDefault();
    setReturnError("");
    if (!returnForm.truck_id || !returnForm.order_id) {
      setReturnError("Seleccione camión y pedido.");
      return;
    }
    await api.post("/api/logistics/returns", {
      truck_id: Number(returnForm.truck_id),
      order_id: Number(returnForm.order_id),
      cash_amount: returnForm.cash_amount ? Number(returnForm.cash_amount) : 0,
    });
    setReturnForm({ truck_id: returnForm.truck_id, order_id: "", cash_amount: "" });
    loadTruckSummary(returnForm.truck_id);
    loadTruckOrders(returnForm.truck_id);
  }

  async function printRouteSheet() {
    setPrintError("");
    if (!printTruckId) {
      setPrintError("Seleccione un camión.");
      return;
    }
    setPrintLoading(true);
    try {
      const res = await api.get("/api/logistics/truck-orders", {
        params: { truck_id: printTruckId },
      });
      const orders = res.data || [];
      const truck = trucks.find((t) => String(t.id) === String(printTruckId));
      const title = `Hoja de ruta - ${truck?.plate || "Camión"}`;
      const now = new Date().toLocaleString();
      const rowsHtml = orders
        .map(
          (o) => `
            <tr>
              <td>${o.id}</td>
              <td>${o.customer_name || "-"}</td>
              <td>${o.phone || "-"}</td>
              <td>${o.zona || "-"}</td>
              <td>${o.address || "-"}</td>
              <td>${o.status || "-"}</td>
            </tr>
          `
        )
        .join("");
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) {
        setPrintError("No se pudo abrir la ventana de impresión.");
        return;
      }
      win.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; }
              h2 { margin: 0 0 6px; }
              .meta { color: #555; margin-bottom: 16px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
              th { background: #f2f4f7; }
            </style>
          </head>
          <body>
            <h2>${title}</h2>
            <div class="meta">Fecha: ${now}</div>
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Zona</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || "<tr><td colspan='6'>No hay pedidos asignados.</td></tr>"}
              </tbody>
            </table>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
    } catch (_err) {
      setPrintError("No se pudo generar la hoja de ruta.");
    } finally {
      setPrintLoading(false);
    }
  }

  return (
    <div className="container page">
      <h2>Logística</h2>
      <div className="grid">
        <div className="card">
          <h4>Asignar pedidos pendientes (masivo)</h4>
          <div className="form-row">
            <button
              className="btn btn-outline"
              type="button"
              onClick={loadPendingOrders}
            >
              Cargar pedidos pendientes
            </button>
          </div>
          <form onSubmit={assignBulk} className="form" style={{ marginTop: 8 }}>
            <div className="form-row">
              <select
                value={bulkForm.truck_id}
                onChange={(e) =>
                  setBulkForm({ ...bulkForm, truck_id: e.target.value })
                }
              >
                <option value="">Seleccione camión</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.plate} {t.capacity ? `(${t.capacity})` : ""}
                  </option>
                ))}
              </select>
              <select
                value={bulkForm.driver_id}
                onChange={(e) =>
                  setBulkForm({ ...bulkForm, driver_id: e.target.value })
                }
              >
                <option value="">Seleccione repartidor</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button className="btn" type="submit" disabled={bulkLoading}>
                {bulkLoading ? "Asignando..." : "Asignar seleccionados"}
              </button>
            </div>
          </form>
          {bulkError && <div className="error">{bulkError}</div>}
          {bulkResult && (
            <div className="tag" style={{ marginTop: 8 }}>
              Asignados: {bulkResult.assigned} | Omitidos: {bulkResult.skipped}
            </div>
          )}
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      pendingOrders.length > 0 &&
                      pendingOrders.every((o) => bulkSelection[o.id])
                    }
                    onChange={(e) => toggleAllBulk(e.target.checked)}
                  />
                </th>
                <th>ID</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Zona</th>
                <th>Dirección</th>
                <th>Tel. principal</th>
              </tr>
            </thead>
            <tbody>
              {pendingOrders.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!bulkSelection[p.id]}
                      onChange={() => toggleBulkSelection(p.id)}
                    />
                  </td>
                  <td>{p.id}</td>
                  <td>{p.customer_name}</td>
                  <td><span className={statusClass(p.status)}>{p.status}</span></td>
                  <td>{p.zona || "-"}</td>
                  <td>{p.direccion || "-"}</td>
                  <td>{p.phone || "-"}</td>
                </tr>
              ))}
              {pendingOrders.length === 0 && (
                <tr>
                  <td colSpan={7}>No hay pedidos pendientes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Resumen del camión (hoy)</h4>
          <div className="form-row">
            <select
              value={summaryTruckId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSummaryTruckId(nextId);
                loadTruckSummary(nextId);
              }}
            >
              <option value="">Seleccione camión</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.plate}
                </option>
              ))}
            </select>
          </div>
          {summaryError && <div className="error">{summaryError}</div>}
          <div style={{ marginTop: 8 }}>
            <div>Pedidos: <strong>{truckSummary.total_orders}</strong></div>
            <div>Productos: <strong>{truckSummary.total_items}</strong></div>
            <div>Valor Bs.: <strong>{Number(truckSummary.total_value || 0).toFixed(2)}</strong></div>
          </div>
        </div>
        <div className="card">
          <h4>Hoja de ruta (PDF)</h4>
          <div className="form-row">
            <select
              value={printTruckId}
              onChange={(e) => setPrintTruckId(e.target.value)}
            >
              <option value="">Seleccione camión</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.plate}
                </option>
              ))}
            </select>
            <button className="btn" type="button" onClick={printRouteSheet} disabled={printLoading}>
              {printLoading ? "Generando..." : "Imprimir hoja de ruta"}
            </button>
          </div>
          {printError && <div className="error">{printError}</div>}
        </div>
        <div className="card">
          <h4>Devolución a almacén y caja</h4>
          <form onSubmit={handleReturn} className="form">
            <div className="form-row">
              <select
                value={returnForm.truck_id}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setReturnForm((prev) => ({ ...prev, truck_id: nextId, order_id: "" }));
                  loadTruckOrders(nextId);
                }}
              >
                <option value="">Seleccione camión</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.plate}
                  </option>
                ))}
              </select>
              <select
                value={returnForm.order_id}
                onChange={(e) =>
                  setReturnForm((prev) => ({ ...prev, order_id: e.target.value }))
                }
              >
                <option value="">Seleccione pedido</option>
                {truckOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.id} - {o.customer_name} ({o.status})
                  </option>
                ))}
              </select>
              <input
                placeholder="Monto entregado a caja"
                value={returnForm.cash_amount}
                onChange={(e) =>
                  setReturnForm((prev) => ({ ...prev, cash_amount: e.target.value }))
                }
              />
            </div>
            <button className="btn" type="submit">Registrar devolución</button>
          </form>
          {returnError && <div className="error">{returnError}</div>}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h4>Entregas por estado</h4>
        <ul>
          {deliveries.map((d) => (
            <li key={d.status}>
              <span className={statusClass(d.status)}>{d.status}</span> {d.total}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h4>Camiones registrados</h4>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Placa</th>
                <th>Capacidad</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {trucks.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.plate}</td>
                  <td>{t.capacity ?? "-"}</td>
                  <td>{t.active ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h4>Repartidores registrados</h4>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.name}</td>
                  <td>{d.phone || "-"}</td>
                  <td>{d.active ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
