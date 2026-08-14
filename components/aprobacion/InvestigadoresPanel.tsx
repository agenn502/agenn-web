"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type User = { codigo: string; nombre: string };
type EnsayoPendiente = {
  id: string; titulo: string; slug: string; autor_nombre: string; autor_codigo: string;
  nivel: string; unidad_slug: string; tema: string | null; url_social: string | null;
  codigo_verificacion: string | null; fecha_evidencia: string | null; estado_revision: string | null;
};

type Props = { user: User; onConteoChange?: (conteo: number) => void };

export default function InvestigadoresPanel({ user, onConteoChange }: Props) {
  const [ensayos, setEnsayos] = useState<EnsayoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase.from("ensayos").select("id,titulo,slug,autor_nombre,autor_codigo,nivel,unidad_slug,tema,url_social,codigo_verificacion,fecha_evidencia,estado_revision").eq("estado", "publicado").eq("estado_revision", "pendiente").order("fecha_evidencia", { ascending: true });
      if (error) setError(error.message);
      else {
        const filas = (data as EnsayoPendiente[]) || [];
        setEnsayos(filas);
        onConteoChange?.(filas.length);
      }
      setLoading(false);
    };
    cargar();
  }, [onConteoChange]);

  const aprobar = async (ensayo: EnsayoPendiente) => {
    if (!confirm(`Â¿Aprobar la evidencia de ${ensayo.autor_nombre} para ${ensayo.unidad_slug}?`)) return;
    const ahora = new Date().toISOString();
    const { error: e1 } = await supabase.from("ensayos").update({ evidencia_validada: true, estado_revision: "aprobado", revisado_por: user.codigo, fecha_revision: ahora, url_social: null, fecha_evidencia: null }).eq("id", ensayo.id);
    if (e1) return alert(e1.message);
    const { error: e2 } = await supabase.from("progreso_inv").update({ porcentaje: 100, completada: true, fecha_actualizacion: ahora }).eq("user_codigo", ensayo.autor_codigo).eq("unidad_slug", ensayo.unidad_slug);
    if (e2) return alert(e2.message);
    setEnsayos((prev) => prev.filter((x) => x.id !== ensayo.id));
    onConteoChange?.(Math.max(0, ensayos.length - 1));
    alert("Evidencia aprobada. La unidad fue completada.");
  };

  const rechazar = async (ensayo: EnsayoPendiente) => {
    const observaciones = prompt(`Escriba las observaciones para ${ensayo.autor_nombre}:`);
    if (!observaciones?.trim()) return alert("Debe escribir observaciones para rechazar la evidencia.");
    if (!confirm(`Â¿Rechazar la evidencia de ${ensayo.autor_nombre} para ${ensayo.unidad_slug}?`)) return;
    const ahora = new Date().toISOString();
    const { error: e1 } = await supabase.from("ensayos").update({ evidencia_validada: false, estado_revision: "rechazado", observaciones_revision: observaciones.trim(), revisado_por: user.codigo, fecha_revision: ahora }).eq("id", ensayo.id);
    if (e1) return alert(e1.message);
    const { error: e2 } = await supabase.from("progreso_inv").update({ porcentaje: 80, completada: false, fecha_actualizacion: ahora }).eq("user_codigo", ensayo.autor_codigo).eq("unidad_slug", ensayo.unidad_slug);
    if (e2) return alert(e2.message);
    setEnsayos((prev) => prev.filter((x) => x.id !== ensayo.id));
    onConteoChange?.(Math.max(0, ensayos.length - 1));
    alert("Evidencia rechazada. La unidad queda pendiente de correcciÃ³n.");
  };

  if (loading) return <p>Cargando evidencias...</p>;
  if (error) return <p style={{ color: "#8b2f2f" }}>{error}</p>;
  if (ensayos.length === 0) return <p>No hay evidencias pendientes de revisiÃ³n.</p>;

  return <div style={{ display: "grid", gap: "1rem" }}>{ensayos.map((ensayo) => (
    <article key={ensayo.id} style={{ background: "white", border: "1px solid #ddd4c7", borderRadius: 12, padding: "1rem" }}>
      <h3 style={{ marginTop: 0 }}>{ensayo.titulo}</h3>
      <p><strong>Autor:</strong> {ensayo.autor_nombre} ({ensayo.autor_codigo})</p>
      <p><strong>Unidad:</strong> {ensayo.unidad_slug}</p>
      {ensayo.tema && <p><strong>Tema:</strong> {ensayo.tema}</p>}
      <p><strong>Ensayo:</strong> <Link href={`/ensayos/${ensayo.slug}`} target="_blank">Ver ensayo publicado</Link></p>
      {ensayo.url_social && <p><strong>PublicaciÃ³n externa:</strong> <a href={ensayo.url_social} target="_blank" rel="noreferrer">Ver publicaciÃ³n</a></p>}
      <button onClick={() => aprobar(ensayo)} style={{ background: "#4f7f3b", color: "white", border: 0, padding: "0.75rem 1rem", borderRadius: 8, cursor: "pointer" }}>Aprobar evidencia</button>
      <button onClick={() => rechazar(ensayo)} style={{ background: "#8b2f2f", color: "white", border: 0, padding: "0.75rem 1rem", borderRadius: 8, cursor: "pointer", marginLeft: "0.5rem" }}>Rechazar evidencia</button>
    </article>
  ))}</div>;
}

