import { useEffect, useState } from "react";
import api from "../api";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
  });

  async function load() {
    const res = await api.get("/api/products");
    setProducts(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    await api.post("/api/products", {
      ...form,
      price: Number(form.price),
    });
    setForm({ name: "", description: "", price: "" });
    load();
  }

  return (
    <div className="container page">
      <h2>Productos</h2>
      <div className="card">
        <form onSubmit={handleCreate} className="form">
          <div className="form-row">
            <input
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="Descripción"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <input
              placeholder="Precio"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <button className="btn" type="submit">Agregar</button>
        </form>
      </div>
      <div style={{ marginTop: 16 }}>
        <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Activo</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.price}</td>
              <td>{p.active ? "Sí" : "No"}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}
