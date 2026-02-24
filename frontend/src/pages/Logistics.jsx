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

export default function Logistics({ user }) {
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
  const [printDateFilter, setPrintDateFilter] = useState("");
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState("");
  const [previewOrders, setPreviewOrders] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

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
        params: {
          truck_id: printTruckId,
          scheduled_date: printDateFilter || undefined,
        },
      });
      const orders = res.data || [];
      const truck = trucks.find((t) => String(t.id) === String(printTruckId));
      const title = "Hoja de ruta";
      const scheduledLabel = printDateFilter
        ? new Date(`${printDateFilter}T12:00:00`).toLocaleDateString("es")
        : "-";
      const driverName = orders[0]?.driver_name || "-";
      const printerName = user?.email || user?.name || "-";
      const truckName = orders[0]?.truck_plate || truck?.plate || "-";
      const rowsHtml = orders
        .map(
          (o) => `
            <tr>
              <td>${o.id || "-"}</td>
              <td>${o.customer_name || "-"}</td>
              <td>${o.zona || "-"}</td>
              <td>${o.address || "-"}</td>
              <td>${o.phone || "-"}</td>
              <td>${o.phone_secondary || "-"}</td>
              <td>${Number(o.packs_600 || 0)}</td>
              <td>${Number(o.packs_1lt || 0)}</td>
              <td>${Number(o.packs_2lt || 0)}</td>
              <td>${Number(o.bidon_5 || 0)}</td>
              <td>${Number(o.recarga || 0)}</td>
              <td>${Number(o.base || 0)}</td>
              <td>${Number(o.botellon || 0)}</td>
              <td>${Number(o.kit_completo || 0)}</td>
              <td>${Number(o.botellon_purificada || 0)}</td>
              <td>Bs. ${Number(o.total || 0).toFixed(2)}</td>
              <td class="center"></td>
              <td class="obs">${o.notes || "-"}</td>
            </tr>
          `
        )
        .join("");
      const summaryByTruck = orders.reduce((acc, order) => {
        const plate = order.truck_plate || truckName || "-";
        if (!acc[plate]) {
          acc[plate] = {
            orders: 0,
            packs_600: 0,
            packs_1lt: 0,
            packs_2lt: 0,
            bidon_5: 0,
            recarga: 0,
            base: 0,
            botellon: 0,
            kit_completo: 0,
            botellon_purificada: 0,
            total: 0,
          };
        }
        acc[plate].orders += 1;
        acc[plate].packs_600 += Number(order.packs_600 || 0);
        acc[plate].packs_1lt += Number(order.packs_1lt || 0);
        acc[plate].packs_2lt += Number(order.packs_2lt || 0);
        acc[plate].bidon_5 += Number(order.bidon_5 || 0);
        acc[plate].recarga += Number(order.recarga || 0);
        acc[plate].base += Number(order.base || 0);
        acc[plate].botellon += Number(order.botellon || 0);
        acc[plate].kit_completo += Number(order.kit_completo || 0);
        acc[plate].botellon_purificada += Number(order.botellon_purificada || 0);
        acc[plate].total += Number(order.total || 0);
        return acc;
      }, {});
      const summaryRowsHtml = Object.entries(summaryByTruck)
        .map(
          ([plate, s]) => `
            <tr>
              <td>${plate}</td>
              <td>${s.orders}</td>
              <td>${s.packs_600}</td>
              <td>${s.packs_1lt}</td>
              <td>${s.packs_2lt}</td>
              <td>${s.bidon_5}</td>
              <td>${s.recarga}</td>
              <td>${s.base}</td>
              <td>${s.botellon}</td>
              <td>${s.kit_completo}</td>
              <td>${s.botellon_purificada}</td>
              <td>Bs. ${s.total.toFixed(2)}</td>
            </tr>
          `
        )
        .join("");
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) {
        setPrintError("No se pudo abrir la ventana de impresión.");
        return;
      }
      win.document.title = title;
      win.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              @page { size: landscape; margin: 8mm; }
              body { font-family: Arial, sans-serif; padding: 6px; }
              h2 { margin: 0 0 4px; font-size: 16px; }
              .meta { color: #555; margin-bottom: 8px; font-size: 11px; }
              .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 6px 16px; margin-bottom: 10px; font-size: 11px; }
              .line { display: inline-block; border-bottom: 1px solid #333; min-width: 160px; height: 12px; vertical-align: middle; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ccc; padding: 3px 4px; text-align: left; font-size: 10px; vertical-align: top; line-height: 1.2; }
              th { background: #f2f4f7; font-size: 10px; }
              .center { text-align: center; }
              .obs { min-width: 120px; }
              .summary { margin-top: 10px; font-size: 11px; }
              .summary table { width: 100%; border-collapse: collapse; }
              .summary th, .summary td { border: 1px solid #ccc; padding: 3px 4px; font-size: 10px; }
            </style>
          </head>
          <body>
            <div class="meta"><strong>Fecha programada:</strong> ${scheduledLabel}</div>
            <div class="meta-grid">
              <div><strong>Camión:</strong> ${truckName}</div>
              <div><strong>Distribuidor:</strong> ${driverName}</div>
              <div><strong>Ayudante:</strong> <span class="line"></span></div>
              <div><strong>KM inicial:</strong> <span class="line"></span></div>
              <div><strong>KM final:</strong> <span class="line"></span></div>
              <div><strong>Refrigerio:</strong> <span class="line"></span></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nro pedido</th>
                  <th>Nombre cliente</th>
                  <th>Zona</th>
                  <th>Dirección</th>
                  <th>Tel. principal</th>
                  <th>Tel. secundario</th>
                  <th>Packs 600cc</th>
                  <th>Packs 1 LT</th>
                  <th>Packs 2 LT</th>
                  <th>Bidón 5 LT</th>
                  <th>Recarga</th>
                  <th>Base</th>
                  <th>Botellón</th>
                  <th>Kit completo</th>
                  <th>Botellón purificada</th>
                  <th>Precio</th>
                  <th>Entregado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || "<tr><td colspan='18'>No hay pedidos asignados.</td></tr>"}
              </tbody>
            </table>
            <div class="summary">
              <div><strong>Resumen</strong></div>
              <table>
                <thead>
                  <tr>
                    <th>Camión</th>
                    <th>Nro pedidos</th>
                    <th>Packs 600cc</th>
                    <th>Packs 1 LT</th>
                    <th>Packs 2 LT</th>
                    <th>Bidón 5 LT</th>
                    <th>Recarga</th>
                    <th>Base</th>
                    <th>Botellón</th>
                    <th>Kit completo</th>
                    <th>Botellón purificada</th>
                    <th>Precio</th>
                  </tr>
                </thead>
                <tbody>
                  ${summaryRowsHtml || "<tr><td colspan='12'>-</td></tr>"}
                </tbody>
              </table>
            </div>
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

  async function loadPreview() {
    setPreviewError("");
    if (!printTruckId) {
      setPreviewError("Seleccione un camión.");
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await api.get("/api/logistics/truck-orders", {
        params: {
          truck_id: printTruckId,
          scheduled_date: printDateFilter || undefined,
        },
      });
      setPreviewOrders(res.data || []);
      setShowPreview(true);
    } catch (_err) {
      setPreviewError("No se pudo cargar la previsualización.");
    } finally {
      setPreviewLoading(false);
    }
  }

  const previewSummaryByTruck = previewOrders.reduce((acc, order) => {
    const plate =
      order.truck_plate ||
      trucks.find((t) => String(t.id) === String(printTruckId))?.plate ||
      "-";
    if (!acc[plate]) {
      acc[plate] = {
        orders: 0,
        packs_600: 0,
        packs_1lt: 0,
        packs_2lt: 0,
        bidon_5: 0,
        recarga: 0,
        base: 0,
        botellon: 0,
        kit_completo: 0,
        botellon_purificada: 0,
        total: 0,
      };
    }
    acc[plate].orders += 1;
    acc[plate].packs_600 += Number(order.packs_600 || 0);
    acc[plate].packs_1lt += Number(order.packs_1lt || 0);
    acc[plate].packs_2lt += Number(order.packs_2lt || 0);
    acc[plate].bidon_5 += Number(order.bidon_5 || 0);
    acc[plate].recarga += Number(order.recarga || 0);
    acc[plate].base += Number(order.base || 0);
    acc[plate].botellon += Number(order.botellon || 0);
    acc[plate].kit_completo += Number(order.kit_completo || 0);
    acc[plate].botellon_purificada += Number(order.botellon_purificada || 0);
    acc[plate].total += Number(order.total || 0);
    return acc;
  }, {});

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
            <input
              type="date"
              value={printDateFilter}
              onChange={(e) => setPrintDateFilter(e.target.value)}
              placeholder="Fecha programada"
            />
            <button className="btn btn-outline" type="button" onClick={loadPreview} disabled={previewLoading}>
              {previewLoading ? "Cargando..." : "Previsualizar"}
            </button>
            <button className="btn" type="button" onClick={printRouteSheet} disabled={printLoading}>
              {printLoading ? "Generando..." : "Imprimir hoja de ruta"}
            </button>
          </div>
          {printError && <div className="error">{printError}</div>}
          {previewError && <div className="error">{previewError}</div>}
          {showPreview && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <strong>Previsualización</strong>
                <button className="btn btn-outline btn-sm" type="button" onClick={() => setShowPreview(false)}>
                  Ocultar
                </button>
              </div>
              <div style={{ marginTop: 8, color: "#6b7a8c" }}>
                Camión: <strong>{previewOrders[0]?.truck_plate || trucks.find((t) => String(t.id) === String(printTruckId))?.plate || "-"}</strong>{" "}
                | Distribuidor: <strong>{previewOrders[0]?.driver_name || "-"}</strong>
              </div>
              <div className="table-scroll" style={{ marginTop: 8 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nro pedido</th>
                      <th>Nombre cliente</th>
                      <th>Zona</th>
                      <th>Dirección</th>
                      <th>Tel. principal</th>
                      <th>Tel. secundario</th>
                      <th>Packs 600cc</th>
                      <th>Packs 1 LT</th>
                      <th>Packs 2 LT</th>
                      <th>Bidón 5 LT</th>
                      <th>Recarga</th>
                      <th>Base</th>
                      <th>Botellón</th>
                      <th>Kit completo</th>
                      <th>Botellón purificada</th>
                      <th>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewOrders.map((o) => (
                      <tr key={o.id}>
                        <td>{o.id || "-"}</td>
                        <td>{o.customer_name || "-"}</td>
                        <td>{o.zona || "-"}</td>
                        <td>{o.address || "-"}</td>
                        <td>{o.phone || "-"}</td>
                        <td>{o.phone_secondary || "-"}</td>
                        <td>{Number(o.packs_600 || 0)}</td>
                        <td>{Number(o.packs_1lt || 0)}</td>
                        <td>{Number(o.packs_2lt || 0)}</td>
                        <td>{Number(o.bidon_5 || 0)}</td>
                        <td>{Number(o.recarga || 0)}</td>
                        <td>{Number(o.base || 0)}</td>
                        <td>{Number(o.botellon || 0)}</td>
                        <td>{Number(o.kit_completo || 0)}</td>
                        <td>{Number(o.botellon_purificada || 0)}</td>
                        <td>Bs. {Number(o.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {previewOrders.length === 0 && (
                      <tr>
                        <td colSpan={16}>No hay pedidos asignados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  <strong>Resumen</strong>
                </div>
                <div className="table-scroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Camión</th>
                        <th>Nro pedidos</th>
                        <th>Packs 600cc</th>
                        <th>Packs 1 LT</th>
                        <th>Packs 2 LT</th>
                        <th>Bidón 5 LT</th>
                        <th>Recarga</th>
                        <th>Base</th>
                        <th>Botellón</th>
                        <th>Kit completo</th>
                        <th>Botellón purificada</th>
                        <th>Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(previewSummaryByTruck).map(([plate, s]) => (
                        <tr key={plate}>
                          <td>{plate}</td>
                          <td>{s.orders}</td>
                          <td>{s.packs_600}</td>
                          <td>{s.packs_1lt}</td>
                          <td>{s.packs_2lt}</td>
                          <td>{s.bidon_5}</td>
                          <td>{s.recarga}</td>
                          <td>{s.base}</td>
                          <td>{s.botellon}</td>
                          <td>{s.kit_completo}</td>
                          <td>{s.botellon_purificada}</td>
                          <td>Bs. {s.total.toFixed(2)}</td>
                        </tr>
                      ))}
                      {Object.keys(previewSummaryByTruck).length === 0 && (
                        <tr>
                          <td colSpan={12}>-</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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
    </div>
  );
}
