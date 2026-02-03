import { useEffect, useState } from "react";
import api from "../api";

function statusClass(status) {
  if (!status) return "tag";
  return `tag status-${status.toLowerCase().replace(/\s+/g, "_")}`;
}

export default function Logistics() {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [truckForm, setTruckForm] = useState({ plate: "", capacity: "" });
  const [driverForm, setDriverForm] = useState({ name: "", phone: "" });
  const [deliveryForm, setDeliveryForm] = useState({
    order_id: "",
    truck_id: "",
    driver_id: "",
  });
  const [truckError, setTruckError] = useState("");
  const [driverError, setDriverError] = useState("");
  const [deliveryError, setDeliveryError] = useState("");

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

  useEffect(() => {
    load();
    loadDeliveries();
  }, []);

  async function createTruck(e) {
    e.preventDefault();
    setTruckError("");
    if (!truckForm.plate.trim()) {
      setTruckError("La placa es obligatoria.");
      return;
    }
    await api.post("/api/logistics/trucks", {
      plate: truckForm.plate.trim(),
      capacity: Number(truckForm.capacity),
    });
    setTruckForm({ plate: "", capacity: "" });
    load();
  }

  async function createDriver(e) {
    e.preventDefault();
    setDriverError("");
    if (!driverForm.name.trim()) {
      setDriverError("El nombre es obligatorio.");
      return;
    }
    await api.post("/api/logistics/drivers", driverForm);
    setDriverForm({ name: "", phone: "" });
    load();
  }

  async function createDelivery(e) {
    e.preventDefault();
    setDeliveryError("");
    if (!deliveryForm.order_id || !deliveryForm.truck_id || !deliveryForm.driver_id) {
      setDeliveryError("Complete pedido, camión y repartidor.");
      return;
    }
    await api.post("/api/logistics/deliveries", {
      order_id: Number(deliveryForm.order_id),
      truck_id: Number(deliveryForm.truck_id),
      driver_id: Number(deliveryForm.driver_id),
    });
    setDeliveryForm({ order_id: "", truck_id: "", driver_id: "" });
    loadDeliveries();
  }

  return (
    <div className="container page">
      <h2>Logística</h2>
      <div className="grid">
        <div className="card">
          <form onSubmit={createTruck} className="form">
            <div className="form-row">
              <input
                placeholder="Placa"
                value={truckForm.plate}
                onChange={(e) =>
                  setTruckForm({ ...truckForm, plate: e.target.value })
                }
              />
              <input
                placeholder="Capacidad"
                value={truckForm.capacity}
                onChange={(e) =>
                  setTruckForm({ ...truckForm, capacity: e.target.value })
                }
              />
            </div>
            <button className="btn" type="submit">Registrar camión</button>
          </form>
          {truckError && <div className="error">{truckError}</div>}
        </div>
        <div className="card">
          <form onSubmit={createDriver} className="form">
            <div className="form-row">
              <input
                placeholder="Nombre"
                value={driverForm.name}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, name: e.target.value })
                }
              />
              <input
                placeholder="Teléfono"
                value={driverForm.phone}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, phone: e.target.value })
                }
              />
            </div>
            <button className="btn" type="submit">Registrar repartidor</button>
          </form>
          {driverError && <div className="error">{driverError}</div>}
        </div>
        <div className="card">
          <form onSubmit={createDelivery} className="form">
            <div className="form-row">
              <select
                value={deliveryForm.order_id}
                onChange={(e) =>
                  setDeliveryForm({ ...deliveryForm, order_id: e.target.value })
                }
              >
                <option value="">Seleccione pedido pendiente</option>
                {pendingOrders.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} - {p.customer_name} ({p.status})
                  </option>
                ))}
              </select>
              <select
                value={deliveryForm.truck_id}
                onChange={(e) =>
                  setDeliveryForm({ ...deliveryForm, truck_id: e.target.value })
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
                value={deliveryForm.driver_id}
                onChange={(e) =>
                  setDeliveryForm({ ...deliveryForm, driver_id: e.target.value })
                }
              >
                <option value="">Seleccione repartidor</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn" type="submit">Asignar entrega</button>
          </form>
          {deliveryError && <div className="error">{deliveryError}</div>}
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
