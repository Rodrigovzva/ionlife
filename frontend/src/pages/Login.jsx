import { useState } from "react";
import api from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("ionlife_token", res.data.token);
      onLogin?.(res.data.user);
    } catch (err) {
      setError("Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page">
      <div className="login-hero">
        <div>
          <h2>Acceso Ionlife</h2>
          <p style={{ color: "var(--muted)" }}>
            Gestión de pedidos, inventario y distribución en un solo panel.
          </p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="form">
            <input
              placeholder="Usuario o correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <div className="error">{error}</div>}
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
