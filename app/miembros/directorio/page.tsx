"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./directorio.module.css";

type Miembro = {
  id: number;
  codigo: string;
  nombre: string;
  nivel: string;
  foto_url: string | null;
  fecha_nacimiento: string | null;
  profesion: string | null;
  bio: string | null;

  estado_academico?: string | null;
  origen_acreditacion?: string | null;

  avanceAcademico?: number;
};

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;

  estado_academico?: string | null;
  origen_acreditacion?: string | null;
};

export default function DirectorioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    let parsedUser: User;

    try {
      const original = JSON.parse(stored);

      parsedUser = {
        ...original,

        codigo: String(original.codigo || "")
          .trim()
          .toUpperCase(),

        nivel: String(original.nivel || "")
          .trim()
          .toUpperCase(),

        nombre: String(original.nombre || "").trim(),

        estado_academico: original.estado_academico
          ? String(original.estado_academico)
              .trim()
              .toUpperCase()
          : null,

        origen_acreditacion: original.origen_acreditacion
          ? String(original.origen_acreditacion)
              .trim()
              .toUpperCase()
          : null,
      };
    } catch {
      localStorage.removeItem("user");
      window.location.href = "/login";
      return;
    }

    setUser(parsedUser);

    const cargarMiembros = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/directorio", {
          headers: {
            "x-user-codigo": parsedUser.codigo,
          },
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ||
              "No fue posible cargar el directorio."
          );
        }

        setMiembros(result.miembros || []);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar el directorio."
        );
      } finally {
        setLoading(false);
      }
    };

    cargarMiembros();
  }, []);

  if (loading) {
    return <div>Cargando directorio...</div>;
  }

  if (error) {
    return (
      <div style={{ color: "red" }}>
        Error: {error}
      </div>
    );
  }

  if (!user) {
    return <div>Cargando usuario...</div>;
  }

  // ---------------------------------------------------------
  // NIVELES VISIBLES
  // ---------------------------------------------------------

  let visibles: string[] = [];

  switch (user.nivel) {
    case "NUM":
      visibles = ["NUM", "INV", "NOV", "ASP"];
      break;

    case "INV":
      if (user.estado_academico === "ACREDITADO") {
        visibles = ["NUM", "INV", "NOV", "ASP"];
      } else {
        visibles = ["INV", "NOV", "ASP"];
      }
      break;

    case "NOV":
      visibles = ["NOV", "ASP"];
      break;

    case "ASP":
      visibles = ["ASP"];
      break;

    default:
      visibles = [];
  }

  const nombreNivel: Record<string, string> = {
    NUM: "Académico Numerario",
    INV: "Académico Investigador",
    NOV: "Académico Novicio",
    ASP: "Aspirante",
  };

  const miembrosFiltrados = miembros.filter((m) =>
    visibles.includes(m.nivel)
  );

  const numerarios = miembrosFiltrados.filter(
    (m) => m.nivel === "NUM"
  );

  const investigadoresAcreditados =
    miembrosFiltrados.filter(
      (m) =>
        m.nivel === "INV" &&
        String(m.estado_academico || "")
          .trim()
          .toUpperCase() === "ACREDITADO"
    );

  const investigadoresEnFormacion =
    miembrosFiltrados.filter(
      (m) =>
        m.nivel === "INV" &&
        String(m.estado_academico || "")
          .trim()
          .toUpperCase() !== "ACREDITADO"
    );

  const novicios = miembrosFiltrados.filter(
    (m) => m.nivel === "NOV"
  );

  const aspirantes = miembrosFiltrados.filter(
    (m) => m.nivel === "ASP"
  );

  // ---------------------------------------------------------
  // ETIQUETA ESPECIAL PARA INVESTIGADORES
  // ---------------------------------------------------------

  const descripcionInvestigador = (
    miembro: Miembro
  ) => {
    const estado = String(
      miembro.estado_academico || ""
    )
      .trim()
      .toUpperCase();

    const origen = String(
      miembro.origen_acreditacion || ""
    )
      .trim()
      .toUpperCase();

    if (estado === "ACREDITADO") {
      if (origen === "FORMACION") {
        return {
          titulo: "Investigador acreditado",
          detalle:
            "Acreditación obtenida mediante formación",
        };
      }

      if (origen === "RECONOCIMIENTO") {
        return {
          titulo: "Investigador acreditado",
          detalle:
            "Acreditación otorgada por reconocimiento académico",
        };
      }

      return {
        titulo: "Investigador acreditado",
        detalle: "Acreditación vigente",
      };
    }

    return {
      titulo: "Investigador en formación",
      detalle: null,
    };
  };

  // ---------------------------------------------------------
  // RENDER DE GRUPOS
  // ---------------------------------------------------------

  const renderGrupo = (
    titulo: string,
    lista: Miembro[]
  ) => {
    if (lista.length === 0) return null;

    return (
      <section
        style={{
          marginBottom: "2.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.35rem",
            marginBottom: "1rem",
          }}
        >
          {titulo}
        </h2>

        <div className={styles.gridDirectorio}>
          {lista.map((miembro) => {
            const esInvestigador =
              miembro.nivel === "INV";

            const infoInvestigador =
              esInvestigador
                ? descripcionInvestigador(miembro)
                : null;

            const esInvAcreditado =
              esInvestigador &&
              String(
                miembro.estado_academico || ""
              )
                .trim()
                .toUpperCase() ===
                "ACREDITADO";

            return (
              <Link
                key={miembro.id}
                href={`/miembros/directorio/${miembro.codigo}`}
                className={styles.tarjetaMiembro}
                style={{
                  display: "block",
                  border: "1px solid #ddd",
                  borderRadius: "14px",
                  padding: "12px",
                  background: "#fff",
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow:
                    "0 2px 6px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  className={styles.fotoMiembro}
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "818 / 1082",
                    marginBottom: "12px",
                    overflow: "hidden",
                    borderRadius: "10px",
                    background: "#f3f3f3",
                  }}
                >
                  <img
                    src={
                      miembro.foto_url ||
                      "/placeholder-miembro.jpg"
                    }
                    alt={miembro.nombre}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />

                  <img
                    src="/marcos/marco-miembro.png"
                    alt="Marco"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      pointerEvents: "none",
                    }}
                  />
                </div>

                <h3
                  className={styles.nombreMiembro}
                  style={{
                    fontSize: "15px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                    lineHeight: 1.3,
                  }}
                >
                  {miembro.nombre}
                </h3>

                <p
                  className={styles.codigoMiembro}
                  style={{
                    margin: "0 0 4px 0",
                    color: "#666",
                    fontSize: "0.9rem",
                  }}
                >
                  {miembro.codigo}
                </p>

                <p
                  className={styles.nivelMiembro}
                  style={{
                    margin: 0,
                    color: "#444",
                    fontSize: "0.88rem",
                  }}
                >
                  <span className={styles.nivelCompleto}>
                    {nombreNivel[miembro.nivel] || miembro.nivel}
                  </span>
                  <span className={styles.nivelAbreviado}>
                    {miembro.nivel}
                  </span>
                </p>

                {esInvestigador &&
                  infoInvestigador && (
                    <div
                      className={styles.infoInvestigador}
                      style={{
                        marginTop: "8px",
                        padding: "8px 9px",
                        background:
                          esInvAcreditado
                            ? "#eef6e9"
                            : "#faf8f3",
                        border:
                          esInvAcreditado
                            ? "1px solid #cfe3c4"
                            : "1px solid #e2dbcf",
                        borderRadius: "8px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          color:
                            esInvAcreditado
                              ? "#356128"
                              : "#6b4f2a",
                        }}
                      >
                        {esInvAcreditado
                          ? "✓ "
                          : ""}
                        {
                          infoInvestigador.titulo
                        }
                      </div>

                      {infoInvestigador.detalle && (
                        <div
                          style={{
                            marginTop: "3px",
                            fontSize: "0.75rem",
                            lineHeight: 1.4,
                            color: "#666",
                          }}
                        >
                          {
                            infoInvestigador.detalle
                          }
                        </div>
                      )}
                    </div>
                  )}

                {["ASP", "NOV"].includes(
                  miembro.nivel
                ) && (
                  <div
                    className={styles.progresoMiembro}
                    style={{
                      marginTop: "10px",
                    }}
                  >
                    <div
                      className={styles.progresoEncabezado}
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        marginBottom: "4px",
                        fontSize: "0.78rem",
                        color: "#666",
                      }}
                    >
                      <span>
                        Avance académico
                      </span>

                      <span>
                        {miembro.avanceAcademico ||
                          0}
                        %
                      </span>
                    </div>

                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        background: "#e5e5e5",
                        borderRadius: "999px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${
                            miembro.avanceAcademico ||
                            0
                          }%`,
                          height: "100%",
                          background: "#6f8760",
                        }}
                      />
                    </div>
                  </div>
                )}

                {miembro.nivel === "INV" &&
                  !esInvAcreditado && (
                    <div
                      style={{
                        marginTop: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          marginBottom: "4px",
                          fontSize: "0.78rem",
                          color: "#666",
                        }}
                      >
                        <span>
                          Avance académico
                        </span>

                        <span>
                          {miembro.avanceAcademico ||
                            0}
                          %
                        </span>
                      </div>

                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          background: "#e5e5e5",
                          borderRadius: "999px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${
                              miembro.avanceAcademico ||
                              0
                            }%`,
                            height: "100%",
                            background: "#6f8760",
                          }}
                        />
                      </div>
                    </div>
                  )}
              </Link>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div>
      <h1
        style={{
          fontSize: "2rem",
          marginBottom: "2rem",
        }}
      >
        Directorio
      </h1>

      {renderGrupo(
        "Directorio de miembros Académicos Numerarios",
        numerarios
      )}

      {renderGrupo(
        "Directorio de Académicos Investigadores acreditados",
        investigadoresAcreditados
      )}

      {renderGrupo(
        "Directorio de Académicos Investigadores en formación",
        investigadoresEnFormacion
      )}

      {renderGrupo(
        "Directorio de miembros Académicos Novicios",
        novicios
      )}

      {renderGrupo(
        "Directorio de Candidatos o Aspirantes",
        aspirantes
      )}
    </div>
  );
}