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

function formatScheduledDate(value) {
  if (value == null || value === "") return "-";
  const s = String(value).trim();
  const datePart = s.slice(0, 10);
  if (datePart.length < 10 || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return "-";
  const d = new Date(datePart + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es");
}

export default function Logistics({ user }) {
  const today = new Date();
  const todayIso = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const isDriver = user?.roles?.includes("Repartidor");
  const isAdmin = user?.roles?.includes("Administrador del sistema");
  const isJefeLogistica = user?.roles?.includes("Jefe de logística");
  const canSeeReturnsHistory = isAdmin || isJefeLogistica;
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
    gastos_gasolina: "",
    gastos_almuerzo: "",
    gastos_otros: "",
  });
  const [returnSelection, setReturnSelection] = useState({});
  const [returnDate, setReturnDate] = useState(todayIso);
  const [returnDeliveredTotal, setReturnDeliveredTotal] = useState(0);
  const [returnDeliveredOrders, setReturnDeliveredOrders] = useState([]);
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
  const [returnsHistory, setReturnsHistory] = useState([]);
  const [historyFrom, setHistoryFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [historyTo, setHistoryTo] = useState(todayIso);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const canChangeReprogramedStatus = canSeeReturnsHistory;
  const [statusChangeNewStatus, setStatusChangeNewStatus] = useState({});
  const [statusChangeDate, setStatusChangeDate] = useState({});
  const [statusChangeLoading, setStatusChangeLoading] = useState(null);

  async function loadReturnsHistory() {
    if (!canSeeReturnsHistory) return;
    setHistoryError("");
    setHistoryLoading(true);
    try {
      const res = await api.get("/api/logistics/returns-history", {
        params: { from: historyFrom, to: historyTo },
      });
      setReturnsHistory(res.data || []);
    } catch (_err) {
      setHistoryError("No se pudo cargar el historial.");
    } finally {
      setHistoryLoading(false);
    }
  }

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

  async function loadTruckOrders(truckId, dateValue) {
    if (!truckId) {
      setTruckOrders([]);
      setReturnDeliveredTotal(0);
      setReturnDeliveredOrders([]);
      return;
    }
    const dateFilter = dateValue || returnDate || todayIso;
    const res = await api.get("/api/logistics/truck-orders", {
      params: { truck_id: truckId, scheduled_date: dateFilter },
    });
    const rows = res.data || [];
    const deliveredTotal = rows
      .filter((order) => order.status === "Entregado")
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
    setReturnDeliveredTotal(deliveredTotal);
    setReturnDeliveredOrders(rows.filter((order) => order.status === "Entregado"));
    setTruckOrders(rows);
    setReturnSelection({});
  }

  async function submitStatusChange(orderId) {
    const newStatus = statusChangeNewStatus[orderId];
    if (!newStatus) {
      setReturnError("Seleccione un estado.");
      return;
    }
    if (newStatus === "Reprogramado") {
      const d = statusChangeDate[orderId];
      if (!d || String(d).trim().length < 10) {
        setReturnError("Al elegir Reprogramado indique la fecha programada.");
        return;
      }
    }
    setReturnError("");
    setStatusChangeLoading(orderId);
    try {
      const body = { status: newStatus };
      if (newStatus === "Reprogramado") body.scheduled_date = statusChangeDate[orderId];
      await api.patch(`/api/orders/${orderId}/status`, body);
      setStatusChangeNewStatus((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setStatusChangeDate((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      if (returnForm.truck_id) {
        await loadTruckOrders(returnForm.truck_id, returnDate);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "No se pudo actualizar el estado.";
      setReturnError(msg);
    } finally {
      setStatusChangeLoading(null);
    }
  }

  useEffect(() => {
    load();
    loadDeliveries();
    loadPendingOrders();
  }, []);

  useEffect(() => {
    if (canSeeReturnsHistory) loadReturnsHistory();
  }, [canSeeReturnsHistory]);

  useEffect(() => {
    if (!isDriver || trucks.length !== 1) return;
    const truckId = trucks[0].id;
    setReturnForm((prev) => (prev.truck_id ? prev : { ...prev, truck_id: String(truckId) }));
    loadTruckOrders(truckId, returnDate);
  }, [trucks, isDriver, returnDate]);

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
    if (!returnSelection[returnForm.order_id]) {
      setReturnError("Seleccione el pedido en la tabla para devolución.");
      return;
    }
    const ventasTotal = Number(returnDeliveredTotal || 0);
    const gastosGas = Number(returnForm.gastos_gasolina || 0);
    const gastosAlm = Number(returnForm.gastos_almuerzo || 0);
    const gastosOtros = Number(returnForm.gastos_otros || 0);
    const totalGastos = gastosGas + gastosAlm + gastosOtros;
    const expectedTotal = Math.max(0, ventasTotal - totalGastos);
    const cashValue = Number(returnForm.cash_amount || 0);
    if (Number(cashValue.toFixed(2)) !== Number(expectedTotal.toFixed(2))) {
      setReturnError(
        `El monto a caja debe ser igual a ventas menos gastos: Bs. ${expectedTotal.toFixed(2)} (Ventas Bs. ${ventasTotal.toFixed(2)} − Gastos Bs. ${totalGastos.toFixed(2)})`
      );
      return;
    }
    await api.post("/api/logistics/returns", {
      truck_id: Number(returnForm.truck_id),
      order_id: Number(returnForm.order_id),
      cash_amount: returnForm.cash_amount ? Number(returnForm.cash_amount) : 0,
      return_date: returnDate || undefined,
      gastos_gasolina: gastosGas,
      gastos_almuerzo: gastosAlm,
      gastos_otros: gastosOtros,
    });
    setReturnForm({
      truck_id: returnForm.truck_id,
      order_id: "",
      cash_amount: "",
      gastos_gasolina: "",
      gastos_almuerzo: "",
      gastos_otros: "",
    });
    setReturnSelection({});
    loadTruckSummary(returnForm.truck_id);
    loadTruckOrders(returnForm.truck_id);
    loadPendingOrders();
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
          (o, idx) => `
            <tr>
              <td>${idx + 1}</td>
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
                  <th>Nº</th>
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

  async function printReturnSummary() {
    setReturnError("");
    if (!returnForm.truck_id) {
      setReturnError("Seleccione un camión.");
      return;
    }
    const dateFilter = returnDate || todayIso;
    try {
      const res = await api.get("/api/logistics/truck-orders", {
        params: { truck_id: returnForm.truck_id, scheduled_date: dateFilter },
      });
      const orders = res.data || [];
      const truck = trucks.find((t) => String(t.id) === String(returnForm.truck_id));
      const truckName = orders[0]?.truck_plate || truck?.plate || "-";
      const driverName = orders[0]?.driver_name || "-";
      const dateLabel = dateFilter
        ? new Date(`${dateFilter}T12:00:00`).toLocaleDateString("es")
        : "-";
      const totalOrders = orders.length;
      const uniqueCustomers = new Set(orders.map((o) => o.customer_name)).size;
      const deliveredOrders = orders.filter((o) => o.status === "Entregado");
      const deliveredTotal = deliveredOrders.reduce(
        (sum, o) => sum + Number(o.total || 0),
        0
      );
      const reprogrammedOrders = orders.filter((o) => o.status === "Reprogramado");
      const gastosGas = Number(returnForm.gastos_gasolina || 0);
      const gastosAlm = Number(returnForm.gastos_almuerzo || 0);
      const gastosOtros = Number(returnForm.gastos_otros || 0);
      const totalGastos = gastosGas + gastosAlm + gastosOtros;
      const montoNeto = Math.max(0, deliveredTotal - totalGastos);
      const resumenMontoEntregado = deliveredTotal.toFixed(2);
      const resumenGastos = totalGastos > 0
        ? `Gasolina Bs. ${gastosGas.toFixed(2)} | Almuerzo Bs. ${gastosAlm.toFixed(2)} | Otros Bs. ${gastosOtros.toFixed(2)} = Total gastos Bs. ${totalGastos.toFixed(2)}`
        : "—";
      const resumenDevolucion = `${reprogrammedOrders.length} pedido(s) no entregado(s) → Reprogramado`;
      const rowsHtml = orders
        .map(
          (o, idx) => {
            const progDate = formatScheduledDate(o.scheduled_date);
            return `
            <tr>
              <td>${idx + 1}</td>
              <td>${o.customer_name || "-"}</td>
              <td>${o.status || "-"}</td>
              <td>${progDate}</td>
              <td>${o.items || "-"}</td>
              <td>Bs. ${Number(o.total || 0).toFixed(2)}</td>
            </tr>
          `;
          }
        )
        .join("");
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) {
        setReturnError("No se pudo abrir la ventana de impresión.");
        return;
      }
      win.document.title = "Resumen de devolución";
      win.document.write(`
        <html>
          <head>
            <title>Resumen de devolución</title>
            <style>
              @page { margin: 10mm; }
              body { font-family: Arial, sans-serif; padding: 8px; color: #1b2a3a; }
              h2 { margin: 0 0 6px; font-size: 16px; }
              .meta { color: #555; margin-bottom: 8px; font-size: 11px; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; }
              th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; font-size: 10px; vertical-align: top; line-height: 1.2; }
              th { background: #f2f4f7; }
              .summary { margin-top: 10px; font-size: 11px; }
              .resumen-box { margin: 12px 0; padding: 10px; border: 1px solid #333; background: #f8f9fa; }
              .resumen-box h3 { margin: 0 0 8px; font-size: 13px; }
              .resumen-box .line { margin: 4px 0; }
              .resumen-box .total { font-size: 14px; font-weight: bold; margin-top: 6px; }
            </style>
          </head>
          <body>
            <h2>Resumen de devolución</h2>
            <div class="meta"><strong>Fecha:</strong> ${dateLabel}</div>
            <div class="meta"><strong>Camión:</strong> ${truckName} | <strong>Repartidor:</strong> ${driverName}</div>
            <div class="resumen-box">
              <h3>Resumen del monto entregado y devolución</h3>
              <div class="line"><strong>Ventas entregadas:</strong> ${deliveredOrders.length} pedido(s) — Total Bs. ${resumenMontoEntregado}</div>
              <div class="line"><strong>Gastos:</strong> ${resumenGastos}</div>
              <div class="line"><strong>Monto neto entregado a caja:</strong> Bs. ${montoNeto.toFixed(2)}</div>
              <div class="line"><strong>Devolución:</strong> ${resumenDevolucion}</div>
              <div class="line">Pedidos en hoja: ${totalOrders} (${deliveredOrders.length} entregados, ${reprogrammedOrders.length} reprogramados)</div>
            </div>
            <div class="summary">
              <div><strong>Pedidos:</strong> ${totalOrders}</div>
              <div><strong>Clientes:</strong> ${uniqueCustomers}</div>
              <div><strong>Pedidos entregados:</strong> ${deliveredOrders.length} | <strong>Total Bs.:</strong> ${deliveredTotal.toFixed(2)}</div>
              <div><strong>Pedidos reprogramados:</strong> ${reprogrammedOrders.length}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Programado</th>
                  <th>Detalle</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || "<tr><td colspan='6'>Sin pedidos.</td></tr>"}
              </tbody>
            </table>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
    } catch (_err) {
      setReturnError("No se pudo generar la impresión de devolución.");
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

  const returnCard = (
    <div className="card">
      <h4>Devolución a almacén y caja</h4>
      <form onSubmit={handleReturn} className="form">
        <div className="form-row">
          <select
            value={returnForm.truck_id}
            onChange={(e) => {
              const nextId = e.target.value;
              setReturnForm((prev) => ({ ...prev, truck_id: nextId, order_id: "" }));
              loadTruckOrders(nextId, returnDate);
            }}
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
            value={returnDate}
            onChange={(e) => {
              const nextDate = e.target.value;
              setReturnDate(nextDate);
              if (returnForm.truck_id) {
                loadTruckOrders(returnForm.truck_id, nextDate);
              }
            }}
          />
          <input type="hidden" value={returnForm.order_id} readOnly />
          <input
            placeholder="Monto entregado a caja (Bs.)"
            value={returnForm.cash_amount}
            onChange={(e) =>
              setReturnForm((prev) => ({ ...prev, cash_amount: e.target.value }))
            }
          />
        </div>
        <div className="form-row" style={{ marginTop: 8 }}>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Gastos gasolina (Bs.)"
            value={returnForm.gastos_gasolina}
            onChange={(e) =>
              setReturnForm((prev) => ({ ...prev, gastos_gasolina: e.target.value }))
            }
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Gastos almuerzo (Bs.)"
            value={returnForm.gastos_almuerzo}
            onChange={(e) =>
              setReturnForm((prev) => ({ ...prev, gastos_almuerzo: e.target.value }))
            }
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Gastos otros (Bs.)"
            value={returnForm.gastos_otros}
            onChange={(e) =>
              setReturnForm((prev) => ({ ...prev, gastos_otros: e.target.value }))
            }
          />
        </div>
        <div style={{ marginTop: 8, color: "#6b7a8c", fontSize: 13 }}>
          {returnForm.order_id ? (
            <span>
              Ventas entregadas: <strong>Bs. {(Number(returnDeliveredTotal || 0)).toFixed(2)}</strong>
              {(Number(returnForm.gastos_gasolina || 0) + Number(returnForm.gastos_almuerzo || 0) + Number(returnForm.gastos_otros || 0)) > 0 && (
                <> — Gastos: <strong>Bs. {(Number(returnForm.gastos_gasolina || 0) + Number(returnForm.gastos_almuerzo || 0) + Number(returnForm.gastos_otros || 0)).toFixed(2)}</strong></>
              )}
              <br />
              Monto neto a entregar a caja: <strong>Bs. {Math.max(0, Number(returnDeliveredTotal || 0) - (Number(returnForm.gastos_gasolina || 0) + Number(returnForm.gastos_almuerzo || 0) + Number(returnForm.gastos_otros || 0))).toFixed(2)}</strong>
            </span>
          ) : (
            <span>Seleccione un pedido para ver el monto a entregar.</span>
          )}
        </div>
        {returnDeliveredOrders.length > 0 && (
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <strong>Ventas realizadas (a depositar):</strong>
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 20, fontSize: 13 }}>
              {returnDeliveredOrders.map((o) => (
                <li key={o.id}>
                  #{o.id} {o.customer_name || "-"} — Bs. {Number(o.total || 0).toFixed(2)}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 4 }}>
              Total ventas: <strong>Bs. {Number(returnDeliveredTotal || 0).toFixed(2)}</strong>
              {(Number(returnForm.gastos_gasolina || 0) + Number(returnForm.gastos_almuerzo || 0) + Number(returnForm.gastos_otros || 0)) > 0 && (
                <> − Gastos: <strong>Bs. {(Number(returnForm.gastos_gasolina || 0) + Number(returnForm.gastos_almuerzo || 0) + Number(returnForm.gastos_otros || 0)).toFixed(2)}</strong> = Neto a caja: <strong>Bs. {Math.max(0, Number(returnDeliveredTotal || 0) - (Number(returnForm.gastos_gasolina || 0) + Number(returnForm.gastos_almuerzo || 0) + Number(returnForm.gastos_otros || 0))).toFixed(2)}</strong></>
              )}
            </div>
          </div>
        )}
        <div className="table-scroll" style={{ marginTop: 8 }}>
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Nº</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Programado</th>
                <th>Dirección</th>
                <th>Zona</th>
                <th>Detalle</th>
                <th>Observaciones</th>
                <th>Total</th>
                {canChangeReprogramedStatus && <th>Acción</th>}
              </tr>
            </thead>
            <tbody>
              {truckOrders.map((o, idx) => (
                <tr key={o.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!returnSelection[o.id]}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setReturnSelection((prev) => ({
                          ...prev,
                          [o.id]: checked,
                        }));
                        setReturnForm((prev) => ({
                          ...prev,
                          order_id: checked ? String(o.id) : "",
                        }));
                      }}
                    />
                  </td>
                  <td>{idx + 1}</td>
                  <td>{o.customer_name || "-"}</td>
                  <td><span className={statusClass(o.status)}>{o.status}</span></td>
                  <td>{o.created_at ? (() => { const d = new Date(o.created_at); return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("es") + " " + d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }); })() : "-"}</td>
                  <td>{formatScheduledDate(o.scheduled_date)}</td>
                  <td>{o.address || "-"}</td>
                  <td>{o.zona || "-"}</td>
                  <td>{o.items || "-"}</td>
                  <td>{o.notes || "-"}</td>
                  <td>Bs. {Number(o.total || 0).toFixed(2)}</td>
                  {canChangeReprogramedStatus && (
                    <td>
                      {o.status === "Reprogramado" ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          <select
                            value={statusChangeNewStatus[o.id] || ""}
                            onChange={(e) => setStatusChangeNewStatus((prev) => ({ ...prev, [o.id]: e.target.value }))}
                            style={{ minWidth: 120 }}
                          >
                            <option value="">Nuevo estado</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Creado">Creado</option>
                            <option value="Cancelado">Cancelado</option>
                            <option value="Reprogramado">Reprogramado</option>
                          </select>
                          {(statusChangeNewStatus[o.id] || "") === "Reprogramado" && (
                            <input
                              type="date"
                              value={statusChangeDate[o.id] || ""}
                              onChange={(e) => setStatusChangeDate((prev) => ({ ...prev, [o.id]: e.target.value }))}
                            />
                          )}
                          <button
                            type="button"
                            className="btn btn-outline"
                            disabled={statusChangeLoading === o.id}
                            onClick={() => submitStatusChange(o.id)}
                          >
                            {statusChangeLoading === o.id ? "Actualizando..." : "Cambiar estado"}
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {truckOrders.length === 0 && (
                <tr key="no-orders">
                  <td colSpan={canChangeReprogramedStatus ? 13 : 12}>No hay pedidos disponibles.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="submit">Registrar devolución</button>
          <button className="btn btn-outline" type="button" onClick={printReturnSummary}>
            Imprimir devolución
          </button>
        </div>
      </form>
      {returnError && <div className="error">{returnError}</div>}
    </div>
  );

  return (
    <div className="container page">
      <h2>Logística</h2>
      <div className="grid">
        {isDriver ? returnCard : (
          <>
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
              Asignados: {bulkResult.assigned}
              {bulkResult.updated != null && bulkResult.updated > 0 && (
                <> | Reasignados: {bulkResult.updated}</>
              )}
              {bulkResult.skipped != null && bulkResult.skipped > 0 && (
                <> | Omitidos: {bulkResult.skipped}</>
              )}
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
                <th>Nº</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Zona</th>
                <th>Dirección</th>
                <th>Observaciones</th>
                <th>Tel. principal</th>
              </tr>
            </thead>
            <tbody>
              {pendingOrders.map((p, idx) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!bulkSelection[p.id]}
                      onChange={() => toggleBulkSelection(p.id)}
                    />
                  </td>
                  <td>{idx + 1}</td>
                  <td>{p.customer_name}</td>
                  <td><span className={statusClass(p.status)}>{p.status}</span></td>
                  <td>{p.zona || "-"}</td>
                  <td>{p.direccion || "-"}</td>
                  <td>{p.notes || "-"}</td>
                  <td>{p.phone || "-"}</td>
                </tr>
              ))}
              {pendingOrders.length === 0 && (
                <tr>
                  <td colSpan={8}>No hay pedidos pendientes.</td>
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
                      <th>Nº</th>
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
                    {previewOrders.map((o, idx) => (
                      <tr key={o.id}>
                        <td>{idx + 1}</td>
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
        {returnCard}
          </>
        )}
      </div>
      {!isDriver && (
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
      )}
      {canSeeReturnsHistory && (
        <div className="card" style={{ marginTop: 16 }}>
          <h4>Historial de devoluciones</h4>
          <div style={{ color: "#6b7a8c", fontSize: 13, marginBottom: 12 }}>
            Consultar movimientos de devolución por rango de fechas (solo administrador o jefe de logística).
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <input
              type="date"
              value={historyFrom}
              onChange={(e) => setHistoryFrom(e.target.value)}
            />
            <input
              type="date"
              value={historyTo}
              onChange={(e) => setHistoryTo(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              onClick={loadReturnsHistory}
              disabled={historyLoading}
            >
              {historyLoading ? "Cargando..." : "Buscar"}
            </button>
          </div>
          {historyError && <div className="error" style={{ marginBottom: 8 }}>{historyError}</div>}
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Camión</th>
                  <th>Repartidor</th>
                  <th>Ventas (Bs.)</th>
                  <th>Gastos gasolina</th>
                  <th>Gastos almuerzo</th>
                  <th>Gastos otros</th>
                  <th>Monto caja (Bs.)</th>
                  <th>Registrado por</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {returnsHistory.map((r) => (
                  <tr key={r.id}>
                    <td>{formatScheduledDate(r.fecha)}</td>
                    <td>{r.camion_placa || "-"}</td>
                    <td>{r.repartidor_nombre || "-"}</td>
                    <td>Bs. {Number(r.monto_ventas || 0).toFixed(2)}</td>
                    <td>Bs. {Number(r.gastos_gasolina || 0).toFixed(2)}</td>
                    <td>Bs. {Number(r.gastos_almuerzo || 0).toFixed(2)}</td>
                    <td>Bs. {Number(r.gastos_otros || 0).toFixed(2)}</td>
                    <td>Bs. {Number(r.monto_neto_caja || 0).toFixed(2)}</td>
                    <td>{r.usuario_nombre || "-"}</td>
                    <td>{r.creado_en ? new Date(r.creado_en).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                  </tr>
                ))}
                {historyLoading && returnsHistory.length === 0 && (
                  <tr key="loading-returns">
                    <td colSpan={10}>Cargando...</td>
                  </tr>
                )}
                {!historyLoading && returnsHistory.length === 0 && (
                  <tr key="no-returns">
                    <td colSpan={10}>No hay registros para el rango seleccionado. Use «Buscar» para cargar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
