"use client";

import { useEffect, useState } from "react";

type EstadoMiembro =
  | "ACTIVO"
  | "SUSPENDIDO"
  | "RETIRADO"
  | "EXPULSADO";

type Miembro = {
  codigo: string;
  nombre: string;
  nivel: string;
  consejo: boolean;
  administrador: boolean;
  estado_miembro: EstadoMiembro;
};

type User = {
  codigo: string;
  administrador?: boolean | string | number;
};

export default function AdministracionPage() {
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [procesando, setProcesando] = useState<string | null>(
    null
  );

  const obtenerUsuario = (): User | null => {
    try {
      const stored = localStorage.getItem("user");

      if (!stored) return null;

      return JSON.parse(stored);
    } catch {
      return null;
    }
  };

  const cargarMiembros = async () => {
    const user = obtenerUsuario();

    if (!user?.codigo) {
      setError("No fue posible identificar al usuario.");
      setCargando(false);
      return;
    }

    try {
      setError("");

      const response = await fetch(
        "/api/administracion/miembros",
        {
          headers: {
            "x-user-codigo": user.codigo,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(
          result.error ||
            "No fue posible obtener los miembros."
        );
        return;
      }

      setMiembros(result.miembros || []);
    } catch {
      setError(
        "No fue posible conectar con el servidor."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMiembros();
  }, []);

  const cambiarEstado = async (
    miembro: Miembro,
    estadoNuevo: EstadoMiembro
  ) => {
    const user = obtenerUsuario();

    if (!user?.codigo) {
      alert("No fue posible identificar al administrador.");
      return;
    }

    const acciones: Record<EstadoMiembro, string> = {
      ACTIVO: "reactivar",
      SUSPENDIDO: "suspender",
      RETIRADO: "retirar",
      EXPULSADO: "expulsar",
    };

    const accion = acciones[estadoNuevo];

    const confirmado = window.confirm(
      `¿Confirma que desea ${accion} a ${miembro.nombre} (${miembro.codigo})?`
    );

    if (!confirmado) return;

    const motivo = window.prompt(
      estadoNuevo === "ACTIVO"
        ? "Indique el motivo de la reactivación:"
        : `Indique el motivo para ${accion} al miembro:`
    );

    if (motivo === null) return;

    if (!motivo.trim()) {
      alert("Debe indicar un motivo.");
      return;
    }

    try {
      setProcesando(miembro.codigo);

      const response = await fetch(
        `/api/administracion/miembros/${miembro.codigo}/estado`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-codigo": user.codigo,
          },
          body: JSON.stringify({
            estado: estadoNuevo,
            motivo: motivo.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        alert(
          result.error ||
            "No fue posible cambiar el estado."
        );
        return;
      }

      setMiembros((actuales) =>
        actuales.map((item) =>
          item.codigo === miembro.codigo
            ? {
                ...item,
                estado_miembro: estadoNuevo,
              }
            : item
        )
      );

      alert(
        `El estado de ${miembro.nombre} fue actualizado correctamente.`
      );
    } catch {
      alert(
        "No fue posible conectar con el servidor."
      );
    } finally {
      setProcesando(null);
    }
  };

  const etiquetaEstado = (estado: EstadoMiembro) => {
    switch (estado) {
      case "ACTIVO":
        return "Activo";
      case "SUSPENDIDO":
        return "Suspendido";
      case "RETIRADO":
        return "Retirado";
      case "EXPULSADO":
        return "Expulsado";
      default:
        return estado;
    }
  };

  const miembrosFiltrados = miembros.filter((miembro) => {
    const texto = busqueda.trim().toLowerCase();

    const coincideBusqueda =
      !texto ||
      miembro.nombre.toLowerCase().includes(texto) ||
      miembro.codigo.toLowerCase().includes(texto);

    const coincideNivel =
      filtroNivel === "TODOS" ||
      miembro.nivel === filtroNivel;

    const coincideEstado =
      filtroEstado === "TODOS" ||
      miembro.estado_miembro === filtroEstado;

    return (
      coincideBusqueda &&
      coincideNivel &&
      coincideEstado
    );
  });

  if (cargando) {
    return <p>Cargando administración...</p>;
  }

  return (
    <section>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h1>Administración de miembros</h1>

        <p
          style={{
            marginBottom: "2rem",
            color: "#555",
            lineHeight: 1.6,
          }}
        >
          Desde esta sección puede gestionar el estado
          institucional de los miembros de AGENN. Los cambios
          quedan registrados en el historial administrativo.
        </p>

        <div
          style={{
            marginBottom: "1.5rem",
            padding: "1rem",
            border: "1px solid #ddd4c7",
            borderRadius: "10px",
            background: "#f7f5ef",
          }}
        >
          <strong>Certificados</strong>
          <p style={{ margin: "0.35rem 0 0.75rem", color: "#666" }}>
            Administre las versiones históricas de las plantillas y defina cuál se utilizará para nuevas emisiones.
          </p>
          <a
            href="/miembros/administracion/plantillas-certificados"
            style={{ color: "#526b5c", fontWeight: 700 }}
          >
            Administrar plantillas de certificados →
          </a>
        </div>

        {error && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "1.5rem",
              border: "1px solid #b94a48",
              borderRadius: "8px",
              background: "#fff",
            }}
          >
            {error}
          </div>
        )}

        {!error && miembros.length === 0 && (
          <p>No hay miembros registrados.</p>
        )}

        {!error && miembros.length > 0 && (
          <>
            {/* Filtros */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <input
                type="text"
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
                placeholder="Buscar por nombre o código..."
                style={{
                  flex: "1 1 280px",
                  padding: "0.7rem 0.8rem",
                  border: "1px solid #ddd4c7",
                  borderRadius: "7px",
                  fontFamily: "inherit",
                  fontSize: "0.95rem",
                }}
              />

              <select
                value={filtroNivel}
                onChange={(e) =>
                  setFiltroNivel(e.target.value)
                }
                style={selectStyle}
              >
                <option value="TODOS">
                  Todos los niveles
                </option>
                <option value="ASP">Aspirantes</option>
                <option value="NOV">Novicios</option>
                <option value="INV">
                  Investigadores
                </option>
                <option value="NUM">Numerarios</option>
              </select>

              <select
                value={filtroEstado}
                onChange={(e) =>
                  setFiltroEstado(e.target.value)
                }
                style={selectStyle}
              >
                <option value="TODOS">
                  Todos los estados
                </option>
                <option value="ACTIVO">Activos</option>
                <option value="SUSPENDIDO">
                  Suspendidos
                </option>
                <option value="RETIRADO">
                  Retirados
                </option>
                <option value="EXPULSADO">
                  Expulsados
                </option>
              </select>
            </div>

            {/* Cantidad de resultados */}
            <div
              style={{
                marginBottom: "0.75rem",
                fontSize: "0.85rem",
                color: "#777",
              }}
            >
              Mostrando {miembrosFiltrados.length} de{" "}
              {miembros.length} miembros
            </div>

            {miembrosFiltrados.length === 0 ? (
              <div
                style={{
                  padding: "1.5rem",
                  border: "1px solid #ddd4c7",
                  borderRadius: "10px",
                  background: "white",
                  textAlign: "center",
                  color: "#666",
                }}
              >
                No hay miembros que coincidan con los filtros
                seleccionados.
              </div>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  background: "white",
                  border: "1px solid #ddd4c7",
                  borderRadius: "10px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "850px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#6f8760",
                        color: "white",
                      }}
                    >
                      <th style={thStyle}>Código</th>
                      <th style={thStyle}>Nombre</th>
                      <th style={thStyle}>Nivel</th>
                      <th style={thStyle}>Estado</th>
                      <th style={thStyle}>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {miembrosFiltrados.map((miembro) => {
                      const esElAdministrador =
                        miembro.administrador === true;

                      const deshabilitado =
                        procesando === miembro.codigo;

                      return (
                        <tr
                          key={miembro.codigo}
                          style={{
                            borderBottom:
                              "1px solid #eee8df",
                          }}
                        >
                          <td style={tdStyle}>
                            {miembro.codigo}
                          </td>

                          <td style={tdStyle}>
                            <strong>
                              {miembro.nombre}
                            </strong>

                            {esElAdministrador && (
                              <div
                                style={{
                                  marginTop: "0.25rem",
                                  fontSize: "0.78rem",
                                  color: "#6f8760",
                                  fontWeight: 700,
                                }}
                              >
                                Administrador
                              </div>
                            )}
                          </td>

                          <td style={tdStyle}>
                            {miembro.nivel}
                          </td>

                          <td style={tdStyle}>
                            <span
                              style={{
                                display: "inline-block",
                                padding:
                                  "0.3rem 0.6rem",
                                borderRadius: "999px",
                                background:
                                  miembro.estado_miembro ===
                                  "ACTIVO"
                                    ? "#e8f0e3"
                                    : "#f1ece5",
                                fontWeight: 600,
                                fontSize: "0.85rem",
                              }}
                            >
                              {etiquetaEstado(
                                miembro.estado_miembro
                              )}
                            </span>
                          </td>

                          <td style={tdStyle}>
                            {esElAdministrador ? (
                              <span
                                style={{
                                  color: "#777",
                                  fontSize: "0.85rem",
                                }}
                              >
                                Sin acciones disponibles
                              </span>
                            ) : miembro.estado_miembro ===
                              "ACTIVO" ? (
                              <div style={accionesStyle}>
                                <button
                                  type="button"
                                  disabled={deshabilitado}
                                  onClick={() =>
                                    cambiarEstado(
                                      miembro,
                                      "SUSPENDIDO"
                                    )
                                  }
                                  style={botonStyle}
                                >
                                  Suspender
                                </button>

                                <button
                                  type="button"
                                  disabled={deshabilitado}
                                  onClick={() =>
                                    cambiarEstado(
                                      miembro,
                                      "RETIRADO"
                                    )
                                  }
                                  style={botonStyle}
                                >
                                  Retirar
                                </button>

                                <button
                                  type="button"
                                  disabled={deshabilitado}
                                  onClick={() =>
                                    cambiarEstado(
                                      miembro,
                                      "EXPULSADO"
                                    )
                                  }
                                  style={botonPeligroStyle}
                                >
                                  Expulsar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={deshabilitado}
                                onClick={() =>
                                  cambiarEstado(
                                    miembro,
                                    "ACTIVO"
                                  )
                                }
                                style={botonStyle}
                              >
                                Reactivar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.9rem 1rem",
  fontSize: "0.9rem",
};

const tdStyle: React.CSSProperties = {
  padding: "0.9rem 1rem",
  verticalAlign: "middle",
};

const accionesStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.45rem",
};

const selectStyle: React.CSSProperties = {
  padding: "0.7rem 0.8rem",
  border: "1px solid #ddd4c7",
  borderRadius: "7px",
  background: "white",
  fontFamily: "inherit",
  fontSize: "0.95rem",
};

const botonStyle: React.CSSProperties = {
  border: "1px solid #6f8760",
  background: "white",
  color: "#4f6544",
  padding: "0.45rem 0.7rem",
  borderRadius: "6px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const botonPeligroStyle: React.CSSProperties = {
  ...botonStyle,
  border: "1px solid #9b4b43",
  color: "#8b3e37",
};