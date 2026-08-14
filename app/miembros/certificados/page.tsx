"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Certificado = {
  id: string;
  registro: string;
  codigo_miembro: string;
  nombre: string;
  nivel: "NOV" | "INV" | "NUM";
  origen_acreditacion: "FORMACION" | "RECONOCIMIENTO";
  fecha_emision: string;
  estado: string;
  created_at: string;
};

type User = {
  codigo: string;
  nombre: string;
  nivel: string;
  consejo?: boolean | string | number;
  estado_academico?: string | null;
  origen_acreditacion?: string | null;
};

export default function CertificadosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarCertificados = async (codigo: string) => {
    const response = await fetch("/api/certificados", {
      headers: {
        "x-user-codigo": codigo,
      },
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(
        result.error || "No fue posible cargar los certificados."
      );
    }

    setCertificados(result.certificados || []);
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        setError("");

        const stored = localStorage.getItem("user");

        if (!stored) {
          window.location.href = "/login";
          return;
        }

        const parsed = JSON.parse(stored) as User;

        const usuarioNormalizado: User = {
          ...parsed,
          codigo: String(parsed.codigo || "")
            .trim()
            .toUpperCase(),
          nivel: String(parsed.nivel || "")
            .trim()
            .toUpperCase(),
          estado_academico: parsed.estado_academico
            ? String(parsed.estado_academico)
                .trim()
                .toUpperCase()
            : null,
          origen_acreditacion: parsed.origen_acreditacion
            ? String(parsed.origen_acreditacion)
                .trim()
                .toUpperCase()
            : null,
        };

        setUser(usuarioNormalizado);

        await cargarCertificados(usuarioNormalizado.codigo);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar los certificados."
        );
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const nombreNivel = (nivel: string) => {
    if (nivel === "NOV") return "Académico Novicio";
    if (nivel === "INV") return "Académico Investigador";
    if (nivel === "NUM") return "Académico Numerario";

    return nivel;
  };

  const nombreOrigen = (origen: string) => {
    if (origen === "FORMACION") {
      return "Acreditación obtenida mediante formación";
    }

    if (origen === "RECONOCIMIENTO") {
      return "Acreditación otorgada por trayectoria reconocida";
    }

    return origen;
  };

  const formatearFecha = (fecha: string) => {
    try {
      return new Intl.DateTimeFormat("es-GT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(fecha));
    } catch {
      return fecha;
    }
  };

  const puedeGenerarCertificadoINV =
    user?.nivel === "INV" &&
    user?.estado_academico === "ACREDITADO";

  const tieneCertificadoINV = certificados.some(
    (certificado) => certificado.nivel === "INV"
  );

  const generarCertificadoInvestigador = async () => {
    if (!user) return;

    setGenerando(true);
    setError("");
    setMensaje("");

    try {
      const origen =
        user.origen_acreditacion === "RECONOCIMIENTO"
          ? "RECONOCIMIENTO"
          : "FORMACION";

      const response = await fetch(
        "/api/certificados/generar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            codigo: user.codigo,
            nivel: "INV",
            origen_acreditacion: origen,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "No fue posible generar el certificado."
        );
      }

      if (result.yaExistia) {
        setMensaje(
          "El certificado de Académico Investigador ya había sido generado."
        );
      } else {
        setMensaje(
          `Certificado generado correctamente. Registro: ${result.certificado.registro}`
        );
      }

      await cargarCertificados(user.codigo);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible generar el certificado."
      );
    } finally {
      setGenerando(false);
    }
  };

  if (loading) {
    return <div>Cargando certificados...</div>;
  }

  if (!user) {
    return <div>Cargando usuario...</div>;
  }

  return (
    <div
      style={{
        maxWidth: "980px",
      }}
    >
      <h1 style={{ marginTop: 0 }}>
        Certificados
      </h1>

      <p
        style={{
          lineHeight: 1.8,
          maxWidth: "760px",
        }}
      >
        En esta sección puede consultar los certificados
        académicos emitidos por la Academia Guatemalteca de
        Estudios Numismáticos y Notafílicos a su nombre.
      </p>

      <p
        style={{
          lineHeight: 1.8,
          maxWidth: "760px",
        }}
      >
        Cada certificado posee un registro institucional único y
        permanente, independiente del código de miembro que usted
        utilice en cada nivel académico.
      </p>

      {error && (
        <div
          style={{
            marginTop: "1rem",
            background: "#f8ecec",
            border: "1px solid #ebc8c8",
            borderRadius: "10px",
            padding: "1rem",
            color: "#8b2f2f",
          }}
        >
          {error}
        </div>
      )}

      {mensaje && (
        <div
          style={{
            marginTop: "1rem",
            background: "#eef6e9",
            border: "1px solid #cfe3c4",
            borderRadius: "10px",
            padding: "1rem",
            color: "#356128",
          }}
        >
          {mensaje}
        </div>
      )}

      {puedeGenerarCertificadoINV &&
        !tieneCertificadoINV && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.5rem",
              background: "#fff",
              border: "1px solid #ddd4c7",
              borderRadius: "14px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#4d371c",
              }}
            >
              Certificado de Académico Investigador
            </h2>

            <p
              style={{
                lineHeight: 1.8,
              }}
            >
              Su acreditación como Académico Investigador se
              encuentra registrada y ya puede emitirse el
              certificado institucional correspondiente.
            </p>

            <button
              type="button"
              disabled={generando}
              onClick={generarCertificadoInvestigador}
              style={{
                background: "#6b6f1a",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.85rem 1.2rem",
                cursor: generando
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 700,
                opacity: generando ? 0.7 : 1,
              }}
            >
              {generando
                ? "Generando certificado..."
                : "Generar certificado"}
            </button>
          </div>
        )}

      {certificados.length === 0 &&
        !puedeGenerarCertificadoINV && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "2rem",
              textAlign: "center",
              background: "#faf8f3",
              border: "1px dashed #cbbfa9",
              borderRadius: "12px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#6b4f2a",
              }}
            >
              No hay certificados disponibles
            </h2>

            <p
              style={{
                marginBottom: 0,
                lineHeight: 1.7,
                color: "#666",
              }}
            >
              Los certificados que obtenga dentro de la Academia
              aparecerán aquí cuando sean emitidos.
            </p>
          </div>
        )}

      {certificados.length > 0 && (
        <div
          style={{
            marginTop: "2rem",
            display: "grid",
            gap: "1rem",
          }}
        >
          {certificados.map((certificado) => (
            <div
              key={certificado.id}
              style={{
                background: "white",
                border: "1px solid #ddd4c7",
                borderRadius: "14px",
                padding: "1.5rem",
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
                <div>
                  <p
                    style={{
                      margin:
                        "0 0 0.4rem",
                      color: "#6b6f1a",
                      fontWeight: 700,
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        "0.05em",
                      fontSize:
                        "0.8rem",
                    }}
                  >
                    Certificado académico
                  </p>

                  <h2
                    style={{
                      margin:
                        "0 0 0.5rem",
                      color: "#4d371c",
                    }}
                  >
                    {nombreNivel(
                      certificado.nivel
                    )}
                  </h2>
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
                      certificado.estado ===
                      "vigente"
                        ? "#e8f2e4"
                        : "#f8ecec",
                    color:
                      certificado.estado ===
                      "vigente"
                        ? "#356128"
                        : "#8b2f2f",
                    fontWeight: 700,
                    fontSize:
                      "0.82rem",
                  }}
                >
                  {certificado.estado ===
                  "vigente"
                    ? "Vigente"
                    : certificado.estado}
                </span>
              </div>

              <div
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  background: "#faf8f3",
                  borderRadius: "10px",
                }}
              >
                <p
                  style={{
                    margin:
                      "0.2rem 0",
                  }}
                >
                  <strong>
                    Titular:
                  </strong>{" "}
                  {certificado.nombre}
                </p>

                <p
                  style={{
                    margin:
                      "0.2rem 0",
                  }}
                >
                  <strong>
                    Tipo de acreditación:
                  </strong>{" "}
                  {nombreOrigen(
                    certificado.origen_acreditacion
                  )}
                </p>

                <p
                  style={{
                    margin:
                      "0.2rem 0",
                  }}
                >
                  <strong>
                    Fecha de emisión:
                  </strong>{" "}
                  {formatearFecha(
                    certificado.fecha_emision
                  )}
                </p>

                <p
                  style={{
                    margin:
                      "0.2rem 0",
                  }}
                >
                  <strong>
                    Registro:
                  </strong>{" "}
                  {certificado.registro}
                </p>
              </div>

              <Link
                href={`/miembros/certificados/${encodeURIComponent(
                  certificado.registro
                )}`}
                style={{
                  display:
                    "inline-block",
                  marginTop:
                    "1rem",
                  background:
                    "#6b6f1a",
                  color: "white",
                  padding:
                    "0.75rem 1rem",
                  borderRadius:
                    "8px",
                  textDecoration:
                    "none",
                  fontWeight: 700,
                }}
              >
                Ver certificado
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}