"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

type User = { codigo: string; nombre: string };

type TrabajoPendiente = {
  id: number;
  titulo: string;
  slug: string;
  autor_nombre: string;
  autor_codigo: string;
  nivel: string;
  unidad_slug: string;
  tema: string | null;
  contenido: string;
  imagen_url: string | null;
  fuente_imagen: string | null;
  estado_revision: string | null;
  observaciones_revision: string | null;
  seleccionado_revista: boolean;
  tipo_trabajo: string | null;
  numero_palabras: number | null;
  numero_caracteres: number | null;
};

type Props = {
  user: User;
  onConteoChange?: (conteo: number) => void;
};

const NOMBRES_TIPO: Record<string, string> = {
  ANALISIS_BREVE: "Análisis breve",
  NOTA_INVESTIGACION: "Nota de investigación",
  ENSAYO_ACADEMICO: "Ensayo académico",
};

export default function InvestigadoresPanel({ user, onConteoChange }: Props) {
  const [trabajos, setTrabajos] = useState<TrabajoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/aprobacion/investigadores", {
        headers: { "x-user-codigo": user.codigo },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "No fue posible cargar los trabajos.");
      }
      setTrabajos(result.ensayos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar los trabajos.");
      setTrabajos([]);
    } finally {
      setLoading(false);
    }
  }, [user.codigo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!loading) onConteoChange?.(trabajos.length);
  }, [trabajos.length, loading, onConteoChange]);

  const ejecutar = async (
    trabajo: TrabajoPendiente,
    accion: "aprobar" | "correcciones" | "seleccion_revista",
    adicionales: Record<string, unknown> = {}
  ) => {
    setProcesandoId(trabajo.id);
    try {
      const response = await fetch("/api/aprobacion/investigadores", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": user.codigo,
        },
        body: JSON.stringify({ ensayoId: trabajo.id, accion, ...adicionales }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "No fue posible revisar el trabajo.");
      }

      if (accion === "seleccion_revista") {
        setTrabajos((actuales) =>
          actuales.map((item) =>
            item.id === trabajo.id
              ? { ...item, seleccionado_revista: Boolean(adicionales.seleccionado) }
              : item
          )
        );
      } else {
        setTrabajos((actuales) => actuales.filter((item) => item.id !== trabajo.id));
      }
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : "No fue posible revisar el trabajo.");
      return false;
    } finally {
      setProcesandoId(null);
    }
  };

  const aprobar = async (trabajo: TrabajoPendiente) => {
    if (!confirm(`¿Aprobar el trabajo de ${trabajo.autor_nombre} y completar ${trabajo.unidad_slug} al 100 %?`)) return;
    if (await ejecutar(trabajo, "aprobar")) {
      alert("Trabajo aprobado. La unidad fue completada al 100 %.");
    }
  };

  const solicitarCorrecciones = async (trabajo: TrabajoPendiente) => {
    const observaciones = prompt(`Escriba las correcciones solicitadas a ${trabajo.autor_nombre}:`);
    if (!observaciones?.trim()) {
      alert("Debe escribir las observaciones que recibirá el investigador.");
      return;
    }
    if (!confirm(`¿Devolver el trabajo de ${trabajo.autor_nombre} para correcciones?`)) return;
    await ejecutar(trabajo, "correcciones", { observaciones: observaciones.trim() });
  };

  if (loading) return <p>Cargando trabajos pendientes...</p>;
  if (error) return <p style={{ color: "#8b2f2f" }}>{error}</p>;
  if (trabajos.length === 0) return <p>No hay trabajos escritos pendientes de revisión.</p>;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {trabajos.map((trabajo) => {
        const procesando = procesandoId === trabajo.id;
        const tipo = NOMBRES_TIPO[trabajo.tipo_trabajo || ""] || "Trabajo escrito";

        return (
          <article
            key={trabajo.id}
            style={{ background: "white", border: "1px solid #ddd4c7", borderRadius: 12, padding: "1rem" }}
          >
            <div style={{ display: "inline-block", background: "#fff3cd", color: "#6d5711", border: "1px solid #e2cf8b", borderRadius: 999, padding: "0.3rem 0.7rem", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              REVISIÓN ACADÉMICA
            </div>

            <h3 style={{ marginTop: 0 }}>{trabajo.titulo}</h3>
            <p><strong>Autor:</strong> {trabajo.autor_nombre} ({trabajo.autor_codigo})</p>
            <p><strong>Unidad:</strong> {trabajo.unidad_slug}</p>
            <p><strong>Tipo:</strong> {tipo}</p>
            <p>
              <strong>Extensión:</strong>{" "}
              {(trabajo.numero_palabras || 0).toLocaleString()} palabras ·{" "}
              {(trabajo.numero_caracteres || 0).toLocaleString()} caracteres
            </p>
            {trabajo.tema && <p><strong>Tema:</strong> {trabajo.tema}</p>}
            <details style={{ margin: "1rem 0" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>Leer trabajo completo</summary>
              {trabajo.imagen_url && (
                <figure style={{ margin: "1rem 0", textAlign: "center" }}>
                  <img src={trabajo.imagen_url} alt={trabajo.titulo} style={{ maxWidth: "100%", maxHeight: 380, objectFit: "contain" }} />
                  {trabajo.fuente_imagen && <figcaption style={{ color: "#666" }}>Fuente: {trabajo.fuente_imagen}</figcaption>}
                </figure>
              )}
              <div style={{ lineHeight: 1.8, marginTop: "1rem" }}>
                <ReactMarkdown>{trabajo.contenido}</ReactMarkdown>
              </div>
            </details>

            <div style={{ margin: "1rem 0", padding: "0.85rem", background: "#f4f1e8", borderRadius: 8 }}>
              <label style={{ display: "flex", gap: "0.6rem", alignItems: "center", cursor: procesando ? "wait" : "pointer" }}>
                <input
                  type="checkbox"
                  checked={trabajo.seleccionado_revista}
                  disabled={procesando}
                  onChange={(event) => ejecutar(trabajo, "seleccion_revista", { seleccionado: event.target.checked })}
                />
                <span>
                  <strong>Proponer para Revista AGENN</strong><br />
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>
                    La propuesta editorial no afecta la aprobación de la unidad.
                  </span>
                </span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button disabled={procesando} onClick={() => aprobar(trabajo)} style={{ background: "#4f7f3b", color: "white", border: 0, padding: "0.75rem 1rem", borderRadius: 8, cursor: procesando ? "wait" : "pointer" }}>
                Aprobar trabajo
              </button>
              <button disabled={procesando} onClick={() => solicitarCorrecciones(trabajo)} style={{ background: "#8b2f2f", color: "white", border: 0, padding: "0.75rem 1rem", borderRadius: 8, cursor: procesando ? "wait" : "pointer" }}>
                Solicitar correcciones
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}