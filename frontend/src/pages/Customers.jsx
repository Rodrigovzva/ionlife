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

export default function Customers() {
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
  const [customers, setCustomers] = useState([]);
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
    setShowMap(false);
    setMapPosition(null);
  }

  const mapCenter = useMemo(() => {
    const parsed = parseCoords(form.datos_gps);
    if (parsed) return parsed;
    if (mapPosition) return mapPosition;
    return { lat: -16.5, lng: -68.15 };
  }, [form.datos_gps, mapPosition]);

  async function load() {
    const [resCustomers, resTipos] = await Promise.all([
      api.get("/api/customers"),
      api.get("/api/tipos-cliente"),
    ]);
    setCustomers(resCustomers.data);
    setTiposCliente(resTipos.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setGpsError("");
    await api.post("/api/customers", form);
    resetForm();
    load();
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editId) return;
    setGpsError("");
    await api.put(`/api/customers/${editId}`, form);
    resetForm();
    load();
  }

  function startEdit(customer) {
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
      <div style={{ marginTop: 16 }}>
        <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Teléfono</th>
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
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.nombre_completo}</td>
              <td>{c.telefono_principal}</td>
              <td>{c.zona}</td>
              <td>{c.tipo_cliente}</td>
              <td>{c.estado}</td>
              <td>{c.creado_por_nombre || "-"}</td>
              <td>{c.fecha_registro ? new Date(c.fecha_registro).toLocaleString() : "-"}</td>
              <td>{c.fecha_actualizacion ? new Date(c.fecha_actualizacion).toLocaleString() : "-"}</td>
              <td>
                <button
                  className="btn btn-outline btn-sm"
                  type="button"
                  onClick={() => startEdit(c)}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}
