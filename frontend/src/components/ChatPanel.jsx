import { useEffect, useRef, useState } from "react";
import api from "../api";

function formatHora(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFecha(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
  });
}

function shouldShowDate(msgs, index) {
  if (index === 0) return true;
  const prev = new Date(msgs[index - 1].created_at).toDateString();
  const cur = new Date(msgs[index].created_at).toDateString();
  return prev !== cur;
}

function reproducirBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch (_err) {
    /* ignore */
  }
}

export default function ChatPanel({ user }) {
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [noLeidos, setNoLeidos] = useState(0);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const lastIdRef = useRef(0);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  async function cargarMensajes({ silent = false } = {}) {
    if (!silent) setCargando(true);
    setError("");
    try {
      const res = await api.get("/api/chat/mensajes", { params: { limit: 50 } });
      const rows = res.data || [];
      setMensajes(rows);
      const maxId = rows.reduce((max, m) => Math.max(max, Number(m.id) || 0), 0);
      if (maxId > lastIdRef.current && lastIdRef.current > 0 && !openRef.current) {
        const hayAjenos = rows.some(
          (m) => Number(m.id) > lastIdRef.current && Number(m.usuario_id) !== Number(user?.id)
        );
        if (hayAjenos) reproducirBeep();
      }
      lastIdRef.current = maxId;
    } catch (_err) {
      if (!silent) setError("No se pudo cargar el chat.");
    } finally {
      if (!silent) setCargando(false);
    }
  }

  async function cargarNoLeidos() {
    try {
      const res = await api.get("/api/chat/no-leidos");
      setNoLeidos(Number(res.data?.global || 0));
    } catch (_err) {
      /* ignore */
    }
  }

  async function marcarLeido() {
    try {
      await api.post("/api/chat/marcar-leido");
      setNoLeidos(0);
    } catch (_err) {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!user) return undefined;
    cargarNoLeidos();
    const unreadId = setInterval(cargarNoLeidos, 15000);
    return () => clearInterval(unreadId);
  }, [user?.id]);

  useEffect(() => {
    if (!user || !open) return undefined;
    cargarMensajes();
    marcarLeido();
    const pollId = setInterval(() => cargarMensajes({ silent: true }), 4000);
    return () => clearInterval(pollId);
  }, [user?.id, open]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [mensajes.length, open]);

  async function enviarMensaje() {
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const res = await api.post("/api/chat/mensajes", { contenido });
      setTexto("");
      setMensajes((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      lastIdRef.current = Math.max(lastIdRef.current, Number(res.data.id) || 0);
      await marcarLeido();
    } catch (_err) {
      setError("No se pudo enviar el mensaje.");
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  }

  if (!user) return null;

  return (
    <>
      {open && (
        <div className="chat-overlay" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <div className={`chat-panel ${open ? "chat-panel--open" : ""}`}>
        <div className="chat-panel__header">
          <div className="chat-panel__title">
            <span>Chat interno</span>
            <span className="chat-panel__badge">Global</span>
          </div>
          <button
            type="button"
            className="chat-panel__close"
            onClick={() => setOpen(false)}
            aria-label="Cerrar chat"
          >
            ✕
          </button>
        </div>

        <div className="chat-panel__messages">
          {cargando ? (
            <div className="chat-panel__empty">Cargando...</div>
          ) : mensajes.length === 0 ? (
            <div className="chat-panel__empty">No hay mensajes todavía. Escribe el primero.</div>
          ) : (
            mensajes.map((msg, i) => {
              const isOwn = Number(msg.usuario_id) === Number(user.id);
              return (
                <div key={msg.id}>
                  {shouldShowDate(mensajes, i) && (
                    <div className="chat-panel__date">
                      <span>{formatFecha(msg.created_at)}</span>
                    </div>
                  )}
                  <div className={`chat-bubble ${isOwn ? "chat-bubble--own" : ""}`}>
                    {!isOwn && (
                      <div className="chat-bubble__author">{msg.usuario_nombre}</div>
                    )}
                    <div className="chat-bubble__content">{msg.contenido}</div>
                    <div className="chat-bubble__time">{formatHora(msg.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && <div className="chat-panel__error">{error}</div>}

        <div className="chat-panel__composer">
          <textarea
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje... (Enter para enviar)"
            rows={1}
            maxLength={1000}
            disabled={enviando}
          />
          <button
            type="button"
            className="btn"
            onClick={enviarMensaje}
            disabled={enviando || !texto.trim()}
          >
            Enviar
          </button>
        </div>
      </div>

      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
      >
        {open ? (
          <span aria-hidden="true">×</span>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        {!open && noLeidos > 0 && (
          <span className="chat-fab__badge">{noLeidos > 9 ? "9+" : noLeidos}</span>
        )}
      </button>
    </>
  );
}
