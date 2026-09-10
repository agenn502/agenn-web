"use client";

import { useCallback, useEffect, useState } from "react";
import PortadaDropzone from "@/components/biblioteca/PortadaDropzone";

type User = {
  codigo: string;
  nombre: string;
};

type Solicitud = {
  id: string;
  propuesto_por_codigo: string;
  propuesto_por_nombre: string;
  titulo: string;
  autores: string[];
  anio: number | null;
  tipo: string | null;
  editorial: string | null;
  descripcion: string | null;
  portada_url: string | null;
  enlace_url: string;
  motivo: string;
  created_at: string;
};

type Props = {
  user: User;
  onConteoChange?: (numero: number) => void;
};

export default function BibliotecaPanel({ user, onConteoChange }: Props) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState<Record<string, string>>(
    {},
  );
  const [portadas, setPortadas] = useState<Record<string, File | null>>({});

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/aprobacion/biblioteca", {
        headers: { "x-user-codigo": user.codigo },
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "No fue posible cargar las propuestas.");
      }

      const pendientes = Array.isArray(result.solicitudes)
        ? result.solicitudes
        : [];
      setSolicitudes(pendientes);
      onConteoChange?.(pendientes.length);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar las propuestas.",
      );
    } finally {
      setLoading(false);
    }
  }, [user.codigo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resolver = async (
    solicitudId: string,
    accion: "APROBAR" | "CORRECCIONES" | "RECHAZAR",
  ) => {
    const nota = (observaciones[solicitudId] || "").trim();

    if (accion !== "APROBAR" && !nota) {
      alert("Escriba las observaciones que recibirá la persona proponente.");
      return;
    }

    const confirmacion =
      accion === "APROBAR"
        ? "¿Aprobar e incorporar este material a la Biblioteca?"
        : accion === "CORRECCIONES"
          ? "¿Enviar estas observaciones para que la propuesta sea corregida?"
          : "¿Rechazar esta propuesta bibliográfica?";

    if (!window.confirm(confirmacion)) return;

    try {
      setProcesandoId(solicitudId);

      const formData = new FormData();
      formData.append("solicitud_id", solicitudId);
      formData.append("accion", accion);
      formData.append("observaciones", nota);
      if (portadas[solicitudId]) {
        formData.append("portada", portadas[solicitudId] as File);
      }

      const response = await fetch("/api/aprobacion/biblioteca", {
        method: "PATCH",
        headers: { "x-user-codigo": user.codigo },
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "No fue posible procesar la propuesta.");
      }

      alert(result.message);
      await cargar();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "No fue posible procesar la propuesta.",
      );
    } finally {
      setProcesandoId(null);
    }
  };

  if (loading) return <p>Cargando propuestas para la Biblioteca...</p>;
  if (error) return <p style={{ color: "#8b2f2f" }}>{error}</p>;

  if (solicitudes.length === 0) {
    return <p>No hay propuestas bibliográficas pendientes.</p>;
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {solicitudes.map((solicitud) => (
        <article
          key={solicitud.id}
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: 12,
            padding: "1.25rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.35rem",
              color: "#6b6f1a",
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Propuesta de {solicitud.propuesto_por_nombre} ·{" "}
            {solicitud.propuesto_por_codigo}
          </p>

          <h3 style={{ margin: "0 0 0.75rem" }}>{solicitud.titulo}</h3>

          <div style={{ lineHeight: 1.7 }}>
            <p style={{ margin: "0.2rem 0" }}>
              <strong>Autoría:</strong> {(solicitud.autores || []).join(", ")}
            </p>
            {solicitud.editorial && (
              <p style={{ margin: "0.2rem 0" }}>
                <strong>Editorial:</strong> {solicitud.editorial}
              </p>
            )}
            {solicitud.anio && (
              <p style={{ margin: "0.2rem 0" }}>
                <strong>Año:</strong> {solicitud.anio}
              </p>
            )}
            {solicitud.tipo && (
              <p style={{ margin: "0.2rem 0" }}>
                <strong>Tipo:</strong> {solicitud.tipo}
              </p>
            )}
            {solicitud.descripcion && (
              <p>
                <strong>Descripción:</strong> {solicitud.descripcion}
              </p>
            )}
            <p>
              <strong>Razón de la propuesta:</strong> {solicitud.motivo}
            </p>
            <p>
              <a
                href={solicitud.enlace_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#4d371c", fontWeight: 700 }}
              >
                Comprobar enlace del material
              </a>
            </p>
          </div>

          <PortadaDropzone
            file={portadas[solicitud.id] || null}
            onFile={(file) =>
              setPortadas((actual) => ({
                ...actual,
                [solicitud.id]: file,
              }))
            }
            existingUrl={solicitud.portada_url}
            disabled={procesandoId === solicitud.id}
          />

          <textarea
            placeholder="Observaciones del Consejo Académico"
            value={observaciones[solicitud.id] || ""}
            onChange={(event) =>
              setObservaciones((actual) => ({
                ...actual,
                [solicitud.id]: event.target.value,
              }))
            }
            style={{
              width: "100%",
              minHeight: 100,
              boxSizing: "border-box",
              padding: "0.8rem",
              border: "1px solid #cfc5b7",
              borderRadius: 8,
              fontFamily: "inherit",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: "0.7rem",
              flexWrap: "wrap",
              marginTop: "0.9rem",
            }}
          >
            <button
              type="button"
              disabled={procesandoId === solicitud.id}
              onClick={() => void resolver(solicitud.id, "APROBAR")}
              style={{
                background: "#486534",
                color: "white",
                border: 0,
                borderRadius: 8,
                padding: "0.75rem 1rem",
                cursor: "pointer",
              }}
            >
              Aprobar e incorporar
            </button>
            <button
              type="button"
              disabled={procesandoId === solicitud.id}
              onClick={() => void resolver(solicitud.id, "CORRECCIONES")}
              style={{
                background: "#b98622",
                color: "white",
                border: 0,
                borderRadius: 8,
                padding: "0.75rem 1rem",
                cursor: "pointer",
              }}
            >
              Solicitar correcciones
            </button>
            <button
              type="button"
              disabled={procesandoId === solicitud.id}
              onClick={() => void resolver(solicitud.id, "RECHAZAR")}
              style={{
                background: "#8b2f2f",
                color: "white",
                border: 0,
                borderRadius: 8,
                padding: "0.75rem 1rem",
                cursor: "pointer",
              }}
            >
              Rechazar
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}