import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { getTodayLaPaz } from "../utils/dateUtils";

function statusClass(status) {
  if (!status) return "tag";
  const normalized = status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
  return `tag status-${normalized}`;
}

function formatDateOnly(value) {
  if (!value) return "-";
  const s = String(value).trim().slice(0, 10);
  if (s.length < 10) return "-";
  return new Date(s + "T12:00:00").toLocaleDateString("es");
}

function formatDateTimeSafe(value) {
  if (!value) return "-";
  const s = String(value).trim();
  const datePart = s.slice(0, 10);
  if (datePart.length < 10) return "-";
  const timePart = s.slice(11, 19) || "12:00:00";
  return new Date(datePart + "T" + timePart).toLocaleString("es");
}

export default function EntregasMovil() {
  const navigate = useNavigate();
  const todayIso = getTodayLaPaz();
  const [deliveries, setDeliveries] = useState([]);
  const [filterDate, setFilterDate] = useState(todayIso);
  const [filterTruck, setFilterTruck] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState({});
  const [reprogramId, setReprogramId] = useState(null);
  const [reprogramDate, setReprogramDate] = useState("");
  const [undoLoading, setUndoLoading] = useState({});
  const [error, setError] = useState("");
  const [salesError, setSalesError] = useState("");
  const [salesLoading, setSalesLoading] = useState(false);

  async function load(dateValue) {
    setError("");
    try {
      const res = await api.get("/api/driver/entregas", {
        params: { date: dateValue || filterDate || undefined },
      });
      setDeliveries(res.data || []);
    } catch (_err) {
      setError("No se pudo cargar las entregas.");
    }
  }

  async function loadSales(dateValue) {
    setSalesError("");
    setSalesLoading(true);
    try {
      const res = await api.get("/api/driver/ventas", {
        params: { date: dateValue || filterDate || undefined },
      });
      setSales(res.data || []);
    } catch (_err) {
      setSalesError("No se pudo cargar las ventas.");
    } finally {
      setSalesLoading(false);
    }
  }

  useEffect(() => {
    load(filterDate);
    loadSales(filterDate);
    const intervalId = setInterval(() => {
      load(filterDate);
      loadSales(filterDate);
    }, 15000);
    return () => clearInterval(intervalId);
  }, [filterDate]);

  const trucksFromDeliveries = useMemo(
    () => [...new Set(deliveries.map((d) => d.camion).filter(Boolean))].sort(),
    [deliveries]
  );
  const filteredByTruck = filterTruck
    ? deliveries.filter((d) => d.camion === filterTruck)
    : deliveries;
  const searchLower = (searchQuery || "").trim().toLowerCase();
  const filteredBySearch = searchLower
    ? filteredByTruck.filter((d) => {
        const text = [
          d.cliente,
          d.direccion,
          d.zona,
          d.repartidor,
          d.camion,
          d.pedido_detalle,
          d.estado,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(searchLower);
      })
    : filteredByTruck;
  const filteredDeliveries = useMemo(
    () =>
      [...filteredBySearch]
        .filter((d) => d.estado !== "Entregado")
        .sort((a, b) =>
          (a.zona || "").localeCompare(b.zona || "", undefined, { sensitivity: "base" })
        ),
    [filteredBySearch]
  );

  const filteredSales = filterTruck
    ? sales.filter((s) => s.camion === filterTruck)
    : sales;

  async function markEntregado(deliveryId) {
    setLoading((prev) => ({ ...prev, [deliveryId]: "entregado" }));
    try {
      await api.patch(`/api/logistics/deliveries/${deliveryId}/status`, { status: "Entregado" });
      load(filterDate);
      loadSales(filterDate);
    } finally {
      setLoading((prev) => ({ ...prev, [deliveryId]: null }));
    }
  }

  async function undoEntregado(entregaId) {
    if (!window.confirm("¿Deshacer esta venta? El pedido volverá a estado Pendiente.")) return;
    setUndoLoading((prev) => ({ ...prev, [entregaId]: true }));
    try {
      await api.patch(`/api/logistics/deliveries/${entregaId}/status`, { status: "Pendiente" });
      load(filterDate);
      loadSales(filterDate);
    } finally {
      setUndoLoading((prev) => ({ ...prev, [entregaId]: false }));
    }
  }

  async function markReprogramado(deliveryId) {
    if (!reprogramDate) return;
    setLoading((prev) => ({ ...prev, [deliveryId]: "reprogramado" }));
    try {
      await api.patch(`/api/logistics/deliveries/${deliveryId}/status`, {
        status: "Reprogramado",
        scheduled_date: reprogramDate,
      });
      setReprogramId(null);
      setReprogramDate("");
      load(filterDate);
    } finally {
      setLoading((prev) => ({ ...prev, [deliveryId]: null }));
    }
  }

  return (
    <div className="container-movil page">
      <h2 style={{ fontSize: "1.1rem", marginBottom: 10 }}>Entregas móvil</h2>
      <div className="card">
        {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}
        <div className="form-row" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <div className="form-field">
            <label>Fecha</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Camión</label>
            <select
              value={filterTruck}
              onChange={(e) => setFilterTruck(e.target.value)}
            >
              <option value="">Todos</option>
              {trucksFromDeliveries.map((placa) => (
                <option key={placa} value={placa}>{placa}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ flex: "1 1 180px", minWidth: 160 }}>
            <label>Buscar</label>
            <input
              type="search"
              placeholder="Cliente, zona, pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#6b7a8c", marginBottom: 6 }}>
          Pedidos: <strong>{filteredDeliveries.length}</strong>
        </div>
        <div className="table-scroll">
          <table className="table table-deliveries-movil">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Zona</th>
                <th>Dirección</th>
                <th>Celular</th>
                <th>Pedido</th>
                <th>Monto (Bs.)</th>
                <th>Actualizar</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((d, idx) => (
                <tr key={d.id}>
                  <td>{d.cliente}</td>
                  <td>{d.zona || "-"}</td>
                  <td>{d.direccion || "-"}</td>
                  <td>{d.celular || "-"}</td>
                  <td>{d.pedido_detalle || "-"}</td>
                  <td>Bs. {Number(d.total_bs || 0).toFixed(2)}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 130 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() => navigate(`/pedidos?edit=${d.pedido_id}`)}
                        disabled={!d.pedido_id}
                      >
                        Editar pedido
                      </button>
                      <button
                        type="button"
                        onClick={() => markEntregado(d.id)}
                        disabled={loading[d.id] === "entregado"}
                        style={{
                          background: "#16a34a", color: "#fff", border: "none",
                          borderRadius: 6, padding: "5px 10px", fontSize: 12,
                          cursor: "pointer", fontWeight: 600,
                          opacity: loading[d.id] === "entregado" ? 0.6 : 1,
                        }}
                      >
                        {loading[d.id] === "entregado" ? "Guardando..." : "✓ Entregado"}
                      </button>
                      {reprogramId === d.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <input
                            type="date"
                            value={reprogramDate}
                            onChange={(e) => setReprogramDate(e.target.value)}
                            style={{ fontSize: 12, padding: "4px 6px", borderRadius: 6, border: "1px solid #d9e3ec" }}
                            autoFocus
                          />
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => markReprogramado(d.id)}
                              disabled={!reprogramDate || loading[d.id] === "reprogramado"}
                              style={{
                                background: "#f59e0b", color: "#fff", border: "none",
                                borderRadius: 6, padding: "4px 8px", fontSize: 11,
                                cursor: "pointer", fontWeight: 600, flex: 1,
                              }}
                            >
                              {loading[d.id] === "reprogramado" ? "..." : "Confirmar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setReprogramId(null); setReprogramDate(""); }}
                              style={{
                                background: "#e5e7eb", color: "#374151", border: "none",
                                borderRadius: 6, padding: "4px 8px", fontSize: 11,
                                cursor: "pointer",
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setReprogramId(d.id); setReprogramDate(""); }}
                          style={{
                            background: "#f59e0b", color: "#fff", border: "none",
                            borderRadius: 6, padding: "5px 10px", fontSize: 12,
                            cursor: "pointer", fontWeight: 600,
                          }}
                        >
                          ↺ Reprogramar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDeliveries.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    {searchLower
                      ? "No hay coincidencias."
                      : filterTruck
                        ? "No hay entregas para este camión."
                        : "No hay entregas asignadas."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h4 style={{ fontSize: "0.95rem" }}>Ventas realizadas</h4>
        {salesError && <div className="error" style={{ marginBottom: 8 }}>{salesError}</div>}
        <div style={{ marginBottom: 6, fontSize: 12 }}>
          Ventas: <strong>{filteredSales.length}</strong>
          {" "}| Total:{" "}
          <strong>Bs. {filteredSales.reduce((sum, s) => sum + Number(s.total || 0), 0).toFixed(2)}</strong>
        </div>
        <div className="table-scroll">
          <table className="table table-sales-movil">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Entregado</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s, idx) => (
                <tr key={s.pedido_id}>
                  <td>{idx + 1}</td>
                  <td>{s.cliente}</td>
                  <td><span className={statusClass(s.estado_entrega)}>{s.estado_entrega}</span></td>
                  <td>{s.entregado_en ? new Date(s.entregado_en).toLocaleString() : "-"}</td>
                  <td>Bs. {Number(s.total || 0).toFixed(2)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => undoEntregado(s.entrega_id)}
                      disabled={undoLoading[s.entrega_id]}
                      title="Deshacer entrega — vuelve a Pendiente"
                      style={{
                        background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5",
                        borderRadius: 6, padding: "4px 8px", fontSize: 11,
                        cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
                        opacity: undoLoading[s.entrega_id] ? 0.6 : 1,
                      }}
                    >
                      {undoLoading[s.entrega_id] ? "..." : "↩ Deshacer"}
                    </button>
                  </td>
                </tr>
              ))}
              {!salesLoading && filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    {filterTruck ? "No hay ventas para este camión." : "No hay ventas registradas."}
                  </td>
                </tr>
              )}
              {filteredSales.length > 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "right" }}>Total</td>
                  <td>Bs. {filteredSales.reduce((sum, s) => sum + Number(s.total || 0), 0).toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
