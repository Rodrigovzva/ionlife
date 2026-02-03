import { useEffect, useState } from "react";
import api from "../api";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tiposCliente, setTiposCliente] = useState([]);
  const [tipoForm, setTipoForm] = useState({ nombre: "", descuento_unidades: 0 });
  const [editTipoId, setEditTipoId] = useState(null);
  const [editTipoNombre, setEditTipoNombre] = useState("");
  const [editTipoActivo, setEditTipoActivo] = useState(true);
  const [editTipoDescuento, setEditTipoDescuento] = useState(0);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    is_active: true,
  });
  const [roleAssign, setRoleAssign] = useState({
    user_id: "",
    role_ids: [],
  });

  async function load() {
    const [u, r, t] = await Promise.all([
      api.get("/api/admin/users"),
      api.get("/api/admin/roles"),
      api.get("/api/admin/tipos-cliente"),
    ]);
    setUsers(u.data);
    setRoles(r.data);
    setTiposCliente(t.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    await api.post("/api/admin/users", form);
    setForm({ name: "", email: "", password: "", is_active: true });
    load();
  }

  async function handleAssignRoles(e) {
    e.preventDefault();
    if (!roleAssign.user_id) return;
    await api.put(`/api/admin/users/${roleAssign.user_id}/roles`, {
      role_ids: roleAssign.role_ids.map(Number),
    });
    load();
  }

  async function handleCreateTipo(e) {
    e.preventDefault();
    if (!tipoForm.nombre) return;
    await api.post("/api/admin/tipos-cliente", tipoForm);
    setTipoForm({ nombre: "", descuento_unidades: 0 });
    load();
  }

  async function handleUpdateTipo(e) {
    e.preventDefault();
    if (!editTipoId || !editTipoNombre) return;
    await api.put(`/api/admin/tipos-cliente/${editTipoId}`, {
      nombre: editTipoNombre,
      activo: editTipoActivo,
      descuento_unidades: editTipoDescuento,
    });
    setEditTipoId(null);
    setEditTipoNombre("");
    setEditTipoActivo(true);
    load();
  }

  function startEditTipo(tipo) {
    setEditTipoId(tipo.id);
    setEditTipoNombre(tipo.nombre);
    setEditTipoActivo(Boolean(tipo.activo));
    setEditTipoDescuento(Number(tipo.descuento_unidades || 0));
  }

  function toggleRole(roleId) {
    setRoleAssign((prev) => {
      const exists = prev.role_ids.includes(roleId);
      return {
        ...prev,
        role_ids: exists
          ? prev.role_ids.filter((id) => id !== roleId)
          : [...prev.role_ids, roleId],
      };
    });
  }

  return (
    <div className="container page">
      <h2>Administración del sistema</h2>
      <div className="grid grid-2">
        <div className="card">
          <h4>Crear usuario</h4>
          <form onSubmit={handleCreate} className="form">
            <div className="form-row">
              <input
                placeholder="Nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                placeholder="Usuario / correo"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="form-row">
              <input
                placeholder="Contraseña"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <select
                value={form.is_active ? "Activo" : "Inactivo"}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.value === "Activo" })
                }
              >
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
            </div>
            <button className="btn" type="submit">Crear usuario</button>
          </form>
        </div>
        <div className="card">
          <h4>Asignar roles</h4>
          <form onSubmit={handleAssignRoles} className="form">
            <select
              value={roleAssign.user_id}
              onChange={(e) =>
                setRoleAssign({ ...roleAssign, user_id: e.target.value })
              }
            >
              <option value="">Seleccione un usuario</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <div className="grid">
              {roles.map((r) => (
                <label key={r.id} style={{ display: "flex", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={roleAssign.role_ids.includes(r.id)}
                    onChange={() => toggleRole(r.id)}
                  />
                  {r.name}
                </label>
              ))}
            </div>
            <button className="btn" type="submit">Actualizar roles</button>
          </form>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h4>Usuarios registrados</h4>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Roles</th>
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.is_active ? "Activo" : "Inactivo"}</td>
                <td>{u.roles || "-"}</td>
                <td>{u.created_at ? new Date(u.created_at).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h4>Tipos de cliente</h4>
        <form onSubmit={handleCreateTipo} className="form">
          <div className="form-row">
            <input
              placeholder="Nuevo tipo de cliente"
              value={tipoForm.nombre}
              onChange={(e) => setTipoForm({ nombre: e.target.value })}
            />
            <input
              placeholder="Descuento por unidad (Bs.)"
              value={tipoForm.descuento_unidades}
              onChange={(e) =>
                setTipoForm({
                  ...tipoForm,
                  descuento_unidades: e.target.value,
                })
              }
            />
            <button className="btn" type="submit">Agregar tipo</button>
          </div>
        </form>
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Activo</th>
              <th>Descuento/u</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tiposCliente.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>
                  {editTipoId === t.id ? (
                    <input
                      value={editTipoNombre}
                      onChange={(e) => setEditTipoNombre(e.target.value)}
                    />
                  ) : (
                    t.nombre
                  )}
                </td>
                <td>
                  {editTipoId === t.id ? (
                    <select
                      value={editTipoActivo ? "Sí" : "No"}
                      onChange={(e) =>
                        setEditTipoActivo(e.target.value === "Sí")
                      }
                    >
                      <option>Sí</option>
                      <option>No</option>
                    </select>
                  ) : (
                    t.activo ? "Sí" : "No"
                  )}
                </td>
                <td>
                  {editTipoId === t.id ? (
                    <input
                      value={editTipoDescuento}
                      onChange={(e) => setEditTipoDescuento(e.target.value)}
                    />
                  ) : (
                    t.descuento_unidades ?? 0
                  )}
                </td>
                <td>{t.fecha_creacion ? new Date(t.fecha_creacion).toLocaleString() : "-"}</td>
                <td>
                  {editTipoId === t.id ? (
                    <form onSubmit={handleUpdateTipo} style={{ display: "flex", gap: 8 }}>
                      <button className="btn" type="submit">Guardar</button>
                      <button
                        className="btn btn-outline"
                        type="button"
                        onClick={() => setEditTipoId(null)}
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <button
                      className="btn btn-outline"
                      type="button"
                      onClick={() => startEditTipo(t)}
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
