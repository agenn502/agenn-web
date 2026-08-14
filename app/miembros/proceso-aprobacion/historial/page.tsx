"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Voto = {
  id: number;
  consejero_codigo: string;
  consejero_nombre: string;
  voto: "favor" | "contra";
  comentario?: string | null;
  fecha_voto: string;
};

type Asimilacion = {
  id: number;
  fecha_propuesta: string;
  estado: string;

  nivel_propuesto: "INV" | "NUM";

  nombre: string;

  correo?: string | null;
  telefono?: string | null;

  justificacion: string;

  proponente_codigo: string;
  proponente_nombre?: string;
  proponente_nivel?: string | null;

  votos_favor: number;
  votos_contra: number;
  votos_emitidos: number;
  total_consejo: number;

  resultado?: string | null;
  fecha_resolucion?: string | null;
  observaciones?: string | null;

  fecha_envio_invitacion?: string | null;
  invitacion_enviada_por?: string | null;
  invitacion_enviada_por_nombre?: string | null;

  fecha_aceptacion?: string | null;

  fecha_incorporacion?: string | null;
  codigo_asignado?: string | null;

  votos: Voto[];
};

export default function HistorialIncorporacionesPage() {
  const [loading, setLoading] = useState(true);

  const [asimilaciones, setAsimilaciones] = useState<Asimilacion[]>([]);

  const [error, setError] = useState("");

  const [expedienteAbierto, setExpedienteAbierto] =
    useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const stored = localStorage.getItem("user");

      if (!stored) {
        window.location.href = "/login";
        return;
      }

      const usuario = JSON.parse(stored);

      const response = await fetch("/api/asimilaciones", {
        headers: {
          "x-user-codigo": usuario.codigo,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            "No fue posible cargar el historial de incorporaciones."
        );
      }

      const todas: Asimilacion[] = result.asimilaciones || [];

      /*
       * El historial contiene únicamente expedientes
       * cuyo proceso ya concluyó:
       *
       * - incorporación completada
       * - propuesta rechazada
       * - propuesta cancelada
       */

      const historial = todas
        .filter(
          (item) =>
            Boolean(item.fecha_incorporacion) ||
            item.estado === "rechazada" ||
            item.estado === "cancelada"
        )
        .sort((a, b) => {
          const fechaA =
            a.fecha_incorporacion ||
            a.fecha_resolucion ||
            a.fecha_propuesta;

          const fechaB =
            b.fecha_incorporacion ||
            b.fecha_resolucion ||
            b.fecha_propuesta;

          return (
            new Date(fechaB).getTime() -
            new Date(fechaA).getTime()
          );
        });

      setAsimilaciones(historial);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible cargar el historial de incorporaciones."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const formatearFecha = (fecha?: string | null) => {
    if (!fecha) {
      return "—";
    }

    try {
      return new Intl.DateTimeFormat("es-GT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(fecha));
    } catch {
      return fecha;
    }
  };

  const nombreNivel = (nivel: "INV" | "NUM") => {
    if (nivel === "NUM") {
      return "Académico Numerario";
    }

    return "Académico Investigador";
  };

  const nombreResultado = (item: Asimilacion) => {
    if (item.fecha_incorporacion) {
      return "Incorporación completada";
    }

    if (item.estado === "rechazada") {
      return "No aprobada";
    }

    if (item.estado === "cancelada") {
      return "Cancelada";
    }

    return "Proceso concluido";
  };

  if (loading) {
    return (
      <div
        style={{
          maxWidth: "1100px",
          margin: "3rem auto",
          padding: "2rem",
        }}
      >
        Cargando historial de incorporaciones...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          maxWidth: "1100px",
          margin: "3rem auto",
          padding: "2rem",
        }}
      >
        <div
          style={{
            background: "#f8ecec",
            border: "1px solid #ebc8c8",
            borderRadius: "10px",
            padding: "1rem",
            color: "#8b2f2f",
          }}
        >
          {error}
        </div>

        <Link
          href="/miembros/proceso-aprobacion"
          style={{
            display: "inline-block",
            marginTop: "1.5rem",
            color: "#6b4f2a",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ← Volver al proceso de aprobación
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "3rem auto",
        padding: "2rem",
      }}
    >
      {/* =====================================================
          ENCABEZADO
          ===================================================== */}

      <div
        style={{
          marginBottom: "2rem",
        }}
      >
        <Link
          href="/miembros/proceso-aprobacion"
          style={{
            display: "inline-block",
            marginBottom: "1rem",
            color: "#6b4f2a",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ← Volver al proceso de aprobación
        </Link>

        <p
          style={{
            margin: "0 0 0.4rem",
            color: "#6b6f1a",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "0.82rem",
          }}
        >
          Consejo Académico
        </p>

        <h1
          style={{
            marginTop: 0,
            marginBottom: "0.75rem",
            color: "#4d371c",
          }}
        >
          Historial de incorporaciones
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: "850px",
            lineHeight: 1.8,
            color: "#555",
          }}
        >
          Archivo de las propuestas de incorporación por reconocimiento
          académico cuyo proceso ya ha concluido. Puede consultar la
          resolución y el expediente completo de cada propuesta.
        </p>
      </div>

      {/* =====================================================
          RESUMEN
          ===================================================== */}

      <div
        style={{
          background: "#faf8f3",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <strong style={{ color: "#6b4f2a" }}>
          {asimilaciones.length === 1
            ? "1 expediente registrado"
            : `${asimilaciones.length} expedientes registrados`}
        </strong>
      </div>

      {/* =====================================================
          HISTORIAL VACÍO
          ===================================================== */}

      {asimilaciones.length === 0 && (
        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "14px",
            padding: "2.5rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "1rem",
            }}
          >
            📜
          </div>

          <h2
            style={{
              marginTop: 0,
              color: "#4d371c",
            }}
          >
            El historial está vacío
          </h2>

          <p
            style={{
              color: "#666",
              lineHeight: 1.7,
              marginBottom: 0,
            }}
          >
            Las propuestas aparecerán aquí cuando su proceso haya
            concluido.
          </p>
        </div>
      )}

      {/* =====================================================
          EXPEDIENTES
          ===================================================== */}

      <div
        style={{
          display: "grid",
          gap: "1rem",
        }}
      >
        {asimilaciones.map((item) => {
          const abierto = expedienteAbierto === item.id;

          const incorporado = Boolean(item.fecha_incorporacion);

          return (
            <div
              key={item.id}
              style={{
                background: "white",
                border: "1px solid #ddd4c7",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              {/* =============================================
                  RESUMEN DEL EXPEDIENTE
                  ============================================= */}

              <div
                style={{
                  padding: "1.4rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: "1 1 400px" }}>
                    <p
                      style={{
                        margin: "0 0 0.3rem",
                        color: "#6b6f1a",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {nombreNivel(item.nivel_propuesto)}
                    </p>

                    <h2
                      style={{
                        margin: "0 0 0.5rem",
                        color: "#4d371c",
                        fontSize: "1.35rem",
                      }}
                    >
                      {item.nombre}
                    </h2>

                    {item.codigo_asignado && (
                      <p
                        style={{
                          margin: "0.2rem 0",
                        }}
                      >
                        <strong>Código asignado:</strong>{" "}
                        {item.codigo_asignado}
                      </p>
                    )}

                    <p
                      style={{
                        margin: "0.2rem 0",
                        color: "#666",
                        lineHeight: 1.6,
                      }}
                    >
                      <strong>Propuesto por:</strong>{" "}
                      {item.proponente_nombre ||
                        item.proponente_codigo}
                    </p>

                    <p
                      style={{
                        margin: "0.2rem 0",
                        color: "#666",
                        lineHeight: 1.6,
                      }}
                    >
                      <strong>Fecha de propuesta:</strong>{" "}
                      {formatearFecha(item.fecha_propuesta)}
                    </p>

                    {item.fecha_incorporacion && (
                      <p
                        style={{
                          margin: "0.2rem 0",
                          color: "#666",
                          lineHeight: 1.6,
                        }}
                      >
                        <strong>Fecha de incorporación:</strong>{" "}
                        {formatearFecha(item.fecha_incorporacion)}
                      </p>
                    )}

                    {!item.fecha_incorporacion &&
                      item.fecha_resolucion && (
                        <p
                          style={{
                            margin: "0.2rem 0",
                            color: "#666",
                            lineHeight: 1.6,
                          }}
                        >
                          <strong>Fecha de resolución:</strong>{" "}
                          {formatearFecha(item.fecha_resolucion)}
                        </p>
                      )}
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.45rem 0.8rem",
                      borderRadius: "999px",
                      background: incorporado
                        ? "#e8f2e4"
                        : item.estado === "rechazada"
                        ? "#f8ecec"
                        : "#f3f0e8",
                      color: incorporado
                        ? "#356128"
                        : item.estado === "rechazada"
                        ? "#8b2f2f"
                        : "#6b4f2a",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                    }}
                  >
                    {nombreResultado(item)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExpedienteAbierto(
                      abierto ? null : item.id
                    )
                  }
                  style={{
                    marginTop: "1.2rem",
                    background: abierto ? "#f5f1e8" : "#6b4f2a",
                    color: abierto ? "#6b4f2a" : "white",
                    border: abierto
                      ? "1px solid #cbbfa9"
                      : "1px solid #6b4f2a",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {abierto ? "Cerrar expediente" : "Ver expediente"}
                </button>
              </div>

              {/* =============================================
                  EXPEDIENTE COMPLETO
                  ============================================= */}

              {abierto && (
                <div
                  style={{
                    borderTop: "1px solid #e5ded3",
                    background: "#fcfbf8",
                    padding: "1.5rem",
                  }}
                >
                  {/* DATOS */}

                  <h3
                    style={{
                      marginTop: 0,
                      color: "#4d371c",
                    }}
                  >
                    Datos de la propuesta
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "0.8rem",
                      background: "white",
                      border: "1px solid #e2dbcf",
                      borderRadius: "10px",
                      padding: "1rem",
                    }}
                  >
                    <div>
                      <strong>Nivel propuesto</strong>
                      <div>{nombreNivel(item.nivel_propuesto)}</div>
                    </div>

                    <div>
                      <strong>Proponente</strong>
                      <div>
                        {item.proponente_nombre ||
                          item.proponente_codigo}
                        {item.proponente_nombre
                          ? ` (${item.proponente_codigo})`
                          : ""}
                      </div>
                    </div>

                    {item.correo && (
                      <div>
                        <strong>Correo</strong>
                        <div>{item.correo}</div>
                      </div>
                    )}

                    {item.telefono && (
                      <div>
                        <strong>Teléfono</strong>
                        <div>{item.telefono}</div>
                      </div>
                    )}
                  </div>

                  {/* JUSTIFICACIÓN */}

                  <h3
                    style={{
                      marginTop: "1.5rem",
                      marginBottom: "0.6rem",
                      color: "#4d371c",
                    }}
                  >
                    Justificación
                  </h3>

                  <div
                    style={{
                      background: "white",
                      border: "1px solid #e2dbcf",
                      borderRadius: "10px",
                      padding: "1rem",
                      lineHeight: 1.8,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {item.justificacion}
                  </div>

                  {/* VOTACIÓN */}

                  <h3
                    style={{
                      marginTop: "1.5rem",
                      marginBottom: "0.6rem",
                      color: "#4d371c",
                    }}
                  >
                    Votación del Consejo Académico
                  </h3>

                  <div
                    style={{
                      background: "white",
                      border: "1px solid #e2dbcf",
                      borderRadius: "10px",
                      padding: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "1.5rem",
                        flexWrap: "wrap",
                        marginBottom:
                          item.votos?.length > 0 ? "1rem" : 0,
                      }}
                    >
                      <span>
                        <strong>A favor:</strong> {item.votos_favor}
                      </span>

                      <span>
                        <strong>En contra:</strong>{" "}
                        {item.votos_contra}
                      </span>

                      <span>
                        <strong>Votos emitidos:</strong>{" "}
                        {item.votos_emitidos}
                      </span>
                    </div>

                    {item.votos?.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gap: "0.6rem",
                        }}
                      >
                        {item.votos.map((voto) => (
                          <div
                            key={voto.id}
                            style={{
                              background: "#faf8f3",
                              borderRadius: "8px",
                              padding: "0.8rem",
                            }}
                          >
                            <strong>{voto.consejero_nombre}</strong>{" "}
                            <span style={{ color: "#777" }}>
                              ({voto.consejero_codigo})
                            </span>

                            <div
                              style={{
                                marginTop: "0.25rem",
                                fontWeight: 700,
                                color:
                                  voto.voto === "favor"
                                    ? "#356128"
                                    : "#8b2f2f",
                              }}
                            >
                              {voto.voto === "favor"
                                ? "A favor"
                                : "En contra"}
                            </div>

                            {voto.comentario && (
                              <p
                                style={{
                                  marginBottom: 0,
                                  lineHeight: 1.6,
                                }}
                              >
                                {voto.comentario}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RESOLUCIÓN */}

                  {item.resultado && (
                    <>
                      <h3
                        style={{
                          marginTop: "1.5rem",
                          marginBottom: "0.6rem",
                          color: "#4d371c",
                        }}
                      >
                        Resolución
                      </h3>

                      <div
                        style={{
                          background: incorporado
                            ? "#eef6e9"
                            : item.estado === "rechazada"
                            ? "#f8ecec"
                            : "white",
                          border: incorporado
                            ? "1px solid #cfe3c4"
                            : item.estado === "rechazada"
                            ? "1px solid #ebc8c8"
                            : "1px solid #e2dbcf",
                          borderRadius: "10px",
                          padding: "1rem",
                          lineHeight: 1.8,
                        }}
                      >
                        {item.resultado}
                      </div>
                    </>
                  )}

                  {/* TRAZABILIDAD */}

                  <h3
                    style={{
                      marginTop: "1.5rem",
                      marginBottom: "0.6rem",
                      color: "#4d371c",
                    }}
                  >
                    Seguimiento del proceso
                  </h3>

                  <div
                    style={{
                      background: "white",
                      border: "1px solid #e2dbcf",
                      borderRadius: "10px",
                      padding: "1rem",
                      display: "grid",
                      gap: "0.55rem",
                    }}
                  >
                    <div>
                      <strong>Propuesta presentada:</strong>{" "}
                      {formatearFecha(item.fecha_propuesta)}
                    </div>

                    {item.fecha_resolucion && (
                      <div>
                        <strong>Resolución emitida:</strong>{" "}
                        {formatearFecha(item.fecha_resolucion)}
                      </div>
                    )}

                    {item.fecha_envio_invitacion && (
                      <div>
                        <strong>Invitación enviada:</strong>{" "}
                        {formatearFecha(
                          item.fecha_envio_invitacion
                        )}
                        {item.invitacion_enviada_por_nombre
                          ? ` por ${item.invitacion_enviada_por_nombre}`
                          : ""}
                      </div>
                    )}

                    {item.fecha_aceptacion && (
                      <div>
                        <strong>Invitación aceptada:</strong>{" "}
                        {formatearFecha(item.fecha_aceptacion)}
                      </div>
                    )}

                    {item.fecha_incorporacion && (
                      <div>
                        <strong>Incorporación completada:</strong>{" "}
                        {formatearFecha(item.fecha_incorporacion)}
                      </div>
                    )}

                    {item.codigo_asignado && (
                      <div
                        style={{
                          marginTop: "0.3rem",
                          color: "#356128",
                        }}
                      >
                        <strong>Código institucional asignado:</strong>{" "}
                        {item.codigo_asignado}
                      </div>
                    )}
                  </div>

                  {item.observaciones && (
                    <>
                      <h3
                        style={{
                          marginTop: "1.5rem",
                          marginBottom: "0.6rem",
                          color: "#4d371c",
                        }}
                      >
                        Observaciones
                      </h3>

                      <div
                        style={{
                          background: "white",
                          border: "1px solid #e2dbcf",
                          borderRadius: "10px",
                          padding: "1rem",
                          lineHeight: 1.8,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {item.observaciones}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}