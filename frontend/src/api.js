import axios from "axios";

const defaultBaseUrl = `http://${window.location.hostname}:18081`;
const envBaseUrl = import.meta.env.VITE_API_URL;
const safeBaseUrl =
  envBaseUrl && !envBaseUrl.includes("localhost")
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

export default api;
