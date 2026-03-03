/**
 * Fecha de hoy en La Paz, Bolivia (America/La_Paz, UTC-4).
 * Devuelve YYYY-MM-DD para usar en inputs type="date" y APIs.
 */
export function getTodayLaPaz() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Suma días a la fecha de hoy en La Paz y devuelve YYYY-MM-DD.
 */
export function addDaysLaPaz(days) {
  const today = getTodayLaPaz();
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
