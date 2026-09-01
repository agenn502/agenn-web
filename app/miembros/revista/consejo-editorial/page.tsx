"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type RegistroCE = {
  id: number;
  miembro_id: number;
  rol: "DIRECTOR" | "EDITOR" | "MIEMBRO";
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at: string;
  miembros:
    | {
        codigo: string;
        nombre: string;
        nivel: string;
        estado_academico: string | null;
      }
    | {
        codigo: string;
        nombre: string;
        nivel: string;
        estado_academico: string | null;
      }[]
    | null;
};

type Elegible = {
  id: number;
  codigo: string;
  nombre: string;
  nivel: string;
  estado_academico: string | null;
};

type Solicitante = {
  codigo: string;
  nombre: string;
  rol: "DIRECTOR" | "EDITOR" | "MIEMBRO";
};

function obtenerMiembro(registro: RegistroCE) {
  if (Array.isArray(registro.miembros)) {
    return registro.miembros[0] || null;
  }

  return registro.miembros;
}

function fecha(fechaIso: string | null) {
  if (!fechaIso) return "—";

  try {
    return new Intl.DateTimeFormat("es-GT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(fechaIso));
  } catch {
    return fechaIso;
  }
}

function etiquetaRol(rol: string) {
  if (rol === "DIRECTOR") return "Director";
  if (rol === "EDITOR") return "Editor";
  return "Miembro";
}

export default function ConsejoEditorialPage() {
  const [solicitante, setSolicitante] = useState<Solicitante | null>(null);
  const [registros, setRegistros] = useState<RegistroCE[]>([]);
  const [elegibles, setElegibles] = useState<Elegible[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const [nuevoMiembroId, setNuevoMiembroId] = useState("");
  const [nuevoRol, setNuevoRol] =
    useState<"DIRECTOR" | "EDITOR" | "MIEMBRO">("MIEMBRO");

  const obtenerCodigoLocal = () => {
    const stored = localStorage.getItem("user");

    if (!stored) return "";

    try {
      const user = JSON.parse(stored);
      return String(user.codigo || "").trim().toUpperCase();
    } catch {
      return "";
    }
  };

  const cargar = useCallback(async () => {
    const codigo = obtenerCodigoLocal();

    if (!codigo) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/revista/consejo-editorial", {
        headers: {
          "x-user-codigo": codigo,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "No fue posible cargar el Consejo Editorial."
        );
      }

      setSolicitante(result.solicitante);
      setRegistros(result.registros || []);
      setElegibles(result.elegibles || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el Consejo Editorial."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const activos = useMemo(
    () => registros.filter((r) => r.activo),
    [registros]
  );

  const historicos = useMemo(
    () => registros.filter((r) => !r.activo),
    [registros]
  );

  const esDirector = solicitante?.rol === "DIRECTOR";

  const agregarMiembro = async () => {
    if (
      !nuevoMiembroId ||
      !confirm("¿Desea incorporar a este miembro al Consejo Editorial?")
    ) {
      return;
    }

    const codigo = obtenerCodigoLocal();

    setProcesando(true);
    setError("");

    try {
      const response = await fetch("/api/revista/consejo-editorial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": codigo,
        },
        body: JSON.stringify({
          miembro_id: Number(nuevoMiembroId),
          rol: nuevoRol,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "No fue posible incorporar al miembro."
        );
      }

      setNuevoMiembroId("");
      setNuevoRol("MIEMBRO");
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible incorporar al miembro."
      );
    } finally {
      setProcesando(false);
    }
  };

  const cambiarRol = async (
    registro: RegistroCE,
    rol: "DIRECTOR" | "EDITOR" | "MIEMBRO"
  ) => {
    if (registro.rol === rol) return;

    const miembro = obtenerMiembro(registro);

    if (
      !confirm(
        `¿Cambiar el rol de ${miembro?.nombre || "este integrante"} a ${etiquetaRol(rol)}?`
      )
    ) {
      return;
    }

    const codigo = obtenerCodigoLocal();

    setProcesando(true);
    setError("");

    try {
      const response = await fetch("/api/revista/consejo-editorial", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": codigo,
        },
        body: JSON.stringify({
          id: registro.id,
          accion: "CAMBIAR_ROL",
          rol,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "No fue posible cambiar el rol.");
      }

      await cargar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible cambiar el rol."
      );
    } finally {
      setProcesando(false);
    }
  };

  const retirar = async (registro: RegistroCE) => {
    const miembro = obtenerMiembro(registro);

    if (
      !confirm(
        `¿Retirar a ${
          miembro?.nombre || "este integrante"
        } del Consejo Editorial? Su participación quedará conservada en el historial.`
      )
    ) {
      return;
    }

    const codigo = obtenerCodigoLocal();

    setProcesando(true);
    setError("");

    try {
      const response = await fetch("/api/revista/consejo-editorial", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": codigo,
        },
        body: JSON.stringify({
          id: registro.id,
          accion: "RETIRAR",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "No fue posible retirar al integrante."
        );
      }

      await cargar();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible retirar al integrante."
      );
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return <p>Cargando Consejo Editorial...</p>;
  }

  if (error && !solicitante) {
    return (
      <div style={{ maxWidth: "900px" }}>
        <h1>Consejo Editorial</h1>

        <div
          style={{
            background: "#fff3f3",
            border: "1px solid #d28b8b",
            borderRadius: "10px",
            padding: "1rem",
            color: "#7a1f1f",
          }}
        >
          {error}
        </div>

        <Link
          href="/miembros/revista"
          style={{
            display: "inline-block",
            marginTop: "1rem",
            color: "#4d371c",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ← Volver a Revista AGENN
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1100px" }}>
      <p
        style={{
          margin: "0 0 0.4rem 0",
          fontSize: "0.82rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "#6b6f1a",
          fontWeight: 700,
        }}
      >
        Revista AGENN
      </p>

      <h1 style={{ marginTop: 0, color: "#4d371c" }}>
        Consejo Editorial
      </h1>

      <p
        style={{
          maxWidth: "900px",
          lineHeight: 1.8,
          color: "#555",
        }}
      >
        El Consejo Editorial es responsable de la selección, revisión y aval
        de los manuscritos que podrán ser publicados en Revista AGENN. Su
        integración es independiente del Consejo Académico.
      </p>

      {solicitante && (
        <div
          style={{
            background: "#eef6e9",
            border: "1px solid #cfe3c4",
            borderRadius: "10px",
            padding: "0.9rem 1rem",
            marginBottom: "1.5rem",
          }}
        >
          <strong>{solicitante.nombre}</strong>
          <br />
          {solicitante.codigo} · {etiquetaRol(solicitante.rol)} del Consejo Editorial
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fff3f3",
            border: "1px solid #d28b8b",
            borderRadius: "10px",
            padding: "1rem",
            color: "#7a1f1f",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      {esDirector && (
        <section
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "14px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#4d371c" }}>
            Incorporar integrante
          </h2>

          <p style={{ lineHeight: 1.7, color: "#555" }}>
            Pueden formar parte del Consejo Editorial los miembros Numerarios
            y los Investigadores acreditados de AGENN.
          </p>

          {elegibles.length === 0 ? (
            <p style={{ color: "#666" }}>
              No hay otros miembros elegibles disponibles para incorporar en
              este momento.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(260px, 1fr) minmax(160px, 220px) auto",
                gap: "0.8rem",
                alignItems: "end",
              }}
            >
              <div>
                <label>
                  <strong>Miembro</strong>
                </label>

                <select
                  value={nuevoMiembroId}
                  disabled={procesando}
                  onChange={(e) => setNuevoMiembroId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    marginTop: "0.4rem",
                  }}
                >
                  <option value="">Seleccione un miembro</option>

                  {elegibles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} · {item.codigo} · {item.nivel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>
                  <strong>Rol</strong>
                </label>

                <select
                  value={nuevoRol}
                  disabled={procesando}
                  onChange={(e) =>
                    setNuevoRol(
                      e.target.value as "DIRECTOR" | "EDITOR" | "MIEMBRO"
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    marginTop: "0.4rem",
                  }}
                >
                  <option value="MIEMBRO">Miembro</option>
                  <option value="EDITOR">Editor</option>
                  <option value="DIRECTOR">Director</option>
                </select>
              </div>

              <button
                type="button"
                onClick={agregarMiembro}
                disabled={procesando || !nuevoMiembroId}
                style={{
                  background: "#6b6f1a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.8rem 1rem",
                  cursor:
                    procesando || !nuevoMiembroId ? "not-allowed" : "pointer",
                  opacity:
                    procesando || !nuevoMiembroId ? 0.65 : 1,
                  fontWeight: 700,
                }}
              >
                Incorporar
              </button>
            </div>
          )}
        </section>
      )}

      <section
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "14px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#4d371c" }}>
          Integración actual
        </h2>

        {activos.length === 0 ? (
          <p>No hay integrantes activos.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.8rem" }}>
            {activos.map((registro) => {
              const integrante = obtenerMiembro(registro);

              return (
                <div
                  key={registro.id}
                  style={{
                    border: "1px solid #e2dbcf",
                    borderRadius: "10px",
                    padding: "1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>
                      {integrante?.nombre || "Miembro no identificado"}
                    </strong>

                    <div style={{ color: "#666", marginTop: "0.25rem" }}>
                      {integrante?.codigo} · {integrante?.nivel}
                    </div>

                    <div
                      style={{
                        color: "#777",
                        marginTop: "0.25rem",
                        fontSize: "0.88rem",
                      }}
                    >
                      Desde {fecha(registro.fecha_inicio)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.6rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {esDirector ? (
                      <select
                        value={registro.rol}
                        disabled={procesando}
                        onChange={(e) =>
                          cambiarRol(
                            registro,
                            e.target.value as
                              | "DIRECTOR"
                              | "EDITOR"
                              | "MIEMBRO"
                          )
                        }
                        style={{
                          padding: "0.55rem",
                        }}
                      >
                        <option value="DIRECTOR">Director</option>
                        <option value="EDITOR">Editor</option>
                        <option value="MIEMBRO">Miembro</option>
                      </select>
                    ) : (
                      <span
                        style={{
                          background: "#eef6e9",
                          color: "#356128",
                          borderRadius: "999px",
                          padding: "0.35rem 0.65rem",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                        }}
                      >
                        {etiquetaRol(registro.rol)}
                      </span>
                    )}

                    {esDirector && (
                      <button
                        type="button"
                        disabled={procesando}
                        onClick={() => retirar(registro)}
                        style={{
                          background: "white",
                          color: "#8b2f2f",
                          border: "1px solid #d8aaaa",
                          borderRadius: "8px",
                          padding: "0.55rem 0.75rem",
                          cursor: procesando ? "wait" : "pointer",
                        }}
                      >
                        Retirar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section
        style={{
          background: "#faf8f2",
          border: "1px solid #ddd4c7",
          borderRadius: "14px",
          padding: "1.5rem",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#4d371c" }}>
          Historial del Consejo Editorial
        </h2>

        {historicos.length === 0 ? (
          <p style={{ color: "#666", marginBottom: 0 }}>
            Todavía no existen integrantes históricos.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Miembro</th>
                  <th style={th}>Rol</th>
                  <th style={th}>Inicio</th>
                  <th style={th}>Fin</th>
                </tr>
              </thead>

              <tbody>
                {historicos.map((registro) => {
                  const integrante = obtenerMiembro(registro);

                  return (
                    <tr key={registro.id}>
                      <td style={td}>
                        <strong>{integrante?.nombre}</strong>
                        <br />
                        <span
                          style={{
                            color: "#777",
                            fontSize: "0.85rem",
                          }}
                        >
                          {integrante?.codigo}
                        </span>
                      </td>
                      <td style={td}>{etiquetaRol(registro.rol)}</td>
                      <td style={td}>{fecha(registro.fecha_inicio)}</td>
                      <td style={td}>{fecha(registro.fecha_fin)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Link
        href="/miembros/revista"
        style={{
          display: "inline-block",
          marginTop: "1.5rem",
          color: "#4d371c",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        ← Volver a Revista AGENN
      </Link>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "0.75rem",
  borderBottom: "2px solid #ddd4c7",
  color: "#4d371c",
};

const td: React.CSSProperties = {
  padding: "0.75rem",
  borderBottom: "1px solid #e8e1d7",
  verticalAlign: "top",
};
