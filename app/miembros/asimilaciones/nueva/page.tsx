"use client";

import { useEffect, useMemo, useState } from "react";

type User = { codigo: string; nombre: string; nivel: string; consejo?: boolean | string | number };
type Modalidad = "NOV" | "INV_FORMACION" | "INV_ACREDITADO" | "NUM";
type DestinoPromocion = "NOV" | "INV_ACREDITADO" | "NUM";
type Miembro = { codigo: string; nombre: string; nivel: string; estado_academico?: string | null; origen_acreditacion?: string | null; correo?: string | null };

type Sexo = "M" | "F";

const rango: Record<string, number> = { ASP: 0, NOV: 1, INV: 2, NUM: 3 };

function nivelDestino(modalidad: Modalidad | DestinoPromocion) {
  if (modalidad === "NOV") return "NOV";
  if (modalidad === "NUM") return "NUM";
  return "INV";
}

export default function NuevaIncorporacionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);
  const [yaPertenece, setYaPertenece] = useState(false);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [miembroCodigo, setMiembroCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sexo, setSexo] = useState<Sexo | "">("");
  const [modalidad, setModalidad] = useState<Modalidad>("INV_FORMACION");
  const [destino, setDestino] = useState<DestinoPromocion>("NOV");
  const [justificacion, setJustificacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { window.location.href = "/login"; return; }
    const parsed = JSON.parse(stored) as User;
    const consejo = parsed.consejo === true || parsed.consejo === "true" || parsed.consejo === "TRUE" || parsed.consejo === 1;
    setUser(parsed); setEsConsejo(consejo);
  }, []);

  useEffect(() => {
    if (!yaPertenece || !user) return;
    fetch("/api/asimilaciones/miembros", { headers: { "x-user-codigo": user.codigo }, cache: "no-store" })
      .then((r) => r.json().then((j) => ({ r, j })))
      .then(({ r, j }) => { if (!r.ok || !j.ok) throw new Error(j.error); setMiembros(j.miembros || []); })
      .catch((e) => setError(e instanceof Error ? e.message : "No fue posible cargar los miembros."));
  }, [yaPertenece, user]);

  const miembro = useMemo(() => miembros.find((m) => m.codigo === miembroCodigo) || null, [miembros, miembroCodigo]);
  const destinosDisponibles = useMemo(() => {
    if (!miembro) return [] as DestinoPromocion[];
    const actual = rango[String(miembro.nivel || "").toUpperCase()] ?? -1;
    return (["NOV", "INV_ACREDITADO", "NUM"] as DestinoPromocion[]).filter((d) => rango[nivelDestino(d)] > actual || (d === "INV_ACREDITADO" && miembro.nivel === "INV" && miembro.estado_academico !== "ACREDITADO"));
  }, [miembro]);

  useEffect(() => {
    if (yaPertenece && destinosDisponibles.length && !destinosDisponibles.includes(destino)) setDestino(destinosDisponibles[0]);
  }, [yaPertenece, destinosDisponibles, destino]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setMensaje("");
    if (!user || !esConsejo) return setError("Esta acción es exclusiva del Consejo Académico.");
    if (!justificacion.trim()) return setError("Debe incluir una justificación para la propuesta.");
    if (yaPertenece && !miembro) return setError("Debe seleccionar al miembro que será propuesto para promoción extraordinaria.");
    if (!yaPertenece && (!nombre.trim() || !sexo)) return setError("Debe indicar el nombre y sexo de la persona propuesta.");

    setEnviando(true);
    try {
      const modalidadFinal = yaPertenece ? destino : modalidad;
      const response = await fetch("/api/asimilaciones/nueva", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoPropuesta: yaPertenece ? "PROMOCION_EXTRAORDINARIA" : "INCORPORACION",
          miembroCodigo: yaPertenece ? miembro?.codigo : null,
          nombre: yaPertenece ? miembro?.nombre : nombre.trim(),
          correo: yaPertenece ? miembro?.correo || null : correo.trim() || null,
          telefono: yaPertenece ? null : telefono.trim() || null,
          sexo: yaPertenece ? null : sexo,
          nivelPropuesto: nivelDestino(modalidadFinal),
          modalidadIncorporacion: modalidadFinal,
          justificacion: justificacion.trim(), proponenteCodigo: user.codigo,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "No fue posible registrar la propuesta.");
      setMensaje(yaPertenece ? "La propuesta de Promoción extraordinaria fue presentada al Consejo Académico." : "La propuesta de incorporación fue presentada al Consejo Académico.");
      setNombre(""); setCorreo(""); setTelefono(""); setSexo(""); setMiembroCodigo(""); setJustificacion("");
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible registrar la propuesta."); }
    finally { setEnviando(false); }
  };

  if (!user) return <div>Cargando...</div>;
  if (!esConsejo) return <div style={{ color: "red" }}>Esta sección es exclusiva del Consejo Académico.</div>;

  const card = { background: "white", border: "1px solid #ddd4c7", borderRadius: 14, padding: "1.5rem" } as const;
  const input = { width: "100%", padding: ".8rem", border: "1px solid #ccc", borderRadius: 8, boxSizing: "border-box" as const };

  return <div style={{ maxWidth: 900 }}>
    <p style={{ color: "#6b6f1a", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".82rem" }}>Consejo Académico</p>
    <h1>Proponer incorporación o promoción extraordinaria</h1>
    <p style={{ lineHeight: 1.8 }}>El Consejo Académico puede proponer la incorporación directa de una persona externa o la promoción extraordinaria de un miembro que ya pertenece a la AGENN. Ambas resoluciones requieren unanimidad del Consejo Académico activo.</p>

    <form onSubmit={enviar} style={{ display: "grid", gap: "1.25rem" }}>
      <div style={card}>
        <label style={{ fontWeight: 700, display: "block", marginBottom: ".7rem" }}>¿Ya pertenece a la AGENN?</label>
        <label style={{ marginRight: "1.5rem" }}><input type="radio" checked={!yaPertenece} onChange={() => setYaPertenece(false)} /> No, es una nueva incorporación</label>
        <label><input type="radio" checked={yaPertenece} onChange={() => setYaPertenece(true)} /> Sí, es miembro de la AGENN</label>
      </div>

      {yaPertenece ? <div style={card}>
        <h2 style={{ marginTop: 0 }}>Promoción extraordinaria</h2>
        <label style={{ fontWeight: 700 }}>Miembro *</label>
        <select value={miembroCodigo} onChange={(e) => setMiembroCodigo(e.target.value)} style={{ ...input, marginTop: ".4rem" }}>
          <option value="">Seleccione un miembro...</option>
          {miembros.map((m) => <option key={m.codigo} value={m.codigo}>{m.nombre} — {m.codigo} — {m.nivel}{m.estado_academico ? ` (${m.estado_academico})` : ""}</option>)}
        </select>
        {miembro && <p style={{ background: "#f4f1e8", padding: ".8rem", borderRadius: 8 }}><strong>Situación actual:</strong> {miembro.codigo} · {miembro.nivel}{miembro.estado_academico ? ` · ${miembro.estado_academico}` : ""}</p>}
        <label style={{ fontWeight: 700 }}>Promover extraordinariamente a *</label>
        <select value={destino} onChange={(e) => setDestino(e.target.value as DestinoPromocion)} style={{ ...input, marginTop: ".4rem" }} disabled={!miembro}>
          {destinosDisponibles.map((d) => <option key={d} value={d}>{d === "NOV" ? "Académico Novicio" : d === "INV_ACREDITADO" ? "Académico Investigador acreditado" : "Académico Numerario"}</option>)}
        </select>
        <p style={{ lineHeight: 1.7, color: "#555" }}>Al aprobarse por unanimidad, el sistema conservará el expediente existente, regularizará como cumplidos los requisitos académicos que correspondan a la promoción y enviará la resolución al miembro. Para INV acreditado y NUM se emitirá certificado con origen <strong>Promoción extraordinaria</strong>.</p>
      </div> : <div style={{ ...card, display: "grid", gap: "1rem" }}>
        <h2 style={{ margin: 0 }}>Nueva incorporación</h2>
        <div><label style={{ fontWeight: 700 }}>Nombre completo *</label><input value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ ...input, marginTop: ".4rem" }} /></div>
        <div><label style={{ fontWeight: 700 }}>Sexo *</label><div style={{ marginTop: ".5rem" }}><label style={{ marginRight: "1.5rem" }}><input type="radio" checked={sexo === "M"} onChange={() => setSexo("M")} /> Masculino</label><label><input type="radio" checked={sexo === "F"} onChange={() => setSexo("F")} /> Femenino</label></div></div>
        <div><label style={{ fontWeight: 700 }}>Correo</label><input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} style={{ ...input, marginTop: ".4rem" }} /></div>
        <div><label style={{ fontWeight: 700 }}>Teléfono</label><input value={telefono} onChange={(e) => setTelefono(e.target.value)} style={{ ...input, marginTop: ".4rem" }} /></div>
        <div><label style={{ fontWeight: 700 }}>Modalidad de incorporación *</label><select value={modalidad} onChange={(e) => setModalidad(e.target.value as Modalidad)} style={{ ...input, marginTop: ".4rem" }}><option value="NOV">Académico Novicio — omite el Nivel Aspirante</option><option value="INV_FORMACION">Académico Investigador — en formación</option><option value="INV_ACREDITADO">Académico Investigador acreditado</option><option value="NUM">Académico Numerario</option></select></div>
        {modalidad === "NOV" && <p style={{ margin: 0, color: "#555" }}>Esta modalidad incorpora directamente al Nivel Novicio. No genera certificado: la persona deberá cursar normalmente las unidades NOV.</p>}
      </div>}

      <div style={card}><label style={{ fontWeight: 700 }}>Justificación académica *</label><textarea value={justificacion} onChange={(e) => setJustificacion(e.target.value)} rows={7} style={{ ...input, marginTop: ".4rem", resize: "vertical" }} placeholder="Fundamente la incorporación o promoción propuesta." /></div>
      {error && <div style={{ color: "#8b2f2f", background: "#f8ecec", padding: "1rem", borderRadius: 8 }}>{error}</div>}
      {mensaje && <div style={{ color: "#356128", background: "#e8f2e4", padding: "1rem", borderRadius: 8 }}>{mensaje}</div>}
      <button disabled={enviando} style={{ background: "#6b6f1a", color: "white", border: 0, borderRadius: 8, padding: ".9rem 1.2rem", fontWeight: 700, cursor: enviando ? "wait" : "pointer" }}>{enviando ? "Enviando..." : yaPertenece ? "Proponer Promoción extraordinaria" : "Presentar propuesta de incorporación"}</button>
    </form>
  </div>;
}
