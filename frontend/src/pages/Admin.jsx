import { useEffect, useState } from "react";
import api from "../api";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tiposCliente, setTiposCliente] = useState([]);
  const [tiposPrecio, setTiposPrecio] = useState([]);
  const [products, setProducts] = useState([]);
  const [preciosProducto, setPreciosProducto] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [truckForm, setTruckForm] = useState({ plate: "", capacity: "" });
  const [driverForm, setDriverForm] = useState({ name: "", phone: "" });
  const [truckError, setTruckError] = useState("");
  const [driverError, setDriverError] = useState("");
  const [warehouseForm, setWarehouseForm] = useState({ name: "", location: "" });
  const [warehouseError, setWarehouseError] = useState("");
  const [tipoForm, setTipoForm] = useState({ nombre: "", descuento_unidades: 0 });
  const [editTipoId, setEditTipoId] = useState(null);
  const [editTipoNombre, setEditTipoNombre] = useState("");
  const [editTipoActivo, setEditTipoActivo] = useState(true);
  const [editTipoDescuento, setEditTipoDescuento] = useState(0);
  const [tipoPrecioForm, setTipoPrecioForm] = useState({ nombre: "" });
  const [editTipoPrecioId, setEditTipoPrecioId] = useState(null);
  const [editTipoPrecioNombre, setEditTipoPrecioNombre] = useState("");
  const [editTipoPrecioActivo, setEditTipoPrecioActivo] = useState(true);
  const [precioProductoForm, setPrecioProductoForm] = useState({
    producto_id: "",
    tipo_precio_id: "",
    precio: "",
    activo: true,
  });
  const [precioProductoError, setPrecioProductoError] = useState("");
  const [editPrecioProductoId, setEditPrecioProductoId] = useState(null);
  const [editPrecioProductoPrecio, setEditPrecioProductoPrecio] = useState("");
  const [editPrecioProductoActivo, setEditPrecioProductoActivo] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    is_active: true,
  });
  const [editUserId, setEditUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    name: "",
    email: "",
    is_active: true,
    password: "",
  });
  const [roleAssign, setRoleAssign] = useState({
    user_id: "",
    role_ids: [],
  });
  const [roleForm, setRoleForm] = useState({ name: "" });
  const [roleError, setRoleError] = useState("");
  const [roleSuccess, setRoleSuccess] = useState("");
  const [editRoleId, setEditRoleId] = useState(null);
  const [editRoleName, setEditRoleName] = useState("");

  async function load() {
    const [u, r, t, tp, pr, pp, tr, dr] = await Promise.all([
      api.get("/api/admin/users"),
      api.get("/api/admin/roles"),
      api.get("/api/admin/tipos-cliente"),
      api.get("/api/admin/tipos-precio"),
      api.get("/api/products"),
      api.get("/api/admin/precios-producto"),
      api.get("/api/logistics/trucks"),
      api.get("/api/logistics/drivers"),
    ]);
    setUsers(u.data);
    setRoles(r.data);
    setTiposCliente(t.data);
    setTiposPrecio(tp.data || []);
    setProducts(pr.data || []);
    setPreciosProducto(pp.data || []);
    setTrucks(tr.data || []);
    setDrivers(dr.data || []);
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

  async function createWarehouse(e) {
    e.preventDefault();
    setWarehouseError("");
    if (!warehouseForm.name.trim()) {
      setWarehouseError("Nombre requerido.");
      return;
    }
    await api.post("/api/warehouses", {
      name: warehouseForm.name.trim(),
      location: warehouseForm.location?.trim() || "",
    });
    setWarehouseForm({ name: "", location: "" });
    load();
  }

  function startEditUser(user) {
    setEditUserId(user.id);
    setEditUserForm({
      name: user.name || "",
      email: user.email || "",
      is_active: Boolean(user.is_active),
      password: "",
    });
  }

  function cancelEditUser() {
    setEditUserId(null);
    setEditUserForm({ name: "", email: "", is_active: true, password: "" });
  }

  async function saveUser() {
    await api.put(`/api/admin/users/${editUserId}`, {
      name: editUserForm.name,
      email: editUserForm.email,
      is_active: editUserForm.is_active,
    });
    cancelEditUser();
    load();
  }

  async function updatePassword() {
    if (!editUserForm.password) return;
    await api.put(`/api/admin/users/${editUserId}/password`, {
      password: editUserForm.password,
    });
    setEditUserForm((prev) => ({ ...prev, password: "" }));
  }

  async function handleAssignRoles(e) {
    e.preventDefault();
    if (!roleAssign.user_id) return;
    await api.put(`/api/admin/users/${roleAssign.user_id}/roles`, {
      role_ids: roleAssign.role_ids.map(Number),
    });
    load();
  }

  async function handleCreateRole(e) {
    e.preventDefault();
    setRoleError("");
    if (!roleForm.name.trim()) {
      setRoleError("Nombre requerido.");
      return;
    }
    try {
      await api.post("/api/admin/roles", { name: roleForm.name.trim() });
      setRoleForm({ name: "" });
      load();
    } catch (err) {
      setRoleError(err?.response?.data?.error || "No se pudo crear el rol.");
    }
  }

  function startEditRole(role) {
    setEditRoleId(role.id);
    setEditRoleName(role.name || "");
  }

  function cancelEditRole() {
    setEditRoleId(null);
    setEditRoleName("");
  }

  async function handleUpdateRole(e) {
    e?.preventDefault?.();
    setRoleError("");
    setRoleSuccess("");
    if (!editRoleId || !editRoleName.trim()) {
      setRoleError("Nombre requerido.");
      return;
    }
    try {
      await api.put(`/api/admin/roles/${editRoleId}`, {
        name: editRoleName.trim(),
      });
      setRoleSuccess("Rol actualizado correctamente.");
      cancelEditRole();
      load();
    } catch (err) {
      setRoleError(err?.response?.data?.error || "No se pudo actualizar el rol.");
    }
  }

  async function handleCreateTipo(e) {
    e.preventDefault();
    if (!tipoForm.nombre) return;
    await api.post("/api/admin/tipos-cliente", tipoForm);
    setTipoForm({ nombre: "", descuento_unidades: 0 });
    load();
  }

  async function handleCreateTipoPrecio(e) {
    e.preventDefault();
    if (!tipoPrecioForm.nombre) return;
    await api.post("/api/admin/tipos-precio", tipoPrecioForm);
    setTipoPrecioForm({ nombre: "" });
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

  async function handleUpdateTipoPrecio(e) {
    e.preventDefault();
    if (!editTipoPrecioId || !editTipoPrecioNombre) return;
    await api.put(`/api/admin/tipos-precio/${editTipoPrecioId}`, {
      nombre: editTipoPrecioNombre,
      activo: editTipoPrecioActivo,
    });
    setEditTipoPrecioId(null);
    setEditTipoPrecioNombre("");
    setEditTipoPrecioActivo(true);
    load();
  }

  async function handleCreatePrecioProducto(e) {
    e.preventDefault();
    setPrecioProductoError("");
    if (!precioProductoForm.producto_id || !precioProductoForm.tipo_precio_id) {
      setPrecioProductoError("Seleccione producto y tipo de precio.");
      return;
    }
    if (precioProductoForm.precio === "" || Number(precioProductoForm.precio) <= 0) {
      setPrecioProductoError("Ingrese un precio válido.");
      return;
    }
    try {
      await api.post("/api/admin/precios-producto", {
        producto_id: precioProductoForm.producto_id,
        tipo_precio_id: precioProductoForm.tipo_precio_id,
        precio: precioProductoForm.precio,
        activo: precioProductoForm.activo,
      });
      setPrecioProductoForm({
        producto_id: "",
        tipo_precio_id: "",
        precio: "",
        activo: true,
      });
      load();
    } catch (err) {
      setPrecioProductoError(
        err?.response?.data?.error || "No se pudo guardar el precio."
      );
    }
  }

  async function handleUpdatePrecioProducto(e) {
    e.preventDefault();
    if (!editPrecioProductoId) return;
    await api.put(`/api/admin/precios-producto/${editPrecioProductoId}`, {
      precio: editPrecioProductoPrecio,
      activo: editPrecioProductoActivo,
    });
    setEditPrecioProductoId(null);
    setEditPrecioProductoPrecio("");
    setEditPrecioProductoActivo(true);
    load();
  }

  function startEditTipo(tipo) {
    setEditTipoId(tipo.id);
    setEditTipoNombre(tipo.nombre);
    setEditTipoActivo(Boolean(tipo.activo));
    setEditTipoDescuento(Number(tipo.descuento_unidades || 0));
  }

  function startEditTipoPrecio(tipo) {
    setEditTipoPrecioId(tipo.id);
    setEditTipoPrecioNombre(tipo.nombre);
    setEditTipoPrecioActivo(Boolean(tipo.activo));
  }

  function startEditPrecioProducto(item) {
    setEditPrecioProductoId(item.id);
    setEditPrecioProductoPrecio(String(item.precio));
    setEditPrecioProductoActivo(Boolean(item.activo));
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
        <h4>Crear rol</h4>
        <form onSubmit={handleCreateRole} className="form">
          <div className="form-row">
            <input
              placeholder="Nombre del rol"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ name: e.target.value })}
            />
            <button className="btn" type="submit">Crear rol</button>
          </div>
        </form>
        {roleError && <div className="error">{roleError}</div>}
        {roleSuccess && <div className="tag">{roleSuccess}</div>}
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>
                  {editRoleId === r.id ? (
                    <input
                      value={editRoleName}
                      onChange={(e) => setEditRoleName(e.target.value)}
                    />
                  ) : (
                    r.name
                  )}
                </td>
                <td>
                  {editRoleId === r.id ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-sm"
                        type="button"
                        onClick={handleUpdateRole}
                      >
                        Guardar
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={cancelEditRole}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => startEditRole(r)}
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
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h4>Registrar camión</h4>
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
          <h4>Registrar repartidor</h4>
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
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h4>Crear almacén</h4>
        <form onSubmit={createWarehouse} className="form">
          <div className="form-row">
            <input
              placeholder="Nombre del almacén"
              value={warehouseForm.name}
              onChange={(e) =>
                setWarehouseForm({ ...warehouseForm, name: e.target.value })
              }
            />
            <input
              placeholder="Ubicación"
              value={warehouseForm.location}
              onChange={(e) =>
                setWarehouseForm({ ...warehouseForm, location: e.target.value })
              }
            />
          </div>
          {warehouseError && <div className="error">{warehouseError}</div>}
          <button className="btn" type="submit">Crear almacén</button>
        </form>
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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>
                  {editUserId === u.id ? (
                    <input
                      value={editUserForm.name}
                      onChange={(e) =>
                        setEditUserForm({ ...editUserForm, name: e.target.value })
                      }
                    />
                  ) : (
                    u.name
                  )}
                </td>
                <td>
                  {editUserId === u.id ? (
                    <input
                      value={editUserForm.email}
                      onChange={(e) =>
                        setEditUserForm({ ...editUserForm, email: e.target.value })
                      }
                    />
                  ) : (
                    u.email
                  )}
                </td>
                <td>
                  {editUserId === u.id ? (
                    <select
                      value={editUserForm.is_active ? "Activo" : "Inactivo"}
                      onChange={(e) =>
                        setEditUserForm({
                          ...editUserForm,
                          is_active: e.target.value === "Activo",
                        })
                      }
                    >
                      <option>Activo</option>
                      <option>Inactivo</option>
                    </select>
                  ) : (
                    u.is_active ? "Activo" : "Inactivo"
                  )}
                </td>
                <td>{u.roles || "-"}</td>
                <td>{u.created_at ? new Date(u.created_at).toLocaleString() : "-"}</td>
                <td>
                  {editUserId === u.id ? (
                    <div className="form" style={{ gap: 8 }}>
                      <div className="form-row">
                        <input
                          type="password"
                          placeholder="Nueva contraseña"
                          value={editUserForm.password}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              password: e.target.value,
                            })
                          }
                        />
                        <button
                          className="btn btn-outline btn-sm"
                          type="button"
                          onClick={updatePassword}
                        >
                          Cambiar contraseña
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-sm" type="button" onClick={saveUser}>
                          Guardar
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          type="button"
                          onClick={cancelEditUser}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      onClick={() => startEditUser(u)}
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
      <div className="card" style={{ marginTop: 16 }}>
        <h4>Tipos de precio</h4>
        <form onSubmit={handleCreateTipoPrecio} className="form">
          <div className="form-row">
            <input
              placeholder="Nuevo tipo de precio"
              value={tipoPrecioForm.nombre}
              onChange={(e) =>
                setTipoPrecioForm({ ...tipoPrecioForm, nombre: e.target.value })
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
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tiposPrecio.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>
                  {editTipoPrecioId === t.id ? (
                    <input
                      value={editTipoPrecioNombre}
                      onChange={(e) => setEditTipoPrecioNombre(e.target.value)}
                    />
                  ) : (
                    t.nombre
                  )}
                </td>
                <td>
                  {editTipoPrecioId === t.id ? (
                    <select
                      value={editTipoPrecioActivo ? "Sí" : "No"}
                      onChange={(e) =>
                        setEditTipoPrecioActivo(e.target.value === "Sí")
                      }
                    >
                      <option>Sí</option>
                      <option>No</option>
                    </select>
                  ) : (
                    t.activo ? "Sí" : "No"
                  )}
                </td>
                <td>{t.fecha_creacion ? new Date(t.fecha_creacion).toLocaleString() : "-"}</td>
                <td>
                  {editTipoPrecioId === t.id ? (
                    <form onSubmit={handleUpdateTipoPrecio} style={{ display: "flex", gap: 8 }}>
                      <button className="btn" type="submit">Guardar</button>
                      <button
                        className="btn btn-outline"
                        type="button"
                        onClick={() => setEditTipoPrecioId(null)}
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <button
                      className="btn btn-outline"
                      type="button"
                      onClick={() => startEditTipoPrecio(t)}
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
      <div className="card" style={{ marginTop: 16 }}>
        <h4>Precios por producto</h4>
        <form onSubmit={handleCreatePrecioProducto} className="form">
          <div className="form-row">
            <select
              value={precioProductoForm.producto_id}
              onChange={(e) =>
                setPrecioProductoForm({
                  ...precioProductoForm,
                  producto_id: e.target.value,
                })
              }
            >
              <option value="">Producto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={precioProductoForm.tipo_precio_id}
              onChange={(e) =>
                setPrecioProductoForm({
                  ...precioProductoForm,
                  tipo_precio_id: e.target.value,
                })
              }
            >
              <option value="">Tipo de precio</option>
              {tiposPrecio.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
            <input
              placeholder="Precio (Bs.)"
              value={precioProductoForm.precio}
              onChange={(e) =>
                setPrecioProductoForm({
                  ...precioProductoForm,
                  precio: e.target.value,
                })
              }
            />
            <select
              value={precioProductoForm.activo ? "Sí" : "No"}
              onChange={(e) =>
                setPrecioProductoForm({
                  ...precioProductoForm,
                  activo: e.target.value === "Sí",
                })
              }
            >
              <option>Sí</option>
              <option>No</option>
            </select>
            <button className="btn" type="submit">Agregar precio</button>
          </div>
        </form>
        {precioProductoError && <div className="error">{precioProductoError}</div>}
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Tipo de precio</th>
              <th>Precio</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {preciosProducto.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.producto}</td>
                <td>{p.tipo_precio}</td>
                <td>
                  {editPrecioProductoId === p.id ? (
                    <input
                      value={editPrecioProductoPrecio}
                      onChange={(e) => setEditPrecioProductoPrecio(e.target.value)}
                    />
                  ) : (
                    p.precio
                  )}
                </td>
                <td>
                  {editPrecioProductoId === p.id ? (
                    <select
                      value={editPrecioProductoActivo ? "Sí" : "No"}
                      onChange={(e) =>
                        setEditPrecioProductoActivo(e.target.value === "Sí")
                      }
                    >
                      <option>Sí</option>
                      <option>No</option>
                    </select>
                  ) : (
                    p.activo ? "Sí" : "No"
                  )}
                </td>
                <td>
                  {editPrecioProductoId === p.id ? (
                    <form onSubmit={handleUpdatePrecioProducto} style={{ display: "flex", gap: 8 }}>
                      <button className="btn" type="submit">Guardar</button>
                      <button
                        className="btn btn-outline"
                        type="button"
                        onClick={() => setEditPrecioProductoId(null)}
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <button
                      className="btn btn-outline"
                      type="button"
                      onClick={() => startEditPrecioProducto(p)}
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
