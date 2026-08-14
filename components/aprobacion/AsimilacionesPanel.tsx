"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import VotacionAsimilacion from "@/components/aprobacion/VotacionAsimilacion";

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

  nivel_propuesto:
    | "INV"
    | "NUM";

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

  mi_voto?: Voto | null;

  puede_votar: boolean;
};

export default function AsimilacionesPanel() {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    asimilaciones,
    setAsimilaciones,
  ] = useState<
    Asimilacion[]
  >([]);

  const [
    error,
    setError,
  ] = useState("");

  const [
    userCodigo,
    setUserCodigo,
  ] = useState("");

  const [
    enviandoInvitacion,
    setEnviandoInvitacion,
  ] = useState<
    number | null
  >(null);

  const [
    requiereCorreo,
    setRequiereCorreo,
  ] = useState<
    number | null
  >(null);

  const [
    correoPendiente,
    setCorreoPendiente,
  ] = useState<
    Record<
      number,
      string
    >
  >({});

  const [
    guardandoCorreo,
    setGuardandoCorreo,
  ] = useState<
    number | null
  >(null);

  const cargar =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setError("");

          const stored =
            localStorage.getItem(
              "user"
            );

          if (!stored) {
            window.location.href =
              "/login";

            return;
          }

          const usuario =
            JSON.parse(
              stored
            );

          setUserCodigo(
            usuario.codigo
          );

          const response =
            await fetch(
              "/api/asimilaciones",
              {
                headers: {
                  "x-user-codigo":
                    usuario.codigo,
                },

                cache:
                  "no-store",
              }
            );

          const result =
            await response.json();

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ||
                "No fue posible cargar las propuestas."
            );
          }

          setAsimilaciones(
            result.asimilaciones ||
              []
          );
        } catch (error) {
          setError(
            error instanceof
              Error
              ? error.message
              : "No fue posible cargar las propuestas."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const enviarInvitacion =
    async (
      asimilacionId: number
    ) => {
      setEnviandoInvitacion(
        asimilacionId
      );

      try {
        const response =
          await fetch(
            "/api/asimilaciones/invitar",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    asimilacionId,

                    enviadoPor:
                      userCodigo,
                  }
                ),
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.ok
        ) {
          if (
            result.requiereCorreo
          ) {
            setRequiereCorreo(
              asimilacionId
            );

            setCorreoPendiente(
              (
                actual
              ) => ({
                ...actual,

                [asimilacionId]:
                  actual[
                    asimilacionId
                  ] || "",
              })
            );

            return;
          }

          throw new Error(
            result.error ||
              "No fue posible enviar la invitación."
          );
        }

        alert(
          "La invitación institucional fue enviada correctamente."
        );

        setRequiereCorreo(
          null
        );

        await cargar();
      } catch (error) {
        alert(
          error instanceof
            Error
            ? error.message
            : "No fue posible enviar la invitación."
        );
      } finally {
        setEnviandoInvitacion(
          null
        );
      }
    };

  const guardarCorreoYEnviar =
    async (
      asimilacionId: number
    ) => {
      const correo =
        String(
          correoPendiente[
            asimilacionId
          ] || ""
        ).trim();

      if (!correo) {
        alert(
          "Debe indicar un correo electrónico."
        );

        return;
      }

      setGuardandoCorreo(
        asimilacionId
      );

      try {
        const response =
          await fetch(
            "/api/asimilaciones/correo",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    asimilacionId,
                    correo,

                    usuarioCodigo:
                      userCodigo,
                  }
                ),
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.ok
        ) {
          throw new Error(
            result.error ||
              "No fue posible registrar el correo."
          );
        }

        setRequiereCorreo(
          null
        );

        await cargar();

        await enviarInvitacion(
          asimilacionId
        );
      } catch (error) {
        alert(
          error instanceof
            Error
            ? error.message
            : "No fue posible registrar el correo."
        );
      } finally {
        setGuardandoCorreo(
          null
        );
      }
    };

  const formatearFecha = (
    fecha?:
      | string
      | null
  ) => {
    if (!fecha) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat(
        "es-GT",
        {
          day:
            "2-digit",

          month:
            "long",

          year:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      ).format(
        new Date(
          fecha
        )
      );
    } catch {
      return fecha;
    }
  };

  const nombreEstado = (
    estado: string
  ) => {
    const estados: Record<
      string,
      string
    > = {
      pendiente:
        "Pendiente de votación",

      aprobada:
        "Aprobada",

      rechazada:
        "No aprobada",

      invitacion_enviada:
        "Invitación enviada",

      aceptada:
        "Aceptada",

      cancelada:
        "Cancelada",
    };

    return (
      estados[
        estado
      ] || estado
    );
  };

  /*
   * =========================================================
   * PROCESOS ACTIVOS
   * =========================================================
   *
   * Una incorporación sale del panel principal cuando:
   *
   * - ya tiene fecha_incorporacion
   * - fue rechazada
   * - fue cancelada
   *
   * Todo eso pasa al historial.
   */

  const asimilacionesActivas =
    asimilaciones.filter(
      (item) =>
        !item.fecha_incorporacion &&
        item.estado !==
          "rechazada" &&
        item.estado !==
          "cancelada"
    );

  const totalHistorial =
    asimilaciones.filter(
      (item) =>
        Boolean(
          item.fecha_incorporacion
        ) ||
        item.estado ===
          "rechazada" ||
        item.estado ===
          "cancelada"
    ).length;

  if (loading) {
    return (
      <div>
        Cargando propuestas de incorporación...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background:
            "#f8ecec",

          border:
            "1px solid #ebc8c8",

          borderRadius:
            "10px",

          padding:
            "1rem",

          color:
            "#8b2f2f",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        display:
          "grid",

        gap:
          "1.25rem",
      }}
    >
      {/* =====================================================
          SI NO HAY PROCESOS ACTIVOS
          ===================================================== */}

      {asimilacionesActivas.length ===
        0 && (
        <div
          style={{
            background:
              "white",

            border:
              "1px solid #ddd4c7",

            borderRadius:
              "14px",

            padding:
              "2rem",
          }}
        >
          <h2
            style={{
              marginTop:
                0,

              color:
                "#6b4f2a",
            }}
          >
            Incorporaciones por reconocimiento académico
          </h2>

          <p
            style={{
              lineHeight:
                1.8,
            }}
          >
            En esta sección aparecen únicamente las propuestas de
            incorporación cuyo proceso todavía se encuentra activo.
          </p>

          <div
            style={{
              marginTop:
                "2rem",

              padding:
                "2rem",

              textAlign:
                "center",

              background:
                "#faf8f3",

              border:
                "1px dashed #cbbfa9",

              borderRadius:
                "10px",
            }}
          >
            <div
              style={{
                fontSize:
                  "3rem",

                marginBottom:
                  "1rem",
              }}
            >
              📜
            </div>

            <h3
              style={{
                marginTop:
                  0,
              }}
            >
              No hay procesos de incorporación activos
            </h3>

            <p
              style={{
                maxWidth:
                  "700px",

                margin:
                  "0 auto",

                color:
                  "#666",

                lineHeight:
                  1.7,
              }}
            >
              Cuando se presente una nueva propuesta de incorporación
              por reconocimiento académico, aparecerá aquí para su
              análisis, votación y seguimiento.
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          PROCESOS ACTIVOS
          ===================================================== */}

      {asimilacionesActivas.map(
        (item) => (
          <div
            key={
              item.id
            }
            style={{
              background:
                "white",

              border:
                "1px solid #ddd4c7",

              borderRadius:
                "14px",

              padding:
                "1.5rem",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                gap:
                  "1rem",

                alignItems:
                  "flex-start",

                flexWrap:
                  "wrap",
              }}
            >
              <div>
                <p
                  style={{
                    margin:
                      "0 0 0.35rem",

                    color:
                      "#6b6f1a",

                    fontWeight:
                      700,

                    textTransform:
                      "uppercase",

                    letterSpacing:
                      "0.05em",

                    fontSize:
                      "0.8rem",
                  }}
                >
                  Propuesta de incorporación por reconocimiento académico
                </p>

                <h3
                  style={{
                    marginTop:
                      0,

                    marginBottom:
                      "0.4rem",

                    fontSize:
                      "1.45rem",
                  }}
                >
                  {
                    item.nombre
                  }
                </h3>
              </div>

              <span
                style={{
                  display:
                    "inline-block",

                  padding:
                    "0.4rem 0.75rem",

                  borderRadius:
                    "999px",

                  background:
                    item.estado ===
                      "aprobada" ||
                    item.estado ===
                      "invitacion_enviada" ||
                    item.estado ===
                      "aceptada"
                      ? "#e8f2e4"
                      : item.estado ===
                          "rechazada"
                      ? "#f8ecec"
                      : "#fff8e5",

                  color:
                    item.estado ===
                      "aprobada" ||
                    item.estado ===
                      "invitacion_enviada" ||
                    item.estado ===
                      "aceptada"
                      ? "#356128"
                      : item.estado ===
                          "rechazada"
                      ? "#8b2f2f"
                      : "#8a6800",

                  fontWeight:
                    700,

                  fontSize:
                    "0.82rem",
                }}
              >
                {nombreEstado(
                  item.estado
                )}
              </span>
            </div>

            {/* =================================================
                DATOS GENERALES
                ================================================= */}

            <div
              style={{
                marginTop:
                  "1rem",

                padding:
                  "1rem",

                background:
                  "#faf8f3",

                borderRadius:
                  "10px",
              }}
            >
              <p
                style={{
                  margin:
                    "0.2rem 0",
                }}
              >
                <strong>
                  Nivel propuesto:
                </strong>{" "}
                {item.nivel_propuesto ===
                "NUM"
                  ? "Académico Numerario"
                  : "Académico Investigador"}
              </p>

              <p
                style={{
                  margin:
                    "0.2rem 0",
                }}
              >
                <strong>
                  Proponente:
                </strong>{" "}
                {item.proponente_nombre ||
                  item.proponente_codigo}{" "}
                <span
                  style={{
                    color:
                      "#777",
                  }}
                >
                  (
                  {
                    item.proponente_codigo
                  }
                  )
                </span>
              </p>

              <p
                style={{
                  margin:
                    "0.2rem 0",
                }}
              >
                <strong>
                  Fecha de propuesta:
                </strong>{" "}
                {formatearFecha(
                  item.fecha_propuesta
                )}
              </p>

              {item.correo && (
                <p
                  style={{
                    margin:
                      "0.2rem 0",
                  }}
                >
                  <strong>
                    Correo:
                  </strong>{" "}
                  {
                    item.correo
                  }
                </p>
              )}

              {item.telefono && (
                <p
                  style={{
                    margin:
                      "0.2rem 0",
                  }}
                >
                  <strong>
                    Teléfono:
                  </strong>{" "}
                  {
                    item.telefono
                  }
                </p>
              )}
            </div>

            {/* =================================================
                JUSTIFICACIÓN
                ================================================= */}

            <div
              style={{
                marginTop:
                  "1.25rem",
              }}
            >
              <h4
                style={{
                  marginBottom:
                    "0.5rem",
                }}
              >
                Justificación
              </h4>

              <p
                style={{
                  marginTop:
                    0,

                  lineHeight:
                    1.8,

                  whiteSpace:
                    "pre-line",
                }}
              >
                {
                  item.justificacion
                }
              </p>
            </div>

            {/* =================================================
                RESOLUCIÓN
                ================================================= */}

            {item.resultado && (
              <div
                style={{
                  marginTop:
                    "1.25rem",

                  padding:
                    "1rem",

                  borderRadius:
                    "10px",

                  background:
                    item.estado ===
                    "rechazada"
                      ? "#f8ecec"
                      : "#eef6e9",

                  border:
                    item.estado ===
                    "rechazada"
                      ? "1px solid #ebc8c8"
                      : "1px solid #cfe3c4",
                }}
              >
                <strong>
                  Resolución del Consejo Académico
                </strong>

                <p
                  style={{
                    marginBottom:
                      0,

                    lineHeight:
                      1.8,
                  }}
                >
                  {
                    item.resultado
                  }
                </p>
              </div>
            )}

            {/* =================================================
                VOTOS
                ================================================= */}

            {item.votos &&
              item.votos.length >
                0 && (
                <div
                  style={{
                    marginTop:
                      "1.5rem",
                  }}
                >
                  <h4
                    style={{
                      marginBottom:
                        "0.75rem",
                    }}
                  >
                    Votos emitidos
                  </h4>

                  <div
                    style={{
                      display:
                        "grid",

                      gap:
                        "0.6rem",
                    }}
                  >
                    {item.votos.map(
                      (
                        voto
                      ) => (
                        <div
                          key={
                            voto.id
                          }
                          style={{
                            padding:
                              "0.85rem",

                            background:
                              "#faf8f3",

                            borderRadius:
                              "8px",

                            border:
                              "1px solid #e2dbcf",
                          }}
                        >
                          <p
                            style={{
                              margin:
                                0,
                            }}
                          >
                            <strong>
                              {
                                voto.consejero_nombre
                              }
                            </strong>{" "}
                            <span
                              style={{
                                color:
                                  "#777",
                              }}
                            >
                              (
                              {
                                voto.consejero_codigo
                              }
                              )
                            </span>
                          </p>

                          <p
                            style={{
                              margin:
                                "0.35rem 0 0",

                              fontWeight:
                                700,

                              color:
                                voto.voto ===
                                "favor"
                                  ? "#356128"
                                  : "#8b2f2f",
                            }}
                          >
                            {voto.voto ===
                            "favor"
                              ? "A favor"
                              : "En contra"}
                          </p>

                          {voto.comentario && (
                            <p
                              style={{
                                marginBottom:
                                  0,

                                marginTop:
                                  "0.4rem",

                                lineHeight:
                                  1.6,
                              }}
                            >
                              {
                                voto.comentario
                              }
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* =================================================
                VOTACIÓN
                ================================================= */}

            {item.estado ===
              "pendiente" && (
              <VotacionAsimilacion
                asimilacionId={
                  item.id
                }
                userCodigo={
                  userCodigo
                }
                puedeVotar={
                  item.puede_votar
                }
                votosEmitidos={
                  item.votos_emitidos
                }
                totalConsejo={
                  item.total_consejo
                }
                votosFavor={
                  item.votos_favor
                }
                votosContra={
                  item.votos_contra
                }
                onActualizado={
                  cargar
                }
              />
            )}

            {/* =================================================
                SEGUIMIENTO
                ================================================= */}

            {(item.estado ===
              "aprobada" ||
              item.estado ===
                "invitacion_enviada" ||
              item.estado ===
                "aceptada") && (
              <div
                style={{
                  marginTop:
                    "1.5rem",

                  borderTop:
                    "1px solid #ddd4c7",

                  paddingTop:
                    "1.5rem",
                }}
              >
                <h4
                  style={{
                    marginTop:
                      0,
                  }}
                >
                  Seguimiento de la incorporación
                </h4>

                <div
                  style={{
                    display:
                      "grid",

                    gap:
                      "0.65rem",

                    marginTop:
                      "1rem",
                  }}
                >
                  <div>
                    ✅ Resolución emitida
                  </div>

                  <div>
                    {item.fecha_envio_invitacion
                      ? "✅"
                      : "○"}{" "}
                    Invitación enviada
                  </div>

                  <div>
                    {item.fecha_aceptacion
                      ? "✅"
                      : "○"}{" "}
                    Invitación aceptada
                  </div>

                  <div>
                    {item.fecha_incorporacion
                      ? "✅"
                      : "○"}{" "}
                    Incorporación completada
                  </div>
                </div>

                {/* =============================================
                    DATOS DE INVITACIÓN
                    ============================================= */}

                {item.fecha_envio_invitacion && (
                  <div
                    style={{
                      marginTop:
                        "1rem",

                      padding:
                        "1rem",

                      background:
                        "#eef6e9",

                      border:
                        "1px solid #cfe3c4",

                      borderRadius:
                        "10px",
                    }}
                  >
                    <p
                      style={{
                        margin:
                          0,

                        lineHeight:
                          1.7,
                      }}
                    >
                      <strong>
                        Invitación enviada:
                      </strong>{" "}
                      {formatearFecha(
                        item.fecha_envio_invitacion
                      )}
                    </p>

                    {item.invitacion_enviada_por_nombre && (
                      <p
                        style={{
                          margin:
                            "0.4rem 0 0",

                          lineHeight:
                            1.7,
                        }}
                      >
                        <strong>
                          Enviada por:
                        </strong>{" "}
                        {
                          item.invitacion_enviada_por_nombre
                        }
                      </p>
                    )}
                  </div>
                )}

                {item.codigo_asignado && (
                  <p
                    style={{
                      marginTop:
                        "0.8rem",
                    }}
                  >
                    <strong>
                      Código asignado:
                    </strong>{" "}
                    {
                      item.codigo_asignado
                    }
                  </p>
                )}

                {/* =============================================
                    ENVIAR INVITACIÓN
                    ============================================= */}

                {item.estado ===
                  "aprobada" && (
                  <>
                    <button
                      type="button"
                      disabled={
                        enviandoInvitacion ===
                        item.id
                      }
                      onClick={() =>
                        enviarInvitacion(
                          item.id
                        )
                      }
                      style={{
                        marginTop:
                          "1.2rem",

                        background:
                          "#6b6f1a",

                        color:
                          "white",

                        border:
                          "none",

                        borderRadius:
                          "8px",

                        padding:
                          "0.85rem 1.25rem",

                        cursor:
                          enviandoInvitacion ===
                          item.id
                            ? "not-allowed"
                            : "pointer",

                        fontWeight:
                          700,

                        opacity:
                          enviandoInvitacion ===
                          item.id
                            ? 0.7
                            : 1,
                      }}
                    >
                      {enviandoInvitacion ===
                      item.id
                        ? "Enviando invitación..."
                        : "Enviar invitación institucional"}
                    </button>

                    {/* =========================================
                        FALTA CORREO
                        ========================================= */}

                    {requiereCorreo ===
                      item.id && (
                      <div
                        style={{
                          marginTop:
                            "1rem",

                          padding:
                            "1rem",

                          background:
                            "#fff8e5",

                          border:
                            "1px solid #dfc46b",

                          borderRadius:
                            "10px",
                        }}
                      >
                        <strong>
                          No hay correo electrónico registrado.
                        </strong>

                        <p
                          style={{
                            lineHeight:
                              1.7,
                          }}
                        >
                          Indique el correo de la persona invitada para
                          continuar con el envío de la invitación
                          institucional.
                        </p>

                        <input
                          type="email"
                          value={
                            correoPendiente[
                              item.id
                            ] || ""
                          }
                          onChange={(
                            e
                          ) =>
                            setCorreoPendiente(
                              (
                                actual
                              ) => ({
                                ...actual,

                                [item.id]:
                                  e
                                    .target
                                    .value,
                              })
                            )
                          }
                          placeholder="correo@ejemplo.com"
                          style={{
                            width:
                              "100%",

                            maxWidth:
                              "500px",

                            padding:
                              "0.8rem",

                            border:
                              "1px solid #ccc",

                            borderRadius:
                              "8px",

                            boxSizing:
                              "border-box",
                          }}
                        />

                        <div
                          style={{
                            marginTop:
                              "0.8rem",
                          }}
                        >
                          <button
                            type="button"
                            disabled={
                              guardandoCorreo ===
                              item.id
                            }
                            onClick={() =>
                              guardarCorreoYEnviar(
                                item.id
                              )
                            }
                            style={{
                              background:
                                "#6b6f1a",

                              color:
                                "white",

                              border:
                                "none",

                              borderRadius:
                                "8px",

                              padding:
                                "0.8rem 1.1rem",

                              cursor:
                                guardandoCorreo ===
                                item.id
                                  ? "not-allowed"
                                  : "pointer",

                              fontWeight:
                                700,

                              opacity:
                                guardandoCorreo ===
                                item.id
                                  ? 0.7
                                  : 1,
                            }}
                          >
                            {guardandoCorreo ===
                            item.id
                              ? "Guardando..."
                              : "Guardar correo y enviar invitación"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* =============================================
                    INVITACIÓN ENVIADA
                    ============================================= */}

                {item.estado ===
                  "invitacion_enviada" && (
                  <div
                    style={{
                      marginTop:
                        "1rem",

                      background:
                        "#eef6e9",

                      border:
                        "1px solid #cfe3c4",

                      borderRadius:
                        "10px",

                      padding:
                        "1rem",

                      color:
                        "#356128",
                    }}
                  >
                    La invitación institucional ya fue enviada. El proceso
                    queda ahora pendiente de aceptación por parte de la
                    persona invitada.
                  </div>
                )}

                {/* =============================================
                    INVITACIÓN ACEPTADA
                    ============================================= */}

                {item.estado ===
                  "aceptada" &&
                  !item.fecha_incorporacion && (
                    <div
                      style={{
                        marginTop:
                          "1rem",

                        background:
                          "#eef6e9",

                        border:
                          "1px solid #cfe3c4",

                        borderRadius:
                          "10px",

                        padding:
                          "1rem",

                        color:
                          "#356128",
                      }}
                    >
                      La persona invitada ya aceptó la incorporación. El
                      proceso está pendiente de completar su registro
                      institucional.
                    </div>
                  )}
              </div>
            )}
          </div>
        )
      )}

      {/* =====================================================
          ACCESO AL HISTORIAL
          ===================================================== */}

      <div
        style={{
          marginTop:
            "0.75rem",

          background:
            "#faf8f3",

          border:
            "1px solid #ddd4c7",

          borderRadius:
            "12px",

          padding:
            "1.25rem 1.4rem",

          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap:
            "1rem",

          flexWrap:
            "wrap",
        }}
      >
        <div>
          <strong
            style={{
              display:
                "block",

              color:
                "#6b4f2a",

              marginBottom:
                "0.25rem",
            }}
          >
            Historial de incorporaciones
          </strong>

          <span
            style={{
              color:
                "#666",

              lineHeight:
                1.6,

              fontSize:
                "0.92rem",
            }}
          >
            Consulte las propuestas cuyo proceso ya ha concluido
            {totalHistorial > 0
              ? ` (${totalHistorial} ${
                  totalHistorial === 1
                    ? "expediente"
                    : "expedientes"
                }).`
              : "."}
          </span>
        </div>

        <Link
          href="/miembros/proceso-aprobacion/historial"
          style={{
            display:
              "inline-block",

            background:
              "#6b4f2a",

            color:
              "white",

            textDecoration:
              "none",

            borderRadius:
              "8px",

            padding:
              "0.8rem 1.1rem",

            fontWeight:
              700,

            whiteSpace:
              "nowrap",
          }}
        >
          Ver historial →
        </Link>
      </div>
    </div>
  );
}