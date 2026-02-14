import { useEffect, useState } from "react";
import api from "../api";

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ product_id: "", qty: "" });
  const [inventoryError, setInventoryError] = useState("");

  async function load() {
    const res = await api.get("/api/warehouses");
    setWarehouses(res.data);
    if (!selectedId && res.data.length > 0) {
      const firstId = res.data[0].id;
      setSelectedId(firstId);
      loadInventory(firstId);
    }
  }

  async function loadProducts() {
    const res = await api.get("/api/products");
    setProducts(res.data || []);
  }

  async function loadInventory(id) {
    const res = await api.get(`/api/warehouses/${id}/inventory`);
    setInventory(res.data);
  }

  useEffect(() => {
    load();
    loadProducts();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setInventoryError("");
    if (!selectedId) {
      setInventoryError("Seleccione un almacén.");
      return;
    }
    if (!form.product_id || !form.qty) {
      setInventoryError("Seleccione un producto y cantidad.");
      return;
    }
    await api.post("/api/inventory/move", {
      warehouse_id: selectedId,
      product_id: form.product_id,
      qty: Number(form.qty),
      type: "IN",
      note: "Ingreso manual",
    });
    setForm({ product_id: "", qty: "" });
    loadInventory(selectedId);
  }

  return (
    <div className="container page">
      <h2>Almacenes</h2>
      <div className="card" style={{ marginTop: 16 }}>
        <form onSubmit={handleCreate} className="form">
          <div className="form-row">
            <select
              value={selectedId || ""}
              onChange={(e) => {
                const nextId = e.target.value ? Number(e.target.value) : null;
                setSelectedId(nextId);
                if (nextId) {
                  loadInventory(nextId);
                } else {
                  setInventory([]);
                }
              }}
            >
              <option value="">Seleccione almacén</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <select
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            >
              <option value="">Seleccione producto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Cantidad ingresada"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
            />
          </div>
          {inventoryError && <div className="error">{inventoryError}</div>}
          <button className="btn" type="submit">Ingresar</button>
        </form>
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h4>Lista</h4>
          <ul>
            {warehouses.map((w) => (
              <li key={w.id}>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setSelectedId(w.id);
                    loadInventory(w.id);
                  }}
                >
                  {w.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h4>Inventario</h4>
          {!selectedId && <div>Seleccione un almacén</div>}
          {selectedId && (
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product_name}</td>
                    <td>{i.quantity}</td>
                    <td>{i.min_stock}</td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan={3}>Sin existencias en este almacén.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
