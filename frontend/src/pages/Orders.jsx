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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  
  const [statusUpdates, setStatusUpdates] = useState({});
  const [statusLoading, setStatusLoading] = useState({});
  const [search, setSearch] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    zona: "",
  });
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const [products, setProducts] = useState([]);
  const [tiposCliente, setTiposCliente] = useState([]);
  const [tiposPrecio, setTiposPrecio] = useState([]);
  const [preciosProducto, setPreciosProducto] = useState([]);
  const [orderFilters, setOrderFilters] = useState({
    status: "Pendiente|Reprogramado",
    month: "",
  });
  const [addressHint, setAddressHint] = useState("");
  const [form, setForm] = useState({
    customer_id: "",
    customer_name: "",
    customer_type: "",
    address_text: "",
    address_id: "",
    scheduled_date: "",
    notes: "",
  });
  const [items, setItems] = useState([
    {
      product_id: "",
      quantity: 1,
      price: 0,
      discount_unit: 0,
      price_type_id: "",
      price_type_name: "",
    },
  ]);

  async function load() {
    const [resOrders, resProducts, resTipos, resTiposPrecio, resPreciosProducto] =
      await Promise.all([
      api.get("/api/orders"),
      api.get("/api/products"),
      api.get("/api/tipos-cliente"),
      api.get("/api/tipos-precio"),
      api.get("/api/precios-producto"),
    ]);
    setOrders(resOrders.data);
    setProducts(resProducts.data || []);
    setTiposCliente(resTipos.data || []);
    setTiposPrecio(resTiposPrecio.data || []);
    setPreciosProducto(resPreciosProducto.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setSearchError("");
    try {
      const res = await api.get("/api/customers/search", {
        params: {
          nombre: search.nombre || undefined,
          telefono: search.telefono || undefined,
          direccion: search.direccion || undefined,
          zona: search.zona || undefined,
        },
      });
      setResults(res.data);
    } catch (err) {
      setSearchError("No se pudo buscar clientes.");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setOrderError("");
    setOrderSuccess("");
    if (!form.customer_id) {
      setOrderError("Seleccione un cliente antes de crear el pedido.");
      return;
    }
    const today = new Date();
    const hasOrderToday = orders.some((o) => {
      if (String(o.customer_id || o.cliente_id) !== String(form.customer_id)) {
        return false;
      }
      if (!o.created_at) return false;
      const created = new Date(o.created_at);
      return (
        created.getFullYear() === today.getFullYear() &&
        created.getMonth() === today.getMonth() &&
        created.getDate() === today.getDate()
      );
    });
    if (hasOrderToday) {
      const ok = window.confirm(
        "Este cliente ya tiene pedidos para hoy. ¿Seguro que quiere registrar otro?"
      );
      if (!ok) {
        return;
      }
    }
    const cleanItems = items
      .filter((i) => i.product_id && Number(i.quantity) > 0)
      .map((i) => ({
        product_id: Number(i.product_id),
        quantity: Number(i.quantity),
        price: Number(i.price),
        discount_unit: Number(i.discount_unit || 0),
        price_type_id: i.price_type_id ? Number(i.price_type_id) : null,
      }));
    for (const item of cleanItems) {
      if (item.price_type_id) {
        const fixedPrice = getFixedPrice(item.product_id, item.price_type_id);
        if (fixedPrice === null) {
          setOrderError(
            "El tipo de precio seleccionado no tiene precio definido para un producto."
          );
          return;
        }
      }
    }
    if (cleanItems.length === 0) {
      setOrderError("Agregue al menos un producto.");
      return;
    }
    let addressId = Number(form.address_id);
    if (!addressId && form.address_text) {
      try {
        const res = await api.post(`/api/customers/${form.customer_id}/addresses`, {
          etiqueta: "Principal",
          direccion: form.address_text,
          es_principal: true,
        });
        addressId = res.data?.id;
      } catch (_err) {
        setOrderError("No se pudo crear la dirección del cliente.");
        return;
      }
    }
    if (!addressId) {
      setOrderError("No hay dirección válida para el cliente.");
      return;
    }
    try {
      await api.post("/api/orders", {
        customer_id: Number(form.customer_id),
        address_id: addressId,
        scheduled_date: form.scheduled_date || null,
        notes: form.notes || null,
        items: cleanItems,
      });
      setOrderSuccess("Pedido creado correctamente.");
      setForm({
        customer_id: "",
        customer_name: "",
        customer_type: "",
        address_text: "",
        address_id: "",
        scheduled_date: "",
        notes: "",
      });
      setItems([
        {
          product_id: "",
          quantity: 1,
          price: 0,
          discount_unit: 0,
          price_type_id: "",
          price_type_name: "",
        },
      ]);
      load();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.details?.length) {
        const detailText = data.details
          .map((d) => `${d.name} (stock ${d.stock}, requerido ${d.required})`)
          .join(", ");
        setOrderError(`${data.error} ${detailText}`);
      } else {
        const message = data?.error || "No se pudo crear el pedido.";
        setOrderError(message);
      }
    }
  }

  async function handleUpdateStatus(orderId) {
    const nextStatus = statusUpdates[orderId];
    if (!nextStatus) return;
    setStatusLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      await api.patch(`/api/orders/${orderId}/status`, {
        status: nextStatus,
      });
      setStatusUpdates((prev) => ({ ...prev, [orderId]: "" }));
      load();
    } finally {
      setStatusLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  function handleAddItem() {
    setItems((prev) => [
      ...prev,
      {
        product_id: "",
        quantity: 1,
        price: 0,
        discount_unit: 0,
        price_type_id: "",
        price_type_name: "",
      },
    ]);
  }

  function handleRemoveItem(index) {
    setItems((prev) => {
      if (prev.length === 1) {
        return [
          {
            product_id: "",
            quantity: 1,
            price: 0,
            discount_unit: 0,
            price_type_id: "",
            price_type_name: "",
          },
        ];
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleItemChange(index, field, value) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value };
      })
    );
  }

  function getFixedPrice(productId, priceTypeId) {
    const row = preciosProducto.find(
      (p) =>
        String(p.producto_id) === String(productId) &&
        String(p.tipo_precio_id) === String(priceTypeId)
    );
    return row ? Number(row.precio) : null;
  }

  function handleProductSelect(index, productId) {
    const product = products.find((p) => String(p.id) === String(productId));
    const basePrice = product ? Number(product.price) : 0;
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const fixedPrice = item.price_type_id
          ? getFixedPrice(productId, item.price_type_id)
          : null;
        const nextPrice =
          fixedPrice !== null && fixedPrice > 0 ? fixedPrice : basePrice;
        return {
          ...item,
          product_id: productId,
          price: nextPrice,
        };
      })
    );
  }

  function handlePriceTypeChange(index, value) {
    const tipo = tiposPrecio.find((t) => t.nombre === value);
    const priceTypeId = tipo ? String(tipo.id) : "";
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const fixedPrice =
          item.product_id && priceTypeId
            ? getFixedPrice(item.product_id, priceTypeId)
            : null;
        const product = products.find(
          (p) => String(p.id) === String(item.product_id)
        );
        const basePrice = product ? Number(product.price) : Number(item.price || 0);
        const nextPrice =
          fixedPrice !== null && fixedPrice > 0 ? fixedPrice : basePrice;
        return {
          ...item,
          price_type_id: priceTypeId,
          price_type_name: value,
          price: nextPrice,
        };
      })
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
    0
  );
  const descuentoProductos = items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.discount_unit || 0),
    0
  );
  const tipo = tiposCliente.find((t) => t.nombre === form.customer_type);
  const totalUnidades = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const descuento = tipo
    ? totalUnidades * Number(tipo.descuento_unidades || 0)
    : 0;
  const total = subtotal - descuento - descuentoProductos;

  async function handleUseCustomer(cliente) {
    setAddressHint("");
    setForm((prev) => ({
      ...prev,
      customer_id: String(cliente.id),
      customer_name: cliente.nombre_completo,
      customer_type: cliente.tipo_cliente || "",
      address_text: cliente.direccion || "",
    }));
    try {
      const res = await api.get(`/api/customers/${cliente.id}/addresses`);
      const addresses = res.data || [];
      if (addresses.length > 0) {
        setForm((prev) => ({
          ...prev,
          address_id: String(addresses[0].id),
        }));
        setAddressHint(`Dirección cargada: ${addresses[0].direccion || ""}`);
      } else if (!cliente.direccion) {
        setForm((prev) => ({ ...prev, address_id: "" }));
        setAddressHint("Cliente sin direcciones registradas.");
      } else {
        setAddressHint("");
      }
    } catch (_err) {
      setAddressHint("No se pudo cargar la dirección del cliente.");
    }
  }

  const filteredOrders = orders.filter((order) => {
    const statusFilter = orderFilters.status;
    const matchStatus =
      !statusFilter ||
      (statusFilter.includes("|")
        ? statusFilter.split("|").includes(order.status)
        : order.status === statusFilter);
    if (!matchStatus) return false;
    if (!orderFilters.month) return true;
    if (!order.created_at) return false;
    const monthValue = new Date(order.created_at).toISOString().slice(0, 7);
    return monthValue === orderFilters.month;
  });
  const pendientesTotal = filteredOrders.filter(
    (order) => order.status === "Pendiente"
  ).length;

  return (
    <div className="container page">
      <h2>Pedidos</h2>
      <div className="card" style={{ marginBottom: 16 }}>
        <h4>Buscar cliente</h4>
        <form onSubmit={handleSearch} className="form">
          <div className="form-row">
            <input
              placeholder="Nombre"
              value={search.nombre}
              onChange={(e) => setSearch({ ...search, nombre: e.target.value })}
            />
            <input
              placeholder="Teléfono"
              value={search.telefono}
              onChange={(e) => setSearch({ ...search, telefono: e.target.value })}
            />
            <input
              placeholder="Dirección"
              value={search.direccion}
              onChange={(e) =>
                setSearch({ ...search, direccion: e.target.value })
              }
            />
            <input
              placeholder="Zona"
              value={search.zona}
              onChange={(e) => setSearch({ ...search, zona: e.target.value })}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" type="submit">Buscar</button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => {
                setSearch({ nombre: "", telefono: "", direccion: "", zona: "" });
                setResults([]);
                setSearchError("");
              }}
            >
              Limpiar
            </button>
          </div>
        </form>
        {searchError && <div className="error">{searchError}</div>}
        {results.length > 0 && (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Tipo</th>
                <th>NIT</th>
                <th>Zona</th>
                <th>Notas</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {results.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.nombre_completo}</td>
                  <td>{c.telefono_principal}</td>
                  <td>{c.direccion || "-"}</td>
                  <td>{c.tipo_cliente || "-"}</td>
                  <td>{c.nit || "-"}</td>
                  <td>{c.zona || "-"}</td>
                  <td>{c.notas || "-"}</td>
                  <td>
                    <button
                      className="btn btn-outline"
                      type="button"
                      onClick={() => handleUseCustomer(c)}
                    >
                      Usar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card">
        <form onSubmit={handleCreate} className="form">
          <div className="form-row">
            <input
              placeholder="Nombre cliente"
              value={form.customer_name}
              onChange={(e) =>
                setForm({ ...form, customer_name: e.target.value })
              }
            />
            <select
              value={form.customer_type}
              onChange={(e) =>
                setForm({ ...form, customer_type: e.target.value })
              }
            >
              <option value="">Tipo de cliente</option>
              {tiposCliente.map((t) => (
                <option key={t.id} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </select>
            <input
              placeholder="Dirección"
              value={form.address_text}
              readOnly
            />
            <input
              type="date"
              placeholder="Fecha programada"
              value={form.scheduled_date}
              onChange={(e) =>
                setForm({ ...form, scheduled_date: e.target.value })
              }
            />
          </div>
          <div className="form-row">
            <textarea
              placeholder="Observaciones del cliente"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {addressHint && <div className="tag">{addressHint}</div>}
          {orderError && <div className="error">{orderError}</div>}
          {orderSuccess && <div className="tag" style={{ marginTop: 8 }}>{orderSuccess}</div>}
          <div className="card" style={{ background: "var(--bg)" }}>
            <h4>Productos</h4>
            {items.map((item, index) => (
              <div className="form-row" key={index}>
                <div className="form-field">
                  <label>Producto</label>
                  <select
                    value={item.product_id}
                    onChange={(e) => handleProductSelect(index, e.target.value)}
                  >
                    <option value="">Seleccione producto</option>
                    {products.length === 0 && (
                      <option value="">No hay productos activos</option>
                    )}
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Cantidad</label>
                  <input
                    placeholder="Cantidad"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", e.target.value)
                    }
                  />
                </div>
                <div className="form-field">
                  <label>Tipo de precio</label>
                  <input
                    list="tipos-precio"
                    placeholder="Tipo de precio"
                    value={item.price_type_name || ""}
                    onChange={(e) => handlePriceTypeChange(index, e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Precio</label>
                  <input
                    placeholder="Precio"
                    value={item.price}
                    readOnly
                    onChange={(e) =>
                      handleItemChange(index, "price", e.target.value)
                    }
                  />
                </div>
                <div className="form-field">
                  <label>Desc. unidad</label>
                  <input
                    placeholder="Desc. unidad"
                    value={item.discount_unit}
                    onChange={(e) =>
                      handleItemChange(index, "discount_unit", e.target.value)
                    }
                  />
                </div>
                <button
                  className="btn btn-outline btn-sm btn-icon"
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                >
                  ✕
                </button>
              </div>
            ))}
            <datalist id="tipos-precio">
              {tiposPrecio.map((t) => (
                <option key={t.id} value={t.nombre} />
              ))}
            </datalist>
            <button className="btn btn-outline" type="button" onClick={handleAddItem}>
              Agregar producto
            </button>
          </div>
          <div className="form-row">
            <div className="card" style={{ padding: 12 }}>
              <strong>Resumen:</strong>
              <div>Subtotal Bs. {subtotal.toFixed(2)}</div>
              <div>Desc. productos Bs. {descuentoProductos.toFixed(2)}</div>
              <div>Desc. tipo cliente Bs. {descuento.toFixed(2)}</div>
              <div>Total Bs. {total.toFixed(2)}</div>
            </div>
          </div>
          <button className="btn" type="submit">Crear pedido</button>
        </form>
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="form-row">
            <select
              value={orderFilters.status}
              onChange={(e) =>
                setOrderFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">Todos los estados</option>
              <option value="Pendiente|Reprogramado">Pendiente y reprogramado</option>
              <option>Pendiente</option>
              <option>Entregado</option>
              <option>Cancelado</option>
              <option>Reprogramado</option>
            </select>
            <input
              type="month"
              value={orderFilters.month}
              onChange={(e) =>
                setOrderFilters((prev) => ({ ...prev, month: e.target.value }))
              }
            />
          </div>
          <div style={{ marginTop: 8 }}>
            Pedidos pendientes: <strong>{pendientesTotal}</strong>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Dirección</th>
              <th>Zona</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Camión</th>
              <th>Actualizar</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.customer_name}</td>
                <td>{o.address || "-"}</td>
                <td>{o.zone || "-"}</td>
                <td>{o.created_at ? new Date(o.created_at).toLocaleDateString() : "-"}</td>
                <td><span className={statusClass(o.status)}>{o.status}</span></td>
                <td>{o.status === "Despachado" ? (o.truck_plate || "-") : "-"}</td>
                <td>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                      value={statusUpdates[o.id] || ""}
                      onChange={(e) =>
                        setStatusUpdates((prev) => ({
                          ...prev,
                          [o.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Cambiar estado</option>
                      <option>Pendiente</option>
                      <option>Entregado</option>
                      <option>Cancelado</option>
                      <option>Reprogramado</option>
                    </select>
                    <button
                      className="btn btn-outline btn-sm"
                      type="button"
                      disabled={!statusUpdates[o.id] || statusLoading[o.id]}
                      onClick={() => handleUpdateStatus(o.id)}
                    >
                      {statusLoading[o.id] ? "Guardando..." : "Actualizar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
