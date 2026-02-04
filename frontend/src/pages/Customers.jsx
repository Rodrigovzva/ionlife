import { useEffect, useState } from "react";
import api from "../api";

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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

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
    load();
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
        <form onSubmit={handleCreate} className="form">
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
          </div>
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
          <button className="btn" type="submit">Registrar</button>
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
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}
