"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { TEORIA, QUESTIONS } from "@/content/proceso_inv/unidad7";
import { CUESTIONARIOS_INV_DISPONIBLES_PARA_NUEVOS } from "@/content/proceso_inv/config";
import { supabase } from "@/lib/supabaseClient";

type BloqueTexto = {
  tipo: "texto";
  contenido: string;
};

type BloqueTabla = {
  tipo: "tabla";
  columnas: string[];
  filas: string[][];
};

type Bloque = BloqueTexto | BloqueTabla;

type Seccion = {
  titulo: string;
  bloques: Bloque[];
};

function TablaAcademica({
  columnas,
  filas,
}: {
  columnas: string[];
  filas: string[][];
}) {
  return (
    <div style={{ overflowX: "auto", margin: "1rem 0 1.5rem" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.95rem",
        }}
      >
        <thead>
          <tr>
            {columnas.map((columna) => (
              <th
                key={columna}
                style={{
                  border: "1px solid #ddd4c7",
                  padding: "0.75rem",
                  background: "#f4f1e8",
                  textAlign: "left",
                }}
              >
                {columna}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filas.map((fila, index) => (
            <tr key={index}>
              {fila.map((celda, cellIndex) => (
                <td
                  key={cellIndex}
                  style={{
                    border: "1px solid #ddd4c7",
                    padding: "0.75rem",
                    verticalAlign: "top",
                  }}
                >
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Unidad7InvestigadorPage() {
  const secciones = TEORIA as Seccion[];

  const [mostrarCuestionario, setMostrarCuestionario] = useState(false);
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<
    number | null
  >(null);
  const [mostrarRetroalimentacion, setMostrarRetroalimentacion] =
    useState(false);
  const [completado, setCompletado] = useState(false);
  const [unidadCompletada, setUnidadCompletada] = useState(false);
  const [progresoCargado, setProgresoCargado] = useState(false);
  const [cuestionarioBloqueado, setCuestionarioBloqueado] = useState(false);
  const [modoRepaso, setModoRepaso] = useState(false);

  const pregunta = QUESTIONS[preguntaActual];

  const responder = async (index: number) => {
    setRespuestaSeleccionada(index);

    if (index === pregunta.correcta) {
      setMostrarRetroalimentacion(false);

      setTimeout(() => {
        setRespuestaSeleccionada(null);

        if (preguntaActual === QUESTIONS.length - 1) {
          if (!modoRepaso) void guardarProgresoCuestionario();

          setCompletado(true);
          setMostrarCuestionario(false);
        } else {
          setPreguntaActual((prev) => prev + 1);
        }
      }, 600);
    } else {
      setMostrarRetroalimentacion(true);
    }
  };

  const guardarProgresoCuestionario = async () => {
    const stored = localStorage.getItem("user");

    if (!stored) return;

    const user = JSON.parse(stored);

    await supabase.from("progreso_inv").upsert(
      [
        {
          user_codigo: user.codigo,
          unidad_slug: "unidad-7",
          completada: false,
          porcentaje: 50,
          respuestas: {
            cuestionario_completado: true,
            total_preguntas: QUESTIONS.length,
            fecha: new Date().toISOString(),
          },
          fecha_actualizacion: new Date().toISOString(),
        },
      ],
      {
        onConflict: "user_codigo,unidad_slug",
      },
    );
  };

  const iniciarRepaso = () => {
    setModoRepaso(true);
    setPreguntaActual(0);
    setRespuestaSeleccionada(null);
    setMostrarRetroalimentacion(false);
    setCompletado(false);
    setMostrarCuestionario(true);
  };
  useEffect(() => {
    const cargarProgreso = async () => {
      const esRepaso = new URLSearchParams(window.location.search).get("modo") === "repaso";
      if (esRepaso) setModoRepaso(true);

      const stored = localStorage.getItem("user");

      if (!stored) {
        setCuestionarioBloqueado(true);
        setProgresoCargado(true);
        return;
      }

      const user = JSON.parse(stored);

      const { data } = await supabase
        .from("progreso_inv")
        .select("respuestas, completada")
        .eq("user_codigo", user.codigo)
        .eq("unidad_slug", "unidad-7")
        .maybeSingle();

      if (!data && !CUESTIONARIOS_INV_DISPONIBLES_PARA_NUEVOS) {
        setCuestionarioBloqueado(true);
        setProgresoCargado(true);
        return;
      }

      if (data?.completada === true) {
        setUnidadCompletada(true);
        setCompletado(true);
        setMostrarCuestionario(false);
        setProgresoCargado(true);
        return;
      }

      if (data?.respuestas?.cuestionario_completado) {
        setCompletado(true);
        setMostrarCuestionario(false);
      }
      setProgresoCargado(true);
    };

    cargarProgreso();
  }, []);
  if (!progresoCargado) {
    return <p>Cargando progreso...</p>;
  }

  return (
    <div style={{ maxWidth: "980px" }}>
      <p
        style={{
          margin: "0 0 0.4rem 0",
          fontSize: "0.82rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#6b6f1a",
          fontWeight: 700,
        }}
      >
        Nivel Investigador
      </p>

      <h1 style={{ marginTop: 0 }}>
        Unidad 7: El billete como documento y fuente histórica
      </h1>

      <p style={{ color: "#555", lineHeight: 1.8 }}>
        El billete como documento y fuente histórica.
      </p>

      {modoRepaso && unidadCompletada && (
        <div
          style={{
            background: "#eef7ea",
            border: "1px solid #b9d7ad",
            borderRadius: "10px",
            padding: "1rem",
            marginTop: "1.5rem",
            color: "#2f5f24",
            lineHeight: 1.7,
          }}
        >
          <strong>Modo repaso — Unidad aprobada</strong>
          <br />
          Esta unidad ya forma parte de su formación aprobada. Puede volver a
          consultar todo el contenido y realizar el cuestionario como ejercicio
          de actualización. Las actividades realizadas en este modo no
          modificarán su progreso académico ni generarán una nueva revisión del
          Consejo Académico.
        </div>
      )}

      <div
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1.25rem",
          marginTop: "1.5rem",
        }}
      >
        {secciones.map((section) => (
          <section key={section.titulo} style={{ marginBottom: "1.8rem" }}>
            <h2 style={{ marginBottom: "0.8rem" }}>{section.titulo}</h2>

            <div style={{ lineHeight: 1.8 }}>
              {section.bloques.map((bloque, index) => {
                if (bloque.tipo === "texto") {
                  return (
                    <div key={index} style={{ marginBottom: "1rem" }}>
                      <ReactMarkdown>{bloque.contenido}</ReactMarkdown>
                    </div>
                  );
                }

                if (bloque.tipo === "tabla") {
                  return (
                    <TablaAcademica
                      key={index}
                      columnas={bloque.columnas}
                      filas={bloque.filas}
                    />
                  );
                }

                return null;
              })}
            </div>
          </section>
        ))}
      </div>

      <div
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1.25rem",
          marginTop: "1.5rem",
        }}
      >
        <h2>Cuestionario de retroalimentación</h2>

        <p style={{ lineHeight: 1.8, color: "#555" }}>
          Este cuestionario no tiene nota de aprobación. Su objetivo es reforzar
          los conceptos clave de la unidad antes de elaborar el trabajo escrito.
        </p>

        {cuestionarioBloqueado && (
          <div
            style={{
              background: "#fff8d9",
              border: "1px solid #dfc96d",
              borderRadius: "10px",
              padding: "1rem",
              color: "#66520a",
              lineHeight: 1.7,
            }}
          >
            <strong>Cuestionario en preparación.</strong> Puede estudiar el
            contenido completo de esta unidad. La evaluación se habilitará
            cuando la Academia publique oficialmente el Nivel Investigador.
          </div>
        )}

        {!cuestionarioBloqueado && !mostrarCuestionario && !completado && (
          <button
            onClick={() => setMostrarCuestionario(true)}
            style={{
              background: "#6b6f1a",
              color: "white",
              padding: "0.8rem 1.2rem",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Iniciar cuestionario
          </button>
        )}

        {!cuestionarioBloqueado &&
          mostrarCuestionario &&
          !completado &&
          pregunta && (
            <div style={{ marginTop: "1.5rem" }}>
              <p
                style={{
                  color: "#6b6f1a",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  fontSize: "0.82rem",
                  letterSpacing: "0.04em",
                }}
              >
                Pregunta {preguntaActual + 1} de {QUESTIONS.length}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.65rem",
                }}
              >
                <h3 style={{ margin: 0, flex: 1 }}>{pregunta.pregunta}</h3>
                {respuestaSeleccionada !== null && (
                  <span
                    role="status"
                    aria-label={
                      respuestaSeleccionada === pregunta.correcta
                        ? "Respuesta correcta"
                        : "Respuesta incorrecta"
                    }
                    style={{
                      flex: "0 0 auto",
                      color:
                        respuestaSeleccionada === pregunta.correcta
                          ? "#2f6a22"
                          : "#b3261e",
                      fontSize: "1.65rem",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {respuestaSeleccionada === pregunta.correcta ? "✓" : "✕"}
                  </span>
                )}
              </div>

              <div
                style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}
              >
                {pregunta.opciones.map((opcion, index) => (
                  <button
                    key={index}
                    onClick={() => responder(index)}
                    style={{
                      textAlign: "left",
                      padding: "0.9rem 1rem",
                      borderRadius: "10px",
                      border:
                        respuestaSeleccionada === index
                          ? "2px solid #6b6f1a"
                          : "1px solid #ddd4c7",
                      background:
                        respuestaSeleccionada === index ? "#f4f1e8" : "white",
                      cursor: "pointer",
                    }}
                  >
                    {opcion}
                  </button>
                ))}
              </div>

              {mostrarRetroalimentacion && (
                <div
                  style={{
                    marginTop: "1.25rem",
                    padding: "1rem",
                    background: "#f8ecec",
                    border: "1px solid #ebc8c8",
                    borderRadius: "10px",
                  }}
                >
                  <p
                    style={{
                      marginTop: 0,
                      fontWeight: 700,
                      color: "#8b2f2f",
                    }}
                  >
                    Respuesta incorrecta
                  </p>

                  <ReactMarkdown>{pregunta.explicacion}</ReactMarkdown>

                  <p style={{ marginBottom: 0 }}>
                    Vuelva a intentarlo seleccionando la respuesta correcta.
                  </p>
                </div>
              )}
            </div>
          )}

        {completado && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: "#eef6e9",
              border: "1px solid #cfe3c4",
              borderRadius: "10px",
            }}
          >
            {unidadCompletada ? (
              <>
                <h3 style={{ marginTop: 0 }}>✅ Unidad completada</h3>

                <p style={{ lineHeight: 1.8 }}>
                  Esta unidad ya fue aprobada por el Consejo Académico. Puede
                  continuar con la siguiente unidad del proceso de formación.
                </p>

                <Link
                  href="/miembros/proceso_inv"
                  style={{
                    display: "inline-block",
                    marginTop: "0.5rem",
                    background: "#6b6f1a",
                    color: "white",
                    padding: "0.8rem 1.2rem",
                    borderRadius: "8px",
                    textDecoration: "none",
                  }}
                >
                  Volver al proceso de formación
                </Link>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>Cuestionario completado</h3>

                <p style={{ lineHeight: 1.8 }}>
                  Ha completado las 25 preguntas de retroalimentación de esta
                  unidad y alcanzado el 50 %. El siguiente paso consiste en
                  elaborar un ensayo académico basado en uno de los temas
                  propuestos. La Unidad 7 se considerará completada cuando el
                  Consejo Académico apruebe el trabajo escrito.
                </p>

                <Link
                  href="/miembros/proceso_inv/unidad-7/ensayo"
                  style={{
                    display: "inline-block",
                    marginTop: "0.5rem",
                    background: "#6b6f1a",
                    color: "white",
                    padding: "0.8rem 1.2rem",
                    borderRadius: "8px",
                    textDecoration: "none",
                  }}
                >
                  Continuar al ensayo académico
                </Link>

                <p
                  style={{
                    marginTop: "1rem",
                    fontSize: "0.9rem",
                    color: "#666",
                  }}
                >
                  Nota: completar el cuestionario no desbloquea la siguiente
                  unidad. El desbloqueo ocurre cuando el Consejo Académico
                  aprueba el trabajo escrito correspondiente.
                </p>
              </>
            )}

            <button
              type="button"
              onClick={iniciarRepaso}
              style={{
                display: "inline-block",
                marginTop: "0.5rem",
                marginLeft: "0.65rem",
                background: "white",
                color: "#4d371c",
                padding: "0.75rem 1.1rem",
                borderRadius: "8px",
                border: "1px solid #9dbc91",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Repasar cuestionario
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
