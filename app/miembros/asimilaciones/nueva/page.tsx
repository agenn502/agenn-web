"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  codigo: string;
  nombre: string;
  nivel: string;
  consejo?: boolean | string | number;
};

type ModalidadIncorporacion =
  | "INV_FORMACION"
  | "INV_ACREDITADO"
  | "NUM";

type Sexo = "M" | "F";

export default function NuevaIncorporacionPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");

  const [sexo, setSexo] = useState<Sexo | "">("");

  const [modalidadIncorporacion, setModalidadIncorporacion] =
    useState<ModalidadIncorporacion>("INV_FORMACION");

  const [justificacion, setJustificacion] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    const parsed = JSON.parse(stored) as User;

    const consejo =
      parsed.consejo === true ||
      parsed.consejo === "true" ||
      parsed.consejo === "TRUE" ||
      parsed.consejo === 1;

    setUser(parsed);
    setEsConsejo(consejo);
  }, []);

  const obtenerNivelPropuesto = (
    modalidad: ModalidadIncorporacion
  ): "INV" | "NUM" => {
    return modalidad === "NUM" ? "NUM" : "INV";
  };

  const enviarPropuesta = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!user || !esConsejo) {
      setError(
        "Esta acción es exclusiva del Consejo Académico."
      );
      return;
    }

    if (!nombre.trim()) {
      setError(
        "Debe indicar el nombre de la persona propuesta."
      );
      return;
    }

    if (!sexo) {
      setError(
        "Debe seleccionar el sexo de la persona propuesta."
      );
      return;
    }

    if (!justificacion.trim()) {
      setError(
        "Debe incluir una justificación para la propuesta."
      );
      return;
    }

    setEnviando(true);
    setMensaje("");
    setError("");

    try {
      const response = await fetch(
        "/api/asimilaciones/nueva",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
            correo: correo.trim() || null,
            telefono: telefono.trim() || null,
            sexo,

            nivelPropuesto:
              obtenerNivelPropuesto(
                modalidadIncorporacion
              ),

            modalidadIncorporacion,

            justificacion: justificacion.trim(),

            proponenteCodigo: user.codigo,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            "No fue posible registrar la propuesta."
        );
      }

      setMensaje(
        "La propuesta de incorporación fue presentada al Consejo Académico."
      );

      setNombre("");
      setCorreo("");
      setTelefono("");
      setSexo("");
      setModalidadIncorporacion("INV_FORMACION");
      setJustificacion("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible registrar la propuesta."
      );
    } finally {
      setEnviando(false);
    }
  };

  if (!user) {
    return <div>Cargando...</div>;
  }

  if (!esConsejo) {
    return (
      <div style={{ color: "red" }}>
        Esta sección es exclusiva del Consejo Académico.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "850px" }}>
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

      <h1 style={{ marginTop: 0 }}>
        Proponer incorporación por mérito académico
      </h1>

      <p style={{ lineHeight: 1.8 }}>
        Utilice este formulario para proponer al Consejo
        Académico la incorporación de una persona cuya
        trayectoria, experiencia, formación o producción
        académica justifique su ingreso directo a una etapa
        avanzada de la Academia.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        La propuesta será sometida a consideración y votación
        del Consejo Académico. La modalidad seleccionada
        determinará las condiciones académicas con las que la
        persona se incorporará a la AGENN.
      </p>

      <form onSubmit={enviarPropuesta}>
        <div
          style={{
            display: "grid",
            gap: "1.25rem",
            marginTop: "2rem",
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "14px",
            padding: "1.5rem",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.45rem",
                fontWeight: 700,
              }}
            >
              Nombre completo *
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
              placeholder="Nombre de la persona propuesta"
              style={{
                width: "100%",
                padding: "0.8rem",
                border: "1px solid #ccc",
                borderRadius: "8px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.6rem",
                fontWeight: 700,
              }}
            >
              Sexo *
            </label>

            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="sexo"
                  value="M"
                  checked={sexo === "M"}
                  onChange={() => setSexo("M")}
                />
                Masculino
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="sexo"
                  value="F"
                  checked={sexo === "F"}
                  onChange={() => setSexo("F")}
                />
                Femenino
              </label>
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.45rem",
                fontWeight: 700,
              }}
            >
              Correo electrónico
            </label>

            <input
              type="email"
              value={correo}
              onChange={(e) =>
                setCorreo(e.target.value)
              }
              placeholder="correo@ejemplo.com"
              style={{
                width: "100%",
                padding: "0.8rem",
                border: "1px solid #ccc",
                borderRadius: "8px",
                boxSizing: "border-box",
              }}
            />

            <p
              style={{
                marginBottom: 0,
                fontSize: "0.85rem",
                color: "#666",
                lineHeight: 1.6,
              }}
            >
              Si se conoce, conviene consignarlo desde
              ahora para facilitar el envío posterior de
              la invitación institucional.
            </p>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.45rem",
                fontWeight: 700,
              }}
            >
              Teléfono
            </label>

            <input
              type="text"
              value={telefono}
              onChange={(e) =>
                setTelefono(e.target.value)
              }
              placeholder="Teléfono de contacto, si se conoce"
              style={{
                width: "100%",
                padding: "0.8rem",
                border: "1px solid #ccc",
                borderRadius: "8px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.8rem",
                fontWeight: 700,
              }}
            >
              Modalidad de incorporación propuesta *
            </label>

            <div
              style={{
                display: "grid",
                gap: "0.85rem",
              }}
            >
              <label
                style={{
                  display: "block",
                  cursor: "pointer",
                  padding: "1rem",
                  border:
                    modalidadIncorporacion ===
                    "INV_FORMACION"
                      ? "2px solid #6b6f1a"
                      : "1px solid #ddd4c7",
                  borderRadius: "10px",
                  background:
                    modalidadIncorporacion ===
                    "INV_FORMACION"
                      ? "#f7f8ee"
                      : "#faf8f3",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.65rem",
                  }}
                >
                  <input
                    type="radio"
                    name="modalidad"
                    value="INV_FORMACION"
                    checked={
                      modalidadIncorporacion ===
                      "INV_FORMACION"
                    }
                    onChange={() =>
                      setModalidadIncorporacion(
                        "INV_FORMACION"
                      )
                    }
                    style={{ marginTop: "0.3rem" }}
                  />

                  <div>
                    <strong>
                      Académico Investigador — en
                      formación
                    </strong>

                    <p
                      style={{
                        margin: "0.4rem 0 0",
                        color: "#555",
                        lineHeight: 1.6,
                      }}
                    >
                      La persona se incorpora
                      directamente al Nivel Investigador
                      y realizará el proceso de formación
                      y acreditación correspondiente.
                    </p>
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "block",
                  cursor: "pointer",
                  padding: "1rem",
                  border:
                    modalidadIncorporacion ===
                    "INV_ACREDITADO"
                      ? "2px solid #6b6f1a"
                      : "1px solid #ddd4c7",
                  borderRadius: "10px",
                  background:
                    modalidadIncorporacion ===
                    "INV_ACREDITADO"
                      ? "#f7f8ee"
                      : "#faf8f3",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.65rem",
                  }}
                >
                  <input
                    type="radio"
                    name="modalidad"
                    value="INV_ACREDITADO"
                    checked={
                      modalidadIncorporacion ===
                      "INV_ACREDITADO"
                    }
                    onChange={() =>
                      setModalidadIncorporacion(
                        "INV_ACREDITADO"
                      )
                    }
                    style={{ marginTop: "0.3rem" }}
                  />

                  <div>
                    <strong>
                      Académico Investigador acreditado
                    </strong>

                    <p
                      style={{
                        margin: "0.4rem 0 0",
                        color: "#555",
                        lineHeight: 1.6,
                      }}
                    >
                      La trayectoria y experiencia de la
                      persona son reconocidas como
                      equivalentes al proceso académico
                      del Nivel Investigador. Se incorpora
                      como Investigador acreditado, tendrá
                      derecho al certificado
                      correspondiente y podrá optar
                      posteriormente al proceso para
                      Académico Numerario.
                    </p>
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "block",
                  cursor: "pointer",
                  padding: "1rem",
                  border:
                    modalidadIncorporacion === "NUM"
                      ? "2px solid #6b6f1a"
                      : "1px solid #ddd4c7",
                  borderRadius: "10px",
                  background:
                    modalidadIncorporacion === "NUM"
                      ? "#f7f8ee"
                      : "#faf8f3",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.65rem",
                  }}
                >
                  <input
                    type="radio"
                    name="modalidad"
                    value="NUM"
                    checked={
                      modalidadIncorporacion === "NUM"
                    }
                    onChange={() =>
                      setModalidadIncorporacion("NUM")
                    }
                    style={{ marginTop: "0.3rem" }}
                  />

                  <div>
                    <strong>
                      Académico Numerario
                    </strong>

                    <p
                      style={{
                        margin: "0.4rem 0 0",
                        color: "#555",
                        lineHeight: 1.6,
                      }}
                    >
                      Incorporación excepcional al nivel
                      superior de la Academia, reservada
                      para personas cuya trayectoria y
                      producción académica satisfagan los
                      requisitos establecidos para los
                      Académicos Numerarios.
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.45rem",
                fontWeight: 700,
              }}
            >
              Justificación de la propuesta *
            </label>

            <textarea
              value={justificacion}
              onChange={(e) =>
                setJustificacion(e.target.value)
              }
              placeholder="Describa la trayectoria, experiencia, publicaciones, aportes o méritos que fundamentan la modalidad de incorporación propuesta."
              rows={10}
              style={{
                width: "100%",
                padding: "0.8rem",
                border: "1px solid #ccc",
                borderRadius: "8px",
                boxSizing: "border-box",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div
            style={{
              background: "#faf8f3",
              border: "1px solid #ddd4c7",
              borderRadius: "10px",
              padding: "1rem",
            }}
          >
            <p
              style={{
                margin: 0,
                lineHeight: 1.7,
              }}
            >
              <strong>Proponente:</strong>{" "}
              {user.nombre}
              <br />
              <strong>Código:</strong>{" "}
              {user.codigo}
            </p>
          </div>

          {error && (
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
          )}

          {mensaje && (
            <div
              style={{
                background: "#eef6e9",
                border: "1px solid #cfe3c4",
                borderRadius: "10px",
                padding: "1rem",
                color: "#2f6a22",
              }}
            >
              {mensaje}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "0.8rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={enviando}
              style={{
                background: "#6b6f1a",
                color: "white",
                padding: "0.85rem 1.2rem",
                border: "none",
                borderRadius: "8px",
                cursor: enviando
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 700,
                opacity: enviando ? 0.7 : 1,
              }}
            >
              {enviando
                ? "Presentando propuesta..."
                : "Presentar propuesta al Consejo Académico"}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/miembros")
              }
              style={{
                background: "#ccc",
                color: "#222",
                padding: "0.85rem 1.2rem",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}