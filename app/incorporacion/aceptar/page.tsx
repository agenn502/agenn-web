"use client";

import { Suspense, useEffect, useState } from "react";
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

    resultado?: string | null;

    fechaResolucion?: string | null;
    fechaEnvioInvitacion?: string | null;
    fechaAceptacion?: string | null;
    fechaIncorporacion?: string | null;

    codigoAsignado?: string | null;
  };
};

function AceptarIncorporacionContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [aceptando, setAceptando] = useState(false);

  const [datos, setDatos] = useState<Datos | null>(null);

  const [error, setError] = useState("");
  const [aceptada, setAceptada] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        setError(
          "El enlace de invitación no contiene un token válido."
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
            "No fue posible validar la invitación."
        );
      }

      setDatos({
        invitacion: result.invitacion,
        incorporacion: result.incorporacion,
      });

      if (
        result.invitacion?.estado === "aceptada" ||
        result.invitacion?.estado === "utilizada" ||
        result.incorporacion?.estado === "aceptada" ||
        result.incorporacion?.estado === "incorporada"
      ) {
        setAceptada(true);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible validar la invitación."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [token]);

  const aceptarInvitacion = async () => {
    if (!token) return;

    setAceptando(true);
    setError("");

    try {
      const response = await fetch(
        "/api/incorporaciones/aceptar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            "No fue posible aceptar la invitación."
        );
      }

      setAceptada(true);

      await cargar();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible aceptar la invitación."
      );
    } finally {
      setAceptando(false);
    }
  };

  const continuarIncorporacion = () => {
    router.push(
      `/incorporacion/completar?token=${encodeURIComponent(
        token
      )}`
    );
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
        Validando invitación...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          maxWidth: "760px",
          margin: "3rem auto",
          padding: "2rem",
          background: "#fff",
          border: "1px solid #ebc8c8",
          borderRadius: "14px",
        }}
      >
        <h1 style={{ marginTop: 0 }}>
          Invitación de incorporación
        </h1>

        <div
          style={{
            background: "#f8ecec",
            border: "1px solid #ebc8c8",
            borderRadius: "10px",
            padding: "1rem",
            color: "#8b2f2f",
            lineHeight: 1.7,
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

  const { incorporacion, invitacion } = datos;

  const tratamiento =
    incorporacion.sexo === "F"
      ? "Estimada"
      : "Estimado";

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
          Invitación de incorporación
        </h1>

        {!aceptada ? (
          <>
            <p style={{ lineHeight: 1.8 }}>
              {tratamiento}{" "}
              <strong>
                {incorporacion.nombre}
              </strong>
              :
            </p>

            <p style={{ lineHeight: 1.8 }}>
              El Consejo Académico de la AGENN ha
              aprobado por unanimidad su incorporación
              a la Academia bajo la siguiente modalidad:
            </p>

            <div
              style={{
                margin: "1.5rem 0",
                padding: "1.4rem",
                background: "#eef6e9",
                borderLeft: "5px solid #6b6f1a",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <strong
                style={{
                  fontSize: "1.35rem",
                  color: "#4d371c",
                }}
              >
                {incorporacion.modalidadNombre}
              </strong>
            </div>

            {incorporacion.modalidad ===
              "INV_FORMACION" && (
              <p style={{ lineHeight: 1.8 }}>
                Su incorporación le permitirá ingresar
                directamente al Nivel Investigador y
                realizar el proceso de formación y
                acreditación correspondiente.
              </p>
            )}

            {incorporacion.modalidad ===
              "INV_ACREDITADO" && (
              <p style={{ lineHeight: 1.8 }}>
                El Consejo Académico ha reconocido su
                trayectoria y experiencia como
                equivalentes al proceso académico del
                Nivel Investigador. Por ello, su
                incorporación se realizará directamente
                como Académico Investigador acreditado.
              </p>
            )}

            {incorporacion.modalidad === "NUM" && (
              <p style={{ lineHeight: 1.8 }}>
                Su trayectoria y producción académica
                han sido reconocidas como suficientes
                para su incorporación directa como
                Académico Numerario.
              </p>
            )}

            <p style={{ lineHeight: 1.8 }}>
              Al aceptar, quedará registrada
              formalmente su conformidad para continuar
              con el proceso de incorporación y
              completar los datos necesarios para la
              creación de su expediente institucional.
            </p>

            <div
              style={{
                marginTop: "2rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid #ddd4c7",
              }}
            >
              <button
                type="button"
                disabled={aceptando}
                onClick={aceptarInvitacion}
                style={{
                  background: "#6b6f1a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.9rem 1.4rem",
                  cursor: aceptando
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: 700,
                  opacity: aceptando ? 0.7 : 1,
                }}
              >
                {aceptando
                  ? "Registrando aceptación..."
                  : "Aceptar invitación e incorporarme a la AGENN"}
              </button>
            </div>

            <p
              style={{
                marginTop: "1.5rem",
                color: "#666",
                fontSize: "0.9rem",
                lineHeight: 1.7,
              }}
            >
              La invitación fue enviada a{" "}
              <strong>
                {invitacion.correo}
              </strong>
              .
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                background: "#eef6e9",
                border: "1px solid #cfe3c4",
                borderRadius: "12px",
                padding: "1.4rem",
                color: "#356128",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                Invitación aceptada
              </h2>

              <p
                style={{
                  marginBottom: 0,
                  lineHeight: 1.8,
                }}
              >
                Su aceptación fue registrada
                correctamente. Para completar su
                incorporación a la AGENN deberá
                proporcionar algunos datos personales e
                institucionales.
              </p>
            </div>

            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                background: "#faf8f3",
                borderRadius: "10px",
              }}
            >
              <p style={{ margin: "0.2rem 0" }}>
                <strong>Nombre:</strong>{" "}
                {incorporacion.nombre}
              </p>

              <p style={{ margin: "0.2rem 0" }}>
                <strong>
                  Modalidad aprobada:
                </strong>{" "}
                {incorporacion.modalidadNombre}
              </p>

              <p style={{ margin: "0.2rem 0" }}>
                <strong>Correo:</strong>{" "}
                {invitacion.correo}
              </p>
            </div>

            {incorporacion.codigoAsignado ? (
              <div
                style={{
                  marginTop: "1.5rem",
                  background: "#eef6e9",
                  border: "1px solid #cfe3c4",
                  borderRadius: "10px",
                  padding: "1rem",
                }}
              >
                <strong>
                  Incorporación completada
                </strong>

                <p
                  style={{
                    marginBottom: 0,
                    lineHeight: 1.7,
                  }}
                >
                  Su código institucional es{" "}
                  <strong>
                    {incorporacion.codigoAsignado}
                  </strong>
                  .
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={continuarIncorporacion}
                style={{
                  marginTop: "1.5rem",
                  background: "#6b6f1a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.9rem 1.4rem",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Continuar con mi incorporación
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AceptarIncorporacionPage() {
  return (
    <Suspense fallback={<div>Validando invitación...</div>}>
      <AceptarIncorporacionContenido />
    </Suspense>
  );
}