"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Datos = {
  invitacion: {
    id: number;
    estado: string;
    correo: string;
    fechaVencimiento: string;
    fechaAceptacion?: string | null;
    fechaUtilizacion?: string | null;
  };

  incorporacion: {
    id: number;
    nombre: string;
    sexo?: "M" | "F" | null;
    correo?: string | null;
    telefono?: string | null;

    nivel: "INV" | "NUM";
    nivelNombre: string;

    modalidad:
      | "INV_FORMACION"
      | "INV_ACREDITADO"
      | "NUM"
      | null;

    modalidadNombre: string;

    estado: string;
    codigoAsignado?: string | null;
  };
};

type ResultadoIncorporacion = {
  codigo: string;

  nivel: "INV" | "NUM";

  modalidad:
    | "INV_FORMACION"
    | "INV_ACREDITADO"
    | "NUM";

  requiereCrearPassword?: boolean;

  fechaVencimientoPassword?: string | null;
};

export default function CompletarIncorporacionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [datos, setDatos] = useState<Datos | null>(null);

  const [resultado, setResultado] =
    useState<ResultadoIncorporacion | null>(null);

  const [error, setError] = useState("");

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [profesion, setProfesion] = useState("");
  const [bio, setBio] = useState("");

  const [fechaNacimiento, setFechaNacimiento] =
    useState("");

  const cargar = async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        setError(
          "El enlace de incorporación no contiene un token válido."
        );

        return;
      }

      const response = await fetch(
        `/api/incorporaciones/aceptar?token=${encodeURIComponent(
          token
        )}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            "No fue posible validar la incorporación."
        );
      }

      if (
        result.invitacion?.estado !== "aceptada" &&
        result.invitacion?.estado !== "utilizada"
      ) {
        throw new Error(
          "Debe aceptar primero la invitación antes de completar su incorporación."
        );
      }

      const nuevosDatos: Datos = {
        invitacion: result.invitacion,
        incorporacion: result.incorporacion,
      };

      setDatos(nuevosDatos);

      setNombre(
        result.incorporacion?.nombre || ""
      );

      setCorreo(
        result.invitacion?.correo || ""
      );

      setTelefono(
        result.incorporacion?.telefono || ""
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible validar la incorporación."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [token]);

  const completarIncorporacion = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!token) return;

    if (!nombre.trim()) {
      setError(
        "Debe indicar su nombre completo."
      );

      return;
    }

    if (!correo.trim()) {
      setError(
        "Debe indicar un correo electrónico."
      );

      return;
    }

    setGuardando(true);
    setError("");

    try {
      const response = await fetch(
        "/api/incorporaciones/completar",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            token,

            nombre:
              nombre.trim(),

            correo:
              correo.trim(),

            telefono:
              telefono.trim() || null,

            profesion:
              profesion.trim() || null,

            bio:
              bio.trim() || null,

            fechaNacimiento:
              fechaNacimiento || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            "No fue posible completar la incorporación."
        );
      }

      /*
       * Incorporación recién completada.
       *
       * Ya NO recibimos ni mostramos una contraseña
       * temporal. La contraseña será creada por el
       * propio académico desde el enlace enviado
       * a su correo.
       */

      if (
        result.codigo &&
        !result.yaCompletada
      ) {
        setResultado({
          codigo:
            result.codigo,

          nivel:
            result.nivel,

          modalidad:
            result.modalidad,

          requiereCrearPassword:
            result.requiereCrearPassword,

          fechaVencimientoPassword:
            result.fechaVencimientoPassword ||
            null,
        });

        setDatos((actual) => {
          if (!actual) {
            return actual;
          }

          return {
            ...actual,

            incorporacion: {
              ...actual.incorporacion,

              codigoAsignado:
                result.codigo,
            },
          };
        });

        return;
      }

      /*
       * La incorporación ya había sido completada.
       */

      if (result.codigo) {
        setDatos((actual) => {
          if (!actual) {
            return actual;
          }

          return {
            ...actual,

            incorporacion: {
              ...actual.incorporacion,

              codigoAsignado:
                result.codigo,
            },
          };
        });
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible completar la incorporación."
      );
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          maxWidth: "760px",
          margin: "3rem auto",
          padding: "2rem",
        }}
      >
        Cargando formulario de incorporación...
      </div>
    );
  }

  if (error && !datos) {
    return (
      <div
        style={{
          maxWidth: "760px",
          margin: "3rem auto",
          padding: "2rem",
          background: "white",
          border: "1px solid #ebc8c8",
          borderRadius: "14px",
        }}
      >
        <h1 style={{ marginTop: 0 }}>
          Completar incorporación
        </h1>

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
      </div>
    );
  }

  if (!datos) {
    return null;
  }

  /*
   * =========================================================
   * INCORPORACIÓN RECIÉN COMPLETADA
   * =========================================================
   */

  if (resultado) {
    return (
      <div
        style={{
          maxWidth: "760px",
          margin: "3rem auto",
          padding: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "16px",
            padding: "2rem",
          }}
        >
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
            Academia Guatemalteca de Estudios
            Numismáticos y Notafílicos
          </p>

          <h1 style={{ marginTop: 0 }}>
            ¡Bienvenido a la AGENN!
          </h1>

          <div
            style={{
              background: "#eef6e9",
              border: "1px solid #cfe3c4",
              borderRadius: "12px",
              padding: "1.4rem",
              color: "#356128",
              lineHeight: 1.8,
            }}
          >
            Su incorporación a la Academia ha sido
            completada correctamente.
          </div>

          <h2
            style={{
              marginTop: "2rem",
              color: "#4d371c",
            }}
          >
            Su código institucional
          </h2>

          <div
            style={{
              background: "#faf8f3",
              border: "1px solid #ddd4c7",
              borderRadius: "12px",
              padding: "1.5rem",
              marginTop: "1rem",
            }}
          >
            <p
              style={{
                margin: 0,
                lineHeight: 1.7,
              }}
            >
              <strong>
                Usuario / código institucional:
              </strong>

              <br />

              <span
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "#4d371c",
                }}
              >
                {resultado.codigo}
              </span>
            </p>
          </div>

          <div
            style={{
              marginTop: "1.5rem",
              background: "#f5f5ef",
              borderLeft: "5px solid #6b6f1a",
              borderRadius: "8px",
              padding: "1.25rem",
            }}
          >
            <strong>
              Cree su contraseña personal
            </strong>

            <p
              style={{
                marginBottom: "0.7rem",
                lineHeight: 1.8,
              }}
            >
              Hemos enviado al correo electrónico
              registrado durante su incorporación un
              enlace seguro para crear su contraseña
              personal.
            </p>

            <p
              style={{
                marginBottom: 0,
                lineHeight: 1.8,
              }}
            >
              El enlace es personal, puede utilizarse
              una sola vez y tendrá una vigencia de
              24 horas.
            </p>
          </div>

          {resultado.modalidad ===
            "INV_FORMACION" && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1.25rem",
                background: "#f5f5ef",
                borderLeft:
                  "5px solid #6b6f1a",
                borderRadius: "8px",
              }}
            >
              <strong>
                Académico Investigador — en formación
              </strong>

              <p
                style={{
                  marginBottom: 0,
                  lineHeight: 1.8,
                }}
              >
                Al ingresar a su cuenta encontrará
                habilitado el proceso de formación
                correspondiente al Nivel Investigador.
                Al completar satisfactoriamente este
                proceso obtendrá su acreditación como
                Académico Investigador.
              </p>
            </div>
          )}

          {resultado.modalidad ===
            "INV_ACREDITADO" && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1.25rem",
                background: "#f5f5ef",
                borderLeft:
                  "5px solid #6b6f1a",
                borderRadius: "8px",
              }}
            >
              <strong>
                Académico Investigador acreditado
              </strong>

              <p
                style={{
                  marginBottom: 0,
                  lineHeight: 1.8,
                }}
              >
                El Consejo Académico ha reconocido su
                trayectoria como equivalente al proceso
                de formación del Nivel Investigador.
                Por ello, no deberá cursar las unidades
                de formación correspondientes a este
                nivel.
              </p>

              <p
                style={{
                  marginBottom: 0,
                  lineHeight: 1.8,
                }}
              >
                Desde su cuenta tendrá acceso a los
                servicios correspondientes a su
                condición académica y podrá optar al
                proceso establecido para el Nivel
                Numerario.
              </p>
            </div>
          )}

          {resultado.modalidad === "NUM" && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1.25rem",
                background: "#f5f5ef",
                borderLeft:
                  "5px solid #6b6f1a",
                borderRadius: "8px",
              }}
            >
              <strong>
                Académico Numerario
              </strong>

              <p
                style={{
                  marginBottom: 0,
                  lineHeight: 1.8,
                }}
              >
                Su incorporación como Académico
                Numerario ha quedado formalmente
                registrada. Una vez creada su
                contraseña, encontrará disponibles
                las funciones correspondientes a este
                nivel.
              </p>
            </div>
          )}

          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid #eee7dc",
            }}
          >
            <p
              style={{
                marginTop: 0,
                lineHeight: 1.8,
                color: "#555",
              }}
            >
              Después de crear su contraseña podrá
              ingresar utilizando el código{" "}
              <strong>{resultado.codigo}</strong> y la
              contraseña que usted haya elegido.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/login")
              }
              style={{
                marginTop: "0.5rem",
                background: "#6b6f1a",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.95rem 1.5rem",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "1rem",
              }}
            >
              Ir al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * YA ESTABA COMPLETADA
   * =========================================================
   */

  if (
    datos.incorporacion.codigoAsignado
  ) {
    return (
      <div
        style={{
          maxWidth: "760px",
          margin: "3rem auto",
          padding: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "16px",
            padding: "2rem",
          }}
        >
          <h1 style={{ marginTop: 0 }}>
            Incorporación completada
          </h1>

          <div
            style={{
              background: "#eef6e9",
              border: "1px solid #cfe3c4",
              borderRadius: "12px",
              padding: "1.4rem",
              color: "#356128",
            }}
          >
            <p style={{ marginTop: 0 }}>
              Su incorporación a la AGENN ya fue
              completada.
            </p>

            <p style={{ marginBottom: 0 }}>
              <strong>
                Código institucional:
              </strong>{" "}
              {
                datos.incorporacion
                  .codigoAsignado
              }
            </p>
          </div>

          <p
            style={{
              lineHeight: 1.8,
              marginTop: "1.5rem",
            }}
          >
            Si ya creó su contraseña, puede ingresar
            utilizando su código institucional y su
            contraseña personal.
          </p>

          <p
            style={{
              lineHeight: 1.8,
              color: "#666",
            }}
          >
            Si todavía no ha creado su contraseña,
            revise el correo electrónico que recibió
            al completar su incorporación.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/login")
            }
            style={{
              marginTop: "0.5rem",
              background: "#6b6f1a",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.9rem 1.4rem",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * FORMULARIO
   * =========================================================
   */

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "3rem auto",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "16px",
          padding: "2rem",
        }}
      >
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
          Academia Guatemalteca de Estudios
          Numismáticos y Notafílicos
        </p>

        <h1 style={{ marginTop: 0 }}>
          Completar incorporación
        </h1>

        <p style={{ lineHeight: 1.8 }}>
          Complete los siguientes datos para crear su
          expediente institucional dentro de la AGENN.
        </p>

        <div
          style={{
            margin: "1.5rem 0",
            padding: "1rem",
            background: "#faf8f3",
            borderRadius: "10px",
          }}
        >
          <p style={{ margin: "0.2rem 0" }}>
            <strong>
              Modalidad aprobada:
            </strong>{" "}
            {
              datos.incorporacion
                .modalidadNombre
            }
          </p>

          <p style={{ margin: "0.2rem 0" }}>
            <strong>Nivel:</strong>{" "}
            {
              datos.incorporacion
                .nivelNombre
            }
          </p>
        </div>

        <form
          onSubmit={
            completarIncorporacion
          }
        >
          <div
            style={{
              display: "grid",
              gap: "1.2rem",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.4rem",
                  fontWeight: 700,
                }}
              >
                Nombre completo *
              </label>

              <input
                type="text"
                value={nombre}
                onChange={(e) =>
                  setNombre(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border:
                    "1px solid #ccc",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.4rem",
                  fontWeight: 700,
                }}
              >
                Correo electrónico *
              </label>

              <input
                type="email"
                value={correo}
                onChange={(e) =>
                  setCorreo(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border:
                    "1px solid #ccc",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.4rem",
                  fontWeight: 700,
                }}
              >
                Teléfono
              </label>

              <input
                type="text"
                value={telefono}
                onChange={(e) =>
                  setTelefono(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border:
                    "1px solid #ccc",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.4rem",
                  fontWeight: 700,
                }}
              >
                Profesión
              </label>

              <input
                type="text"
                value={profesion}
                onChange={(e) =>
                  setProfesion(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border:
                    "1px solid #ccc",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.4rem",
                  fontWeight: 700,
                }}
              >
                Fecha de nacimiento
              </label>

              <input
                type="date"
                value={
                  fechaNacimiento
                }
                onChange={(e) =>
                  setFechaNacimiento(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border:
                    "1px solid #ccc",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.4rem",
                  fontWeight: 700,
                }}
              >
                Biografía breve
              </label>

              <textarea
                value={bio}
                onChange={(e) =>
                  setBio(
                    e.target.value
                  )
                }
                rows={8}
                placeholder="Puede incluir experiencia profesional, trayectoria numismática, publicaciones, áreas de interés u otros datos relevantes."
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border:
                    "1px solid #ccc",
                  borderRadius: "8px",
                  boxSizing: "border-box",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  background: "#f8ecec",
                  border:
                    "1px solid #ebc8c8",
                  borderRadius: "10px",
                  padding: "1rem",
                  color: "#8b2f2f",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={guardando}
              style={{
                background: "#6b6f1a",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.9rem 1.4rem",
                cursor: guardando
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 700,
                opacity: guardando
                  ? 0.7
                  : 1,
              }}
            >
              {guardando
                ? "Completando incorporación..."
                : "Completar mi incorporación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}