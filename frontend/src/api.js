import axios from "axios";

// En producción (tras proxy) las rutas son relativas: /api/auth/login, etc.
const isProduction = window.location.hostname === "ionlife.sisvel.sbs" || window.location.hostname.endsWith(".sisvel.sbs") || import.meta.env.PROD;
const defaultBaseUrl = `http://${window.location.hostname}:18081`;
const envBaseUrl = import.meta.env.VITE_API_URL;
// baseURL vacío para que api.get("/api/auth/me") → /api/auth/me (no /api/api/auth/me)
const safeBaseUrl = isProduction
  ? ""
  : envBaseUrl && envBaseUrl.startsWith("/")
    ? envBaseUrl
    : envBaseUrl && !envBaseUrl.includes("localhost")
      ? envBaseUrl
      : defaultBaseUrl;

const api = axios.create({
  baseURL: safeBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ionlife_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token vencido o inválido: limpiar la sesión y volver a login en vez de dejar
// la UI mostrando datos/errores como si la sesión siguiera activa.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("ionlife_token");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export default api;
