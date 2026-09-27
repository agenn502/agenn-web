"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Usuario = { codigo: string; nombre: string; nivel?: string; consejo?: boolean };
type Mensaje = {
  id: string; remitente_codigo: string; destinatario_codigo: string;
  remitente_nombre: string; destinatario_nombre: string;
  asunto: string; cuerpo: string; leido_at: string | null; created_at: string;
};

type Vista = "recibidos" | "enviados" | "nuevo";

export default function MensajesPage() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [vista, setVista] = useState<Vista>("recibidos");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [destinatarios, setDestinatarios] = useState<Usuario[]>([]);
  const [seleccionado, setSeleccionado] = useState<Mensaje | null>(null);
  const [seleccionDestinatarios, setSeleccionDestinatarios] = useState<string[]>([]);
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { window.location.href = "/login"; return; }
    try {
      const p = JSON.parse(raw);
      setUser({ codigo: String(p.codigo || "").toUpperCase(), nombre: String(p.nombre || "") });
    } catch { window.location.href = "/login"; }
  }, []);

  const headers = useMemo(() => ({ "x-user-codigo": user?.codigo || "" }), [user]);

  const cargar = useCallback(async (v: "recibidos" | "enviados") => {
    if (!user) return;
    setCargando(true); setError(""); setSeleccionado(null);
    try {
      const r = await fetch(`/api/mensajes?vista=${v}`, { headers, cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "No fue posible cargar los mensajes.");
      setMensajes(j.mensajes || []);
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible cargar los mensajes."); }
    finally { setCargando(false); }
  }, [user, headers]);

  useEffect(() => { if (user && vista !== "nuevo") cargar(vista); }, [user, vista, cargar]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/mensajes?vista=destinatarios", { headers, cache: "no-store" })
      .then(r => r.json()).then(j => { if (j.ok) setDestinatarios(j.destinatarios || []); }).catch(() => {});
  }, [user, headers]);

  const abrir = async (m: Mensaje) => {
    setSeleccionado(m);
    if (vista === "recibidos" && !m.leido_at) {
      try {
        const r = await fetch(`/api/mensajes/${m.id}`, { method: "PATCH", headers });
        const j = await r.json();
        if (r.ok && j.ok) {
          setMensajes(actual => actual.map(x => x.id === m.id ? { ...x, leido_at: j.mensaje.leido_at } : x));
          window.dispatchEvent(new Event("agenn-mensajes-actualizados"));
        }
      } catch { /* Leer un mensaje no debe bloquear su visualización. */ }
    }
  };

  const responder = (m: Mensaje) => {
    setSeleccionDestinatarios([m.remitente_codigo]);
    setAsunto(m.asunto.toLowerCase().startsWith("re:") ? m.asunto : `Re: ${m.asunto}`);
    setCuerpo(""); setSeleccionado(null); setVista("nuevo");
  };

  const enviar = async () => {
    if (!seleccionDestinatarios.length || !asunto.trim() || !cuerpo.trim()) { setError("Seleccione al menos un destinatario y complete asunto y mensaje."); return; }
    setEnviando(true); setError(""); setExito("");
    try {
      const r = await fetch("/api/mensajes", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ destinatarios_codigos: seleccionDestinatarios, asunto, cuerpo }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "No fue posible enviar el mensaje.");
      const cantidad = Number(j.cantidad || seleccionDestinatarios.length);
      setSeleccionDestinatarios([]); setAsunto(""); setCuerpo(""); setExito(cantidad === 1 ? "Mensaje enviado correctamente." : `Mensaje enviado correctamente a ${cantidad} miembros.`);
      setVista("enviados");
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible enviar el mensaje."); }
    finally { setEnviando(false); }
  };

  const botonGrupo = { border: "1px solid #b8aa94", background: "#f8f6f1", color: "#4d371c", borderRadius: 999, padding: ".45rem .75rem", fontWeight: 700, cursor: "pointer" } as const;

  const boton = (id: Vista, texto: string) => (
    <button type="button" onClick={() => { setVista(id); setError(""); setExito(""); setSeleccionado(null); }}
      style={{ border: "1px solid #6b6f1a", background: vista === id ? "#6b6f1a" : "white", color: vista === id ? "white" : "#4d371c", borderRadius: 999, padding: "0.65rem 1rem", fontWeight: 700, cursor: "pointer" }}>{texto}</button>
  );

  return <div style={{ maxWidth: 1050 }}>
    <h1 style={{ marginTop: 0 }}>Mensajería interna</h1>
    <p style={{ lineHeight: 1.7, color: "#555" }}>Comunicación directa entre miembros de la AGENN. Los mensajes permanecen dentro del área de miembros.</p>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "1.25rem 0" }}>
      {boton("recibidos", "Recibidos")}{boton("enviados", "Enviados")}{boton("nuevo", "Nuevo mensaje")}
    </div>
    {error && <div style={{ padding: 12, background: "#fff1f1", border: "1px solid #e1b4b4", borderRadius: 8, marginBottom: 14 }}>{error}</div>}
    {exito && <div style={{ padding: 12, background: "#eef6e9", border: "1px solid #cfe3c4", borderRadius: 8, marginBottom: 14 }}>{exito}</div>}

    {vista === "nuevo" ? <section style={{ background: "white", border: "1px solid #ddd4c7", borderRadius: 12, padding: "1.25rem" }}>
      <h2 style={{ marginTop: 0 }}>Nuevo mensaje</h2>
      <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Para</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" onClick={() => setSeleccionDestinatarios(destinatarios.map(d => d.codigo))} style={botonGrupo}>Todos</button>
        <button type="button" onClick={() => setSeleccionDestinatarios(destinatarios.filter(d => String(d.nivel || "").toUpperCase() === "INV").map(d => d.codigo))} style={botonGrupo}>Investigadores</button>
        <button type="button" onClick={() => setSeleccionDestinatarios(destinatarios.filter(d => String(d.nivel || "").toUpperCase() === "NOV").map(d => d.codigo))} style={botonGrupo}>Novicios</button>
        <button type="button" onClick={() => setSeleccionDestinatarios(destinatarios.filter(d => d.consejo === true).map(d => d.codigo))} style={botonGrupo}>Consejo Académico</button>
        <button type="button" onClick={() => setSeleccionDestinatarios([])} style={botonGrupo}>Limpiar</button>
      </div>
      <div style={{ border: "1px solid #bbb", borderRadius: 8, padding: 10, marginBottom: 8, maxHeight: 240, overflowY: "auto", background: "#fff" }}>
        {destinatarios.map(d => {
          const marcado = seleccionDestinatarios.includes(d.codigo);
          return <label key={d.codigo} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 5px", cursor: "pointer", borderBottom: "1px solid #f0ede8" }}>
            <input type="checkbox" checked={marcado} onChange={() => setSeleccionDestinatarios(actual => marcado ? actual.filter(c => c !== d.codigo) : [...actual, d.codigo])} />
            <span><strong>{d.nombre}</strong> · {d.codigo}{d.nivel ? ` · ${d.nivel}` : ""}{d.consejo ? " · Consejo Académico" : ""}</span>
          </label>;
        })}
      </div>
      <div style={{ color: "#666", fontSize: ".86rem", marginBottom: 16 }}>{seleccionDestinatarios.length === 0 ? "Ningún destinatario seleccionado." : `${seleccionDestinatarios.length} destinatario${seleccionDestinatarios.length === 1 ? "" : "s"} seleccionado${seleccionDestinatarios.length === 1 ? "" : "s"}.`}</div>
      <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Asunto</label>
      <input value={asunto} maxLength={180} onChange={e => setAsunto(e.target.value)} style={{ width: "100%", padding: 10, marginBottom: 16, border: "1px solid #bbb", borderRadius: 7, boxSizing: "border-box" }} />
      <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Mensaje</label>
      <textarea value={cuerpo} maxLength={12000} onChange={e => setCuerpo(e.target.value)} rows={10} style={{ width: "100%", padding: 10, border: "1px solid #bbb", borderRadius: 7, resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
      <div style={{ textAlign: "right", color: "#777", fontSize: ".82rem", marginTop: 4 }}>{cuerpo.length}/12000</div>
      <button type="button" disabled={enviando} onClick={enviar} style={{ marginTop: 12, background: "#6b6f1a", color: "white", border: 0, borderRadius: 8, padding: ".75rem 1.1rem", fontWeight: 700, cursor: enviando ? "default" : "pointer" }}>{enviando ? "Enviando..." : "Enviar mensaje"}</button>
    </section> :
    <div style={{ display: "grid", gridTemplateColumns: seleccionado ? "minmax(280px, .9fr) minmax(320px, 1.4fr)" : "1fr", gap: 16 }}>
      <section style={{ background: "white", border: "1px solid #ddd4c7", borderRadius: 12, overflow: "hidden" }}>
        {cargando ? <p style={{ padding: 18 }}>Cargando...</p> : mensajes.length === 0 ? <p style={{ padding: 18, color: "#666" }}>No hay mensajes en esta bandeja.</p> : mensajes.map(m => {
          const noLeido = vista === "recibidos" && !m.leido_at;
          return <button key={m.id} type="button" onClick={() => abrir(m)} style={{ width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid #eee", background: seleccionado?.id === m.id ? "#f4f1e8" : noLeido ? "#f7faef" : "white", padding: "14px 16px", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><strong>{vista === "recibidos" ? m.remitente_nombre : m.destinatario_nombre}</strong>{noLeido && <span style={{ fontSize: ".72rem", background: "#6b6f1a", color: "white", borderRadius: 999, padding: "2px 7px" }}>Nuevo</span>}</div>
            <div style={{ fontWeight: noLeido ? 700 : 500, marginTop: 4 }}>{m.asunto}</div>
            <div style={{ color: "#777", fontSize: ".8rem", marginTop: 4 }}>{new Date(m.created_at).toLocaleString("es-GT")}</div>
          </button>;
        })}
      </section>
      {seleccionado && <article style={{ background: "white", border: "1px solid #ddd4c7", borderRadius: 12, padding: "1.25rem", minWidth: 0 }}>
        <h2 style={{ marginTop: 0, overflowWrap: "anywhere" }}>{seleccionado.asunto}</h2>
        <p style={{ color: "#666", lineHeight: 1.5 }}><strong>{vista === "recibidos" ? "De" : "Para"}:</strong> {vista === "recibidos" ? seleccionado.remitente_nombre : seleccionado.destinatario_nombre}<br/><span style={{ fontSize: ".86rem" }}>{new Date(seleccionado.created_at).toLocaleString("es-GT")}</span></p>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.7, borderTop: "1px solid #eee", paddingTop: 16 }}>{seleccionado.cuerpo}</div>
        {vista === "recibidos" && <button type="button" onClick={() => responder(seleccionado)} style={{ marginTop: 20, background: "#6b6f1a", color: "white", border: 0, borderRadius: 8, padding: ".7rem 1rem", fontWeight: 700, cursor: "pointer" }}>Responder</button>}
      </article>}
    </div>}
    <style jsx>{`@media (max-width: 800px){div[style*="grid-template-columns"]{grid-template-columns:1fr !important;}}`}</style>
  </div>;
}
