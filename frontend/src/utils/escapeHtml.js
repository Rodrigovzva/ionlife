// Escapa texto para insertarlo en HTML generado a mano (p. ej. ventanas de impresión
// con document.write), evitando que datos de clientes se interpreten como código.
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
