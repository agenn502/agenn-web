"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Usuario = { codigo: string; nombre: string; nivel?: string; consejo?: boolean };
type Participante = { codigo: string; nombre: string };
type Conversacion = { id: string; asunto: string; participantes: Participante[]; ultimo_mensaje: { cuerpo: string; remitente_nombre: string; created_at: string } | null; no_leido: boolean; updated_at: string };
type MensajeHilo = { id: string; remitente_codigo: string; remitente_nombre: string; cuerpo: string; created_at: string };

export default function MensajesPage() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [destinatarios, setDestinatarios] = useState<Usuario[]>([]);
  const [seleccionada, setSeleccionada] = useState<Conversacion | null>(null);
  const [detalle, setDetalle] = useState<{ participantes: Participante[]; mensajes: MensajeHilo[] } | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [seleccionDestinatarios, setSeleccionDestinatarios] = useState<string[]>([]);
  const [asunto, setAsunto] = useState(""); const [cuerpo, setCuerpo] = useState(""); const [respuesta, setRespuesta] = useState("");
  const [cargando, setCargando] = useState(true); const [enviando, setEnviando] = useState(false); const [error, setError] = useState("");
  const [vista, setVista] = useState<"conversaciones" | "archivados">("conversaciones");

  useEffect(() => { const raw = localStorage.getItem("user"); if (!raw) { window.location.href = "/login"; return; } try { const p = JSON.parse(raw); setUser({ codigo: String(p.codigo || "").toUpperCase(), nombre: String(p.nombre || "") }); } catch { window.location.href = "/login"; } }, []);
  const headers = useMemo(() => ({ "x-user-codigo": user?.codigo || "" }), [user]);

  const cargar = useCallback(async () => {
    if (!user) return; setCargando(true); setError("");
    try { const r = await fetch(`/api/mensajes?vista=${vista}`, { headers, cache: "no-store" }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || "No fue posible cargar las conversaciones."); setConversaciones(j.conversaciones || []); }
    catch (e) { setError(e instanceof Error ? e.message : "No fue posible cargar las conversaciones."); } finally { setCargando(false); }
  }, [user, headers, vista]);
  useEffect(() => { if (user) cargar(); }, [user, cargar]);
  useEffect(() => { if (!user) return; fetch("/api/mensajes?vista=destinatarios", { headers, cache: "no-store" }).then(r => r.json()).then(j => { if (j.ok) setDestinatarios(j.destinatarios || []); }).catch(() => {}); }, [user, headers]);

  const abrir = async (c: Conversacion) => {
    setNuevo(false); setSeleccionada(c); setDetalle(null); setError("");
    try { const r = await fetch(`/api/mensajes/${c.id}`, { headers, cache: "no-store" }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || "No fue posible abrir la conversación."); setDetalle({ participantes: j.participantes || [], mensajes: j.mensajes || [] }); setConversaciones(actual => actual.map(x => x.id === c.id ? { ...x, no_leido: false } : x)); window.dispatchEvent(new Event("agenn-mensajes-actualizados")); }
    catch (e) { setError(e instanceof Error ? e.message : "No fue posible abrir la conversación."); }
  };

  const crear = async () => {
    if (!seleccionDestinatarios.length || !asunto.trim() || !cuerpo.trim()) { setError("Seleccione al menos un participante y complete asunto y mensaje."); return; }
    setEnviando(true); setError("");
    try { const r = await fetch("/api/mensajes", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ destinatarios_codigos: seleccionDestinatarios, asunto, cuerpo }) }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || "No fue posible crear la conversación."); setSeleccionDestinatarios([]); setAsunto(""); setCuerpo(""); setNuevo(false); await cargar(); const creada = (await (await fetch("/api/mensajes", { headers, cache: "no-store" })).json()).conversaciones?.find((x: Conversacion) => x.id === j.conversacion_id); if (creada) await abrir(creada); }
    catch (e) { setError(e instanceof Error ? e.message : "No fue posible crear la conversación."); } finally { setEnviando(false); }
  };

  const responder = async () => {
    if (!seleccionada || !respuesta.trim()) return; setEnviando(true); setError("");
    try { const r = await fetch(`/api/mensajes/${seleccionada.id}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ cuerpo: respuesta }) }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || "No fue posible responder."); setRespuesta(""); await abrir(seleccionada); await cargar(); }
    catch (e) { setError(e instanceof Error ? e.message : "No fue posible responder."); } finally { setEnviando(false); }
  };

  const cambiarArchivo = async (archivar: boolean) => {
    if (!seleccionada) return;
    setError("");
    try {
      const r = await fetch(`/api/mensajes/${seleccionada.id}/archivar`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ archivar }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "No fue posible actualizar la conversación.");
      setSeleccionada(null); setDetalle(null); await cargar(); window.dispatchEvent(new Event("agenn-mensajes-actualizados"));
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible actualizar la conversación."); }
  };

  const grupo = { border: "1px solid #b8aa94", background: "#f8f6f1", color: "#4d371c", borderRadius: 999, padding: ".45rem .75rem", fontWeight: 700, cursor: "pointer" } as const;
  const otros = (c: Conversacion) => c.participantes.filter(p => p.codigo !== user?.codigo).map(p => p.nombre).join(", ");

  return <div style={{ maxWidth: 1100 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}><div><h1 style={{ margin: 0 }}>Mensajería interna</h1><p style={{ color: "#666" }}>Conversaciones privadas entre miembros de la AGENN.</p></div><button type="button" onClick={() => { setNuevo(true); setSeleccionada(null); setDetalle(null); setError(""); }} style={{ background: "#6b6f1a", color: "white", border: 0, borderRadius: 8, padding: ".75rem 1rem", fontWeight: 700, cursor: "pointer" }}>Nueva conversación</button></div>
    {!nuevo && <div style={{ display: "flex", gap: 8, margin: "0 0 14px" }}><button type="button" onClick={() => { setVista("conversaciones"); setSeleccionada(null); setDetalle(null); }} style={{ ...grupo, background: vista === "conversaciones" ? "#6b6f1a" : "#f8f6f1", color: vista === "conversaciones" ? "white" : "#4d371c" }}>Conversaciones</button><button type="button" onClick={() => { setVista("archivados"); setSeleccionada(null); setDetalle(null); }} style={{ ...grupo, background: vista === "archivados" ? "#6b6f1a" : "#f8f6f1", color: vista === "archivados" ? "white" : "#4d371c" }}>Archivados</button></div>}
    {error && <div style={{ padding: 12, background: "#fff1f1", border: "1px solid #e1b4b4", borderRadius: 8, marginBottom: 14 }}>{error}</div>}

    {nuevo ? <section style={{ background: "white", border: "1px solid #ddd4c7", borderRadius: 12, padding: "1.25rem" }}><h2 style={{ marginTop: 0 }}>Nueva conversación</h2><label style={{ fontWeight: 700 }}>Participantes</label><div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
      <button type="button" onClick={() => setSeleccionDestinatarios(destinatarios.map(d => d.codigo))} style={grupo}>Todos</button><button type="button" onClick={() => setSeleccionDestinatarios(destinatarios.filter(d => String(d.nivel || "").toUpperCase() === "INV").map(d => d.codigo))} style={grupo}>Investigadores</button><button type="button" onClick={() => setSeleccionDestinatarios(destinatarios.filter(d => String(d.nivel || "").toUpperCase() === "NOV").map(d => d.codigo))} style={grupo}>Novicios</button><button type="button" onClick={() => setSeleccionDestinatarios(destinatarios.filter(d => d.consejo === true).map(d => d.codigo))} style={grupo}>Consejo Académico</button><button type="button" onClick={() => setSeleccionDestinatarios([])} style={grupo}>Limpiar</button>
    </div><div style={{ border: "1px solid #bbb", borderRadius: 8, padding: 10, maxHeight: 230, overflowY: "auto" }}>{destinatarios.map(d => { const marcado = seleccionDestinatarios.includes(d.codigo); return <label key={d.codigo} style={{ display: "flex", gap: 9, padding: 7, borderBottom: "1px solid #eee" }}><input type="checkbox" checked={marcado} onChange={() => setSeleccionDestinatarios(a => marcado ? a.filter(c => c !== d.codigo) : [...a, d.codigo])}/><span><strong>{d.nombre}</strong> · {d.codigo}{d.consejo ? " · Consejo Académico" : ""}</span></label>; })}</div><p style={{ color: "#666", fontSize: ".86rem" }}>{seleccionDestinatarios.length} participante(s) seleccionado(s). Usted se añadirá automáticamente a la conversación.</p>
    <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Asunto</label><input value={asunto} maxLength={180} onChange={e => setAsunto(e.target.value)} style={{ width: "100%", padding: 10, border: "1px solid #bbb", borderRadius: 7, boxSizing: "border-box", marginBottom: 16 }}/><label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Mensaje inicial</label><textarea value={cuerpo} maxLength={12000} onChange={e => setCuerpo(e.target.value)} rows={9} style={{ width: "100%", padding: 10, border: "1px solid #bbb", borderRadius: 7, boxSizing: "border-box", resize: "vertical" }}/><button type="button" disabled={enviando} onClick={crear} style={{ marginTop: 12, background: "#6b6f1a", color: "white", border: 0, borderRadius: 8, padding: ".75rem 1rem", fontWeight: 700 }}>{enviando ? "Creando..." : "Crear conversación"}</button></section> :
    <div style={{ display: "grid", gridTemplateColumns: seleccionada ? "minmax(280px,.8fr) minmax(360px,1.4fr)" : "1fr", gap: 16 }}><section style={{ background: "white", border: "1px solid #ddd4c7", borderRadius: 12, overflow: "hidden" }}>{cargando ? <p style={{ padding: 18 }}>Cargando...</p> : conversaciones.length === 0 ? <p style={{ padding: 18, color: "#666" }}>{vista === "archivados" ? "No hay conversaciones archivadas." : "Todavía no hay conversaciones."}</p> : conversaciones.map(c => <button key={c.id} type="button" onClick={() => abrir(c)} style={{ width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid #eee", background: seleccionada?.id === c.id ? "#f4f1e8" : c.no_leido ? "#f7faef" : "white", padding: "14px 16px", cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong>{c.asunto}</strong>{c.no_leido && <span style={{ fontSize: ".72rem", background: "#6b6f1a", color: "white", borderRadius: 999, padding: "2px 7px" }}>Nuevo</span>}</div><div style={{ color: "#665", fontSize: ".84rem", marginTop: 5 }}>{otros(c) || "Conversación"}</div>{c.ultimo_mensaje && <div style={{ color: "#777", fontSize: ".8rem", marginTop: 5 }}>{c.ultimo_mensaje.remitente_nombre}: {String(c.ultimo_mensaje.cuerpo).slice(0, 90)}{String(c.ultimo_mensaje.cuerpo).length > 90 ? "…" : ""}</div>}</button>)}</section>
    {seleccionada && <article style={{ background: "white", border: "1px solid #ddd4c7", borderRadius: 12, padding: "1.25rem", minWidth: 0 }}><h2 style={{ marginTop: 0 }}>{seleccionada.asunto}</h2><p style={{ color: "#666", lineHeight: 1.5 }}><strong>Participantes:</strong> {detalle?.participantes.map(p => p.nombre).join(", ") || "Cargando..."}</p><div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><button type="button" onClick={() => cambiarArchivo(vista !== "conversaciones")} style={{ ...grupo, padding: ".4rem .7rem" }}>{vista === "archivados" ? "Restaurar conversación" : "Archivar conversación"}</button></div><div style={{ borderTop: "1px solid #eee", paddingTop: 12 }}>{detalle?.mensajes.map(m => { const propio = m.remitente_codigo === user?.codigo; return <div key={m.id} style={{ margin: "0 0 14px", padding: "12px 14px", borderRadius: 10, background: propio ? "#f4f1e8" : "#f8f8f8", marginLeft: propio ? "8%" : 0, marginRight: propio ? 0 : "8%" }}><div style={{ fontWeight: 700, marginBottom: 5 }}>{m.remitente_nombre}</div><div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.6 }}>{m.cuerpo}</div><div style={{ color: "#888", fontSize: ".76rem", marginTop: 7 }}>{new Date(m.created_at).toLocaleString("es-GT")}</div></div>; })}</div><label style={{ display: "block", fontWeight: 700, marginTop: 18, marginBottom: 6 }}>Responder a todos</label><textarea value={respuesta} maxLength={12000} onChange={e => setRespuesta(e.target.value)} rows={5} style={{ width: "100%", padding: 10, border: "1px solid #bbb", borderRadius: 7, boxSizing: "border-box", resize: "vertical" }}/><button type="button" disabled={enviando || !respuesta.trim()} onClick={responder} style={{ marginTop: 10, background: "#6b6f1a", color: "white", border: 0, borderRadius: 8, padding: ".7rem 1rem", fontWeight: 700 }}>{enviando ? "Enviando..." : "Responder"}</button></article>}</div>}
    <style jsx>{`@media (max-width:800px){div[style*="grid-template-columns"]{grid-template-columns:1fr !important;}}`}</style>
  </div>;
}
