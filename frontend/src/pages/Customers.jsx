import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url
  ).toString(),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
});

function parseCoords(value) {
  if (!value) return null;
  const parts = value.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 2 || parts.some((p) => Number.isNaN(p))) return null;
  return { lat: parts[0], lng: parts[1] };
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
}

export default function Customers({ user }) {
  const isDriver = user?.roles?.includes("Repartidor");
  const zonas = [
    "SOPOCACHI",
    "CALACOTO",
    "COTA COTA",
    "ACHUMANI",
    "BAJO SEGUEN",
    "MIRAFLORES",
    "VILLA FATIMA",
    "ALTO OBRAJES",
    "OBRAJES",
    "SAN PEDRO",
    "CALIRI",
    "IRPAVI",
    "LOS PINOS",
    "LA FLORIDA",
    "ALTO MIRAF",
    "VILLA ARMO",
    "Z. NORTE",
    "IRPAVI II",
    "EL ALTO",
    "KUPINI",
    "ALTO SAN P",
    "CENTRO",
    "BOLOGNIA",
    "ALTO PAMPA",
    "VILLA COPAC",
    "CIUDAD FER",
    "ACHACHICALA",
    "EL TEJAR",
    "MALLASA",
    "BELLA VISTA",
    "VALLE HERM",
    "ALTO SEGUEN",
    "SAN JORGE",
    "BAJO SAN AN",
    "VILLA PABÓN",
    "SAN ANTONI",
    "CHASQUIPAM",
    "MUNAYPATA",
    "VINO TINTO",
    "BAJO SAN IS",
    "VILLA VICTO",
    "ALTO SOPOC",
    "VILLA EL CAR",
    "VILLA LA MER",
    "PURA PURA",
    "COTAHUMA",
    "CRISTO REY",
    "ALTO AUQUIS",
    "ALTO SAN AN",
    "ALTO TACAG",
    "ARANJUEZ",
    "PERIFERICA",
    "MALLASILLA",
    "PAMPAHASI",
    "BAJO AUQUIS",
    "KOANI",
    "ALTO CHIJINI",
    "TEMBLADERA",
    "BAJO PAMPA",
    "BAJO LLOJET",
    "ALTO IRPAVI",
    "COCHABAMBA",
    "HUACHICALLA",
    "BARRIO GRA",
    "ALTO LLOJETA",
    "BAJO TACAG",
    "SAID",
    "JUPAPINA",
    "OVEJUYO",
  ];
  const PAGE_SIZE = 20;
  const [customers, setCustomers] = useState([]);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customersOffset, setCustomersOffset] = useState(0);
  const [search, setSearch] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    zona: "",
  });
  const [results, setResults] = useState([]);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [resultsOffset, setResultsOffset] = useState(0);
  const [searchError, setSearchError] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [tiposCliente, setTiposCliente] = useState([]);
  const [form, setForm] = useState({
    nombre_completo: "",
    telefono_principal: "",
    telefono_secundario: "",
    direccion: "",
    zona: "",
    datos_gps: "",
    tipo_cliente: "Residencial",
    razon_social: "",
    nit: "",
    estado: "Activo",
    notas: "",
  });
  const [editId, setEditId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [editMessage, setEditMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState(null);

  function resetForm() {
    setForm({
      nombre_completo: "",
      telefono_principal: "",
      telefono_secundario: "",
      direccion: "",
      zona: "",
      datos_gps: "",
      tipo_cliente: "Residencial",
      razon_social: "",
      nit: "",
      estado: "Activo",
      notas: "",
    });
    setEditId(null);
    setEditMessage("");
    setShowMap(false);
    setMapPosition(null);
  }

  const mapCenter = useMemo(() => {
    const parsed = parseCoords(form.datos_gps);
    if (parsed) return parsed;
    if (mapPosition) return mapPosition;
    return { lat: -16.5, lng: -68.15 };
  }, [form.datos_gps, mapPosition]);

  async function loadCustomers(offset = 0) {
    try {
      const res = await api.get("/api/customers", { params: { limit: PAGE_SIZE, offset } });
      setCustomers(res.data.rows || []);
      setCustomersTotal(res.data.total || 0);
      setCustomersOffset(offset);
    } catch (err) {
      console.error("Error cargando clientes:", err);
    }
  }

  async function load() {
    try {
      const [, resTipos] = await Promise.all([
        loadCustomers(0),
        api.get("/api/tipos-cliente"),
      ]);
      setTiposCliente(resTipos.data || []);
    } catch (err) {
      console.error("Error en carga inicial:", err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function fetchSearch(offset = 0) {
    try {
      const res = await api.get("/api/customers/search", {
        params: {
          nombre: search.nombre || undefined,
          telefono: search.telefono || undefined,
          direccion: search.direccion || undefined,
          zona: search.zona || undefined,
          offset,
        },
      });
      setResults(res.data.rows || []);
      setResultsTotal(res.data.total || 0);
      setResultsOffset(offset);
    } catch (err) {
      setResults([]);
      setResultsTotal(0);
      const msg = err?.response?.data?.error || err?.message || "Error desconocido";
      setSearchError(`No se pudo buscar clientes: ${msg}`);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setSearchError("");
    setSearchActive(true);
    await fetchSearch(0);
  }

  function clearSearch() {
    setSearch({ nombre: "", telefono: "", direccion: "", zona: "" });
    setResults([]);
    setResultsTotal(0);
    setResultsOffset(0);
    setSearchError("");
    setSearchActive(false);
    loadCustomers(0);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setGpsError("");
    await api.post("/api/customers", form);
    resetForm();
    loadCustomers(0);
  }

  async function handleDelete(customer) {
    if (!window.confirm(`¿Eliminar al cliente "${customer.nombre_completo}"?\nEsta acción eliminará también sus direcciones y pedidos asociados.`)) return;
    try {
      await api.delete(`/api/customers/${customer.id}`);
      if (selectedCustomerId === customer.id) {
        setSelectedCustomerId(null);
        resetForm();
      }
      if (searchActive) fetchSearch(resultsOffset);
      else loadCustomers(customersOffset);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Error desconocido";
      setEditMessage(`No se pudo eliminar: ${msg}`);
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editId) return;
    setGpsError("");
    setEditMessage("");
    setSuccessMessage("");
    await api.put(`/api/customers/${editId}`, form);
    setSuccessMessage("Cliente actualizado correctamente.");
    setSelectedCustomerId(null);
    resetForm();
    if (searchActive) fetchSearch(resultsOffset);
    else loadCustomers(customersOffset);
    setTimeout(() => setSuccessMessage(""), 4000);
  }

  function startEdit(customer) {
    setEditMessage("");
    setSuccessMessage("");
    setSelectedCustomerId(customer.id);
    setEditId(customer.id);
    setForm({
      nombre_completo: customer.nombre_completo || "",
      telefono_principal: customer.telefono_principal || "",
      telefono_secundario: customer.telefono_secundario || "",
      direccion: customer.direccion || "",
      zona: customer.zona || "",
      datos_gps: customer.datos_gps || "",
      tipo_cliente: customer.tipo_cliente || "Residencial",
      razon_social: customer.razon_social || "",
      nit: customer.nit || "",
      estado: customer.estado || "Activo",
      notas: customer.notas || "",
    });
    const parsed = parseCoords(customer.datos_gps || "");
    setMapPosition(parsed);
  }

  function handleClickEditar() {
    setSuccessMessage("");
    if (selectedCustomerId == null) {
      setEditMessage("Seleccione un cliente de la lista para editar.");
      return;
    }
    const customer = (searchActive ? results : customers).find(
      (c) => c.id === selectedCustomerId
    );
    if (customer) startEdit(customer);
    setEditMessage("");
  }

  function handleGetGps() {
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("Geolocalización no disponible en este dispositivo.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((prev) => ({
          ...prev,
          datos_gps: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        }));
        setGpsLoading(false);
      },
      () => {
        setGpsError("No se pudo obtener la ubicación.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="container page">
      <h2>Clientes</h2>
      <div className="card">
        <form onSubmit={editId ? handleUpdate : handleCreate} className="form">
          <div className="form-row">
            <input
              placeholder="Nombre completo"
              value={form.nombre_completo}
              onChange={(e) =>
                setForm({ ...form, nombre_completo: e.target.value })
              }
            />
            <input
              placeholder="Teléfono principal"
              value={form.telefono_principal}
              onChange={(e) =>
                setForm({ ...form, telefono_principal: e.target.value })
              }
            />
            <input
              placeholder="Teléfono secundario"
              value={form.telefono_secundario}
              onChange={(e) =>
                setForm({ ...form, telefono_secundario: e.target.value })
              }
            />
          </div>
          <div className="form-row">
            <input
              placeholder="Dirección"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
            <input
              list="zonas"
              placeholder="Zona"
              value={form.zona}
              onChange={(e) => setForm({ ...form, zona: e.target.value })}
            />
            <datalist id="zonas">
              {zonas.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </div>
          <div className="form-row">
            <input
              placeholder="Datos para GPS"
              value={form.datos_gps}
              onChange={(e) => setForm({ ...form, datos_gps: e.target.value })}
            />
            <button
              className="btn btn-outline"
              type="button"
              onClick={handleGetGps}
              disabled={gpsLoading}
            >
              {gpsLoading ? "Capturando..." : "Capturar GPS"}
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => {
                const parsed = parseCoords(form.datos_gps);
                setMapPosition(parsed);
                setShowMap((prev) => !prev);
              }}
            >
              {showMap ? "Ocultar mapa" : "Seleccionar en mapa"}
            </button>
          </div>
          {showMap && (
            <div style={{ marginTop: 8 }}>
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: 280, width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler
                  onSelect={(latlng) => {
                    setMapPosition(latlng);
                    setForm((prev) => ({
                      ...prev,
                      datos_gps: `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`,
                    }));
                  }}
                />
                {mapPosition && <Marker position={mapPosition} />}
              </MapContainer>
            </div>
          )}
          {gpsError && <div className="error">{gpsError}</div>}
          <div className="form-row">
            <select
              value={form.tipo_cliente}
              onChange={(e) =>
                setForm({ ...form, tipo_cliente: e.target.value })
              }
            >
              {tiposCliente.length === 0 && (
                <option>Residencial</option>
              )}
              {tiposCliente.map((t) => (
                <option key={t.id} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </select>
            <input
              placeholder="Razón social"
              value={form.razon_social}
              onChange={(e) =>
                setForm({ ...form, razon_social: e.target.value })
              }
            />
            <input
              placeholder="NIT"
              value={form.nit}
              onChange={(e) => setForm({ ...form, nit: e.target.value })}
            />
          </div>
          <div className="form-row">
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
            >
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
            <textarea
              placeholder="Notas"
              rows={1}
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" type="submit">
              {editId ? "Actualizar" : "Registrar"}
            </button>
            {editId && (
              <button className="btn btn-outline" type="button" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
      {editMessage && (
        <div className="error" style={{ marginTop: 16 }}>
          {editMessage}
        </div>
      )}
      {successMessage && (
        <div className="success-message" style={{ marginTop: 16 }}>
          {successMessage}
        </div>
      )}
      <div className="card" style={{ marginTop: 16 }}>
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
            <button className="btn btn-outline" type="button" onClick={clearSearch}>
              Limpiar
            </button>
          </div>
        </form>
        {searchError && <div className="error" style={{ marginTop: 8 }}>{searchError}</div>}
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button
            className="btn btn-outline"
            type="button"
            onClick={handleClickEditar}
          >
            Editar cliente seleccionado
          </button>
          {selectedCustomerId != null && (
            <span className="text-muted">Cliente #{selectedCustomerId} seleccionado</span>
          )}
        </div>
        <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th>Zona</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Registrado por</th>
            <th>Registro</th>
            <th>Actualización</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {(searchActive ? results : customers).map((c) => (
            <tr
              key={c.id}
              className={`${selectedCustomerId === c.id ? "row-selected" : ""} ${c.estado === "Inactivo" ? "row-inactivo" : ""}`.trim()}
              onClick={() => {
                setEditMessage("");
                setSelectedCustomerId(c.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <td>{c.id}</td>
              <td>{c.nombre_completo}</td>
              <td>{c.telefono_principal}</td>
              <td>{c.direccion || "-"}</td>
              <td>{c.zona}</td>
              <td>{c.tipo_cliente}</td>
              <td>
                <span className={c.estado === "Inactivo" ? "customer-estado-inactivo" : ""}>
                  {c.estado}
                </span>
              </td>
              <td>{c.creado_por_nombre || "-"}</td>
              <td>{c.fecha_registro ? new Date(c.fecha_registro).toLocaleString() : "-"}</td>
              <td>{c.fecha_actualizacion ? new Date(c.fecha_actualizacion).toLocaleString() : "-"}</td>
              <td>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(c);
                    }}
                  >
                    Editar
                  </button>
                  {!isDriver && (
                    <button
                      className="btn btn-danger btn-sm"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c);
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {searchActive && results.length === 0 && (
            <tr>
              <td colSpan={11}>Sin resultados.</td>
            </tr>
          )}
          {!searchActive && customers.length === 0 && (
            <tr>
              <td colSpan={11}>No hay clientes.</td>
            </tr>
          )}
        </tbody>
        </table>

        {/* Paginación */}
        {(() => {
          const total = searchActive ? resultsTotal : customersTotal;
          const offset = searchActive ? resultsOffset : customersOffset;
          const currentEnd = Math.min(offset + PAGE_SIZE, total);
          const hasPrev = offset > 0;
          const hasNext = offset + PAGE_SIZE < total;
          if (total === 0) return null;
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, fontSize: 13, color: "#6b7a8c" }}>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                disabled={!hasPrev}
                onClick={() => {
                  const newOffset = Math.max(0, offset - PAGE_SIZE);
                  if (searchActive) fetchSearch(newOffset);
                  else loadCustomers(newOffset);
                }}
              >
                ← Anteriores 20
              </button>
              <span>
                Mostrando <strong>{offset + 1}–{currentEnd}</strong> de <strong>{total}</strong>
              </span>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                disabled={!hasNext}
                onClick={() => {
                  const newOffset = offset + PAGE_SIZE;
                  if (searchActive) fetchSearch(newOffset);
                  else loadCustomers(newOffset);
                }}
              >
                Siguientes 20 →
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
