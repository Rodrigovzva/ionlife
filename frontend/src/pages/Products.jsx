import { useEffect, useState } from "react";
import api from "../api";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
  });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    active: true,
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

  function startEdit(product) {
    setEditId(product.id);
    setEditForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      active: product.active !== false,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({ name: "", description: "", price: "", active: true });
  }

  async function saveEdit() {
    await api.put(`/api/products/${editId}`, {
      name: editForm.name,
      description: editForm.description,
      price: Number(editForm.price),
      active: !!editForm.active,
    });
    cancelEdit();
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
            <th>Descripción</th>
            <th>Precio</th>
            <th>Activo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>
                {editId === p.id ? (
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                ) : (
                  p.name
                )}
              </td>
              <td>
                {editId === p.id ? (
                  <input
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                  />
                ) : (
                  p.description || "-"
                )}
              </td>
              <td>
                {editId === p.id ? (
                  <input
                    value={editForm.price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: e.target.value })
                    }
                  />
                ) : (
                  p.price
                )}
              </td>
              <td>
                {editId === p.id ? (
                  <select
                    value={editForm.active ? "true" : "false"}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        active: e.target.value === "true",
                      })
                    }
                  >
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  p.active ? "Sí" : "No"
                )}
              </td>
              <td>
                {editId === p.id ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-sm" type="button" onClick={saveEdit}>
                      Guardar
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={cancelEdit}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => startEdit(p)}
                  >
                    Editar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}
