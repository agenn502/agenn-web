"use client";

import { useEffect, useState } from "react";

type Candidato = {
  id: string; codigo: string; estado: string; perfil_codigo: string; perfil_nombre: string;
  nombres: string; apellidos: string; fecha_nacimiento: string; correo: string; telefono: string | null;
  foto_firmada: string | null; departamento: string; municipio: string; comunidad: string | null;
  profesion_oficio: string; institucion_trabajo: string | null; nivel_academico: string | null;
  intereses: string[]; interes_otro: string | null; experiencia_anios: number | null;
  posee_coleccion: boolean | null; participa_comunidad: boolean | null; comunidad_numismatica: string | null;
  areas_interes: string | null; como_conocio_agenn: string; motivacion: string;
  expectativas_aprendizaje: string | null; fecha_solicitud: string;
};

type Props = { userCodigo: string; onConteoChange?: (conteo: number) => void };

export default function CandidatosPanel({ userCodigo, onConteoChange }: Props) {
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [nivel, setNivel] = useState<"ASP" | "INV">("ASP");
  const [privadas, setPrivadas] = useState("");
  const [publicas, setPublicas] = useState("");

  const cargar = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/aprobacion/candidatos", {
        headers: { "x-user-codigo": userCodigo }, cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "No fue posible cargar candidatos.");
      setCandidatos(result.candidatos || []);
      onConteoChange?.((result.candidatos || []).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [userCodigo]);

  const ejecutar = async (candidato: Candidato, accion: "aprobar" | "correcciones" | "rechazar") => {
    if (accion === "correcciones" && !publicas.trim()) return alert("Escriba las correcciones solicitadas.");
    if (accion === "rechazar" && !privadas.trim()) return alert("Registre el fundamento privado de la decisión.");

    const textos = {
      aprobar: `¿Aprobar a ${candidato.nombres} ${candidato.apellidos} como ${nivel}?`,
      correcciones: `¿Enviar la solicitud ${candidato.codigo} para correcciones?`,
      rechazar: `¿Confirmar la no aprobación de la candidatura ${candidato.codigo}?`,
    };
    if (!confirm(textos[accion])) return;

    setProcesando(true);
    try {
      const response = await fetch("/api/aprobacion/candidatos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, candidatoId: candidato.id, actorCodigo: userCodigo, nivel, observacionesPrivadas: privadas, observacionesCandidato: publicas }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "No fue posible completar la acción.");

      if (accion === "aprobar") {
        const correo = result.correo?.enviado ? "El correo de bienvenida fue enviado." : `El usuario fue creado, pero el correo no se envió: ${result.correo?.error || "error desconocido"}. Contraseña temporal: ${result.passwordTemporal}`;
        alert(`Ingreso aprobado. Código generado: ${result.codigoMiembro}. ${correo}`);
      } else if (accion === "correcciones") {
        alert(result.correo?.enviado ? "Correcciones solicitadas y correo enviado." : `Las correcciones quedaron registradas, pero el correo no se envió: ${result.correo?.error || "error desconocido"}`);
      } else {
        alert(result.correo?.enviado ? "Candidatura resuelta y correo enviado." : `La resolución quedó registrada, pero el correo no se envió: ${result.correo?.error || "error desconocido"}`);
      }

      setSeleccionado(null); setPrivadas(""); setPublicas(""); await cargar();
    } catch (err) { alert(err instanceof Error ? err.message : "Ocurrió un error inesperado."); }
    finally { setProcesando(false); }
  };

  if (loading) return <p>Cargando solicitudes de admisión...</p>;
  if (error) return <p style={{ color: "#8b2f2f" }}>{error}</p>;
  if (candidatos.length === 0) return <p>No hay solicitudes de admisión pendientes.</p>;

  return <div style={{ display: "grid", gap: "1rem" }}>
    {candidatos.map((candidato) => {
      const abierto = seleccionado === candidato.id;
      return <article key={candidato.id} style={{ background: "white", border: "1px solid #ddd4c7", borderRadius: 12, padding: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "1rem", alignItems: "center" }}>
          {candidato.foto_firmada ? <img src={candidato.foto_firmada} alt={`Fotografía de ${candidato.nombres}`} style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 10, border: "1px solid #ddd4c7" }} /> : <div style={{ width: 96, height: 96, borderRadius: 10, background: "#eee9df", display: "grid", placeItems: "center" }}>Sin foto</div>}
          <div><p style={{ margin: 0, color: "#6b6f1a", fontWeight: 700 }}>{candidato.codigo}</p><h3 style={{ margin: "0.25rem 0" }}>{candidato.nombres} {candidato.apellidos}</h3><p style={{ margin: 0 }}><strong>Perfil {candidato.perfil_codigo}:</strong> {candidato.perfil_nombre}</p><p style={{ margin: "0.25rem 0 0" }}>{candidato.profesion_oficio} · {candidato.municipio}, {candidato.departamento}</p></div>
        </div>
        <button type="button" onClick={() => { setSeleccionado(abierto ? null : candidato.id); setPrivadas(""); setPublicas(""); }} style={{ marginTop: "1rem", background: "#6b6f1a", color: "white", border: 0, borderRadius: 8, padding: "0.7rem 1rem", cursor: "pointer" }}>{abierto ? "Cerrar expediente" : "Ver expediente"}</button>
        {abierto && <div style={{ marginTop: "1rem", borderTop: "1px solid #ddd4c7", paddingTop: "1rem", lineHeight: 1.7 }}>
          <h4>Datos personales</h4><p><strong>Correo:</strong> {candidato.correo}</p><p><strong>Teléfono:</strong> {candidato.telefono || "No indicado"}</p><p><strong>Fecha de nacimiento:</strong> {new Date(`${candidato.fecha_nacimiento}T00:00:00`).toLocaleDateString("es-GT")}</p><p><strong>Ubicación domiciliar:</strong> {candidato.comunidad ? `${candidato.comunidad}, ` : ""}{candidato.municipio}, {candidato.departamento}</p><p><strong>Nivel académico:</strong> {candidato.nivel_academico || "No indicado"}</p><p><strong>Institución de trabajo:</strong> {candidato.institucion_trabajo || "No indicada"}</p>
          <h4>Experiencia e intereses</h4><p><strong>Intereses:</strong> {[...(candidato.intereses || []), candidato.interes_otro].filter(Boolean).join(", ")}</p><p><strong>Años de experiencia:</strong> {candidato.experiencia_anios ?? "No indicados"}</p><p><strong>Posee colección:</strong> {candidato.posee_coleccion ? "Sí" : "No"}</p><p><strong>Participa en una comunidad:</strong> {candidato.participa_comunidad ? "Sí" : "No"}</p>{candidato.comunidad_numismatica && <p><strong>Comunidad:</strong> {candidato.comunidad_numismatica}</p>}{candidato.areas_interes && <p><strong>Áreas de especial interés:</strong> {candidato.areas_interes}</p>}
          <h4>Motivación</h4><p><strong>Cómo conoció la AGENN:</strong> {candidato.como_conocio_agenn}</p><p><strong>Motivación:</strong> {candidato.motivacion}</p>{candidato.expectativas_aprendizaje && <p><strong>Expectativas:</strong> {candidato.expectativas_aprendizaje}</p>}
          <div style={{ background: "#f7f4ee", border: "1px solid #ddd4c7", borderRadius: 10, padding: "1rem", marginTop: "1rem" }}>
            <h4 style={{ marginTop: 0 }}>Decisión del Consejo Académico</h4>
            <label>Nivel de ingreso<select value={nivel} onChange={(e) => setNivel(e.target.value as "ASP" | "INV")} style={{ display: "block", width: "100%", padding: ".75rem", marginTop: ".35rem", borderRadius: 8 }}><option value="ASP">ASP — Académico Aspirante</option><option value="INV">INV — Académico Investigador</option></select></label>
            <label style={{ display: "block", marginTop: "1rem" }}>Observaciones privadas del Consejo<textarea value={privadas} onChange={(e) => setPrivadas(e.target.value)} rows={4} style={{ display: "block", width: "100%", padding: ".75rem", marginTop: ".35rem", borderRadius: 8 }} /></label>
            <label style={{ display: "block", marginTop: "1rem" }}>Mensaje o correcciones para el candidato<textarea value={publicas} onChange={(e) => setPublicas(e.target.value)} rows={4} style={{ display: "block", width: "100%", padding: ".75rem", marginTop: ".35rem", borderRadius: 8 }} /></label>
            <div style={{ display: "flex", gap: ".65rem", flexWrap: "wrap", marginTop: "1rem" }}><button disabled={procesando} onClick={() => ejecutar(candidato, "aprobar")} style={{ background: "#4f7f3b", color: "white", border: 0, borderRadius: 8, padding: ".75rem 1rem" }}>Aprobar ingreso</button><button disabled={procesando} onClick={() => ejecutar(candidato, "correcciones")} style={{ background: "#b08a3c", color: "white", border: 0, borderRadius: 8, padding: ".75rem 1rem" }}>Solicitar correcciones</button><button disabled={procesando} onClick={() => ejecutar(candidato, "rechazar")} style={{ background: "#8b2f2f", color: "white", border: 0, borderRadius: 8, padding: ".75rem 1rem" }}>Rechazar candidatura</button></div>
          </div>
        </div>}
      </article>;
    })}
  </div>;
}
