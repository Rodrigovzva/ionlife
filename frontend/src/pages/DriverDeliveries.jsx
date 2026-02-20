import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function DriverDeliveries() {
  const navigate = useNavigate();
  const today = new Date();
  const todayIso = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const [deliveries, setDeliveries] = useState([]);
  const [filterDate, setFilterDate] = useState(todayIso);
  const [sales, setSales] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState({});
  const [loading, setLoading] = useState(false);
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
  }, [filterDate]);

  async function updateStatus(deliveryId) {
    const status = statusUpdates[deliveryId];
    if (!status) return;
    setLoading(true);
    try {
      await api.patch(`/api/logistics/deliveries/${deliveryId}/status`, {
        status,
      });
      setStatusUpdates((prev) => ({ ...prev, [deliveryId]: "" }));
      load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page">
      <h2>Mis entregas</h2>
      <div className="card">
        {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}
        <div className="form-row" style={{ marginBottom: 8 }}>
          <div className="form-field">
            <label>Fecha</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table className="table table-deliveries">
            <thead>
              <tr>
                <th>ID Entrega</th>
                <th>Cliente</th>
                <th className="col-address">Dirección</th>
                <th>Repartidor</th>
                <th>Camión</th>
                <th>Estado</th>
                <th className="col-order">Pedido</th>
                <th>Fecha venta</th>
                <th>Programado</th>
                <th>Actualizar</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.cliente}</td>
                  <td className="col-address">{d.direccion || "-"}</td>
                  <td>{d.repartidor}</td>
                  <td>{d.camion}</td>
                  <td><span className={statusClass(d.estado)}>{d.estado}</span></td>
                  <td className="col-order">{d.pedido_detalle || "-"}</td>
                  <td>{d.entregado_en ? new Date(d.entregado_en).toLocaleString() : "-"}</td>
                  <td>
                    {d.programado_en
                      ? new Date(d.programado_en).toLocaleString()
                      : d.fecha_programada
                      ? new Date(d.fecha_programada).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() => navigate(`/pedidos?edit=${d.pedido_id}`)}
                        disabled={!d.pedido_id}
                      >
                        Editar pedido
                      </button>
                      <select
                        value={statusUpdates[d.id] || ""}
                        onChange={(e) =>
                          setStatusUpdates((prev) => ({
                            ...prev,
                            [d.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Cambiar estado</option>
                        <option>Entregado</option>
                        <option>Cancelado</option>
                      </select>
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() => updateStatus(d.id)}
                        disabled={!statusUpdates[d.id] || loading}
                      >
                        {loading ? "Guardando..." : "Actualizar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {deliveries.length === 0 && (
                <tr>
                  <td colSpan={10}>No hay entregas asignadas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h4>Ventas realizadas</h4>
        {salesError && <div className="error" style={{ marginBottom: 8 }}>{salesError}</div>}
        <div style={{ marginBottom: 8 }}>
          Ventas: <strong>{sales.length}</strong>{" "}
          | Total a cobrar:{" "}
          <strong>
            Bs. {sales.reduce((sum, s) => sum + Number(s.total || 0), 0).toFixed(2)}
          </strong>
        </div>
        <div className="table-scroll">
          <table className="table table-sales">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Entregado</th>
                <th>Camión</th>
                <th>Repartidor</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.pedido_id}>
                  <td>{s.pedido_id}</td>
                  <td>{s.cliente}</td>
                  <td><span className={statusClass(s.estado_entrega)}>{s.estado_entrega}</span></td>
                  <td>{s.entregado_en ? new Date(s.entregado_en).toLocaleString() : "-"}</td>
                  <td>{s.camion}</td>
                  <td>{s.repartidor}</td>
                  <td>Bs. {Number(s.total || 0).toFixed(2)}</td>
                </tr>
              ))}
              {!salesLoading && sales.length === 0 && (
                <tr>
                  <td colSpan={7}>No hay ventas registradas.</td>
                </tr>
              )}
              {sales.length > 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "right" }}>
                    Total
                  </td>
                  <td>
                    Bs. {sales.reduce((sum, s) => sum + Number(s.total || 0), 0).toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
