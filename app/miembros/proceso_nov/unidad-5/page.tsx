"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { TEORIA, QUESTIONS } from "@/content/proceso_nov/unidad5";
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

export default function Unidad5NovicioPage() {
  const secciones = TEORIA as Seccion[];

  const [mostrarCuestionario, setMostrarCuestionario] = useState(false);
  const [preguntaActual, setPreguntaActual] = useState(0);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<number | null>(null);
  const [mostrarRetroalimentacion, setMostrarRetroalimentacion] = useState(false);
  const [completado, setCompletado] = useState(false);
  const [progresoCargado, setProgresoCargado] = useState(false);
  const [avanceGuardado, setAvanceGuardado] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const pregunta = QUESTIONS[preguntaActual];

  const guardarAvanceParcial = async (preguntasCompletadas: number) => {
    const stored = localStorage.getItem("user");
    if (!stored) return false;

    const user = JSON.parse(stored);
    const porcentaje = Math.round(
      (preguntasCompletadas / QUESTIONS.length) * 100
    );

    const { error } = await supabase.from("progreso_novicio").upsert(
      [
        {
          user_codigo: user.codigo,
          unidad_slug: "unidad-5",
          completada: false,
          porcentaje,
          respuestas: {
            cuestionario_completado: false,
            preguntas_completadas: preguntasCompletadas,
            pregunta_actual: preguntasCompletadas,
            total_preguntas: QUESTIONS.length,
            fecha: new Date().toISOString(),
          },
          fecha_actualizacion: new Date().toISOString(),
        },
      ],
      { onConflict: "user_codigo,unidad_slug" }
    );

    if (error) {
      console.error("Error guardando avance parcial de NOV U5:", error);
      return false;
    }

    setAvanceGuardado(preguntasCompletadas);
    return true;
  };

  const guardarProgresoCuestionario = async () => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      setErrorGuardado(
        "No se encontró la sesión local del usuario. Inicie sesión nuevamente antes de completar la unidad."
      );
      return false;
    }

    const user = JSON.parse(stored);

    setGuardando(true);
    setErrorGuardado(null);

    const { error } = await supabase.from("progreso_novicio").upsert(
      [
        {
          user_codigo: user.codigo,
          unidad_slug: "unidad-5",
          completada: true,
          porcentaje: 100,
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
      }
    );

    setGuardando(false);

    if (error) {
      console.error("Error guardando progreso de NOV U5:", error);
      setErrorGuardado(
        "El cuestionario terminó, pero no fue posible registrar el progreso. Intente nuevamente antes de salir de la página."
      );
      return false;
    }

    return true;
  };

  const responder = async (index: number) => {
    if (!pregunta || guardando) return;

    setRespuestaSeleccionada(index);

    if (index === pregunta.correcta) {
      setMostrarRetroalimentacion(false);

      setTimeout(async () => {
        setRespuestaSeleccionada(null);

        if (preguntaActual === QUESTIONS.length - 1) {
          const guardado = await guardarProgresoCuestionario();

          if (guardado) {
            setAvanceGuardado(QUESTIONS.length);
            setCompletado(true);
            setMostrarCuestionario(false);
          }
        } else {
          const siguientePregunta = preguntaActual + 1;
          const guardado = await guardarAvanceParcial(siguientePregunta);

          if (guardado) {
            setPreguntaActual(siguientePregunta);
          } else {
            setErrorGuardado(
              "La respuesta fue correcta, pero no fue posible guardar el avance. Intente nuevamente antes de continuar."
            );
          }
        }
      }, 600);
    } else {
      setMostrarRetroalimentacion(true);
    }
  };

  const reintentarGuardado = async () => {
    const guardado = await guardarProgresoCuestionario();

    if (guardado) {
      setCompletado(true);
      setMostrarCuestionario(false);
    }
  };

  useEffect(() => {
    const cargarProgreso = async () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        setProgresoCargado(true);
        return;
      }

      const user = JSON.parse(stored);

      const { data, error } = await supabase
        .from("progreso_novicio")
        .select("respuestas, completada")
        .eq("user_codigo", user.codigo)
        .eq("unidad_slug", "unidad-5")
        .maybeSingle();

      if (error) {
        console.error("Error cargando progreso de NOV U5:", error);
      }

      if (data?.completada === true || data?.respuestas?.cuestionario_completado) {
        setAvanceGuardado(QUESTIONS.length);
        setCompletado(true);
        setMostrarCuestionario(false);
      } else {
        const guardadas = Number(
          data?.respuestas?.preguntas_completadas ??
          data?.respuestas?.pregunta_actual ??
          0
        );

        if (guardadas > 0 && guardadas < QUESTIONS.length) {
          setAvanceGuardado(guardadas);
          setPreguntaActual(guardadas);
        }
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
        Nivel Novicio
      </p>

      <h1 style={{ marginTop: 0 }}>
        Unidad 5: La República de Guatemala y los pesos carrereños
      </h1>

      <p style={{ color: "#555", lineHeight: 1.8 }}>
        De la moneda federal a las acuñaciones republicanas de Rafael Carrera: continuidad de reales, pesos y circulación internacional.
      </p>

      {avanceGuardado > 0 && !completado && (
        <div
          style={{
            background: "#f4f1e8",
            border: "1px solid #ddd4c7",
            borderRadius: "10px",
            padding: "0.9rem 1rem",
            marginTop: "1rem",
          }}
        >
          <strong>
            Cuestionario en progreso: {avanceGuardado} de {QUESTIONS.length} preguntas completadas.
          </strong>{" "}
          <a
            href="#cuestionario"
            onClick={() => {
              setPreguntaActual(avanceGuardado);
              setRespuestaSeleccionada(null);
              setMostrarRetroalimentacion(false);
              setErrorGuardado(null);
              setMostrarCuestionario(true);
            }}
            style={{ color: "#6b6f1a", fontWeight: 700 }}
          >
            Continuar cuestionario
          </a>
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
        id="cuestionario"
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1.25rem",
          marginTop: "1.5rem",
          scrollMarginTop: "1rem",
        }}
      >
        <h2>Cuestionario de retroalimentación</h2>

        <p style={{ lineHeight: 1.8, color: "#555" }}>
          Este cuestionario no tiene nota de aprobación. Su objetivo es reforzar
          los conceptos clave de la unidad. Cada respuesta incorrecta mostrará
          una explicación y podrá intentarlo nuevamente.
        </p>

        {!mostrarCuestionario && !completado && (
          <button
            onClick={() => {
              setPreguntaActual(avanceGuardado > 0 ? avanceGuardado : 0);
              setRespuestaSeleccionada(null);
              setMostrarRetroalimentacion(false);
              setErrorGuardado(null);
              setMostrarCuestionario(true);
            }}
            style={{
              background: "#6b6f1a",
              color: "white",
              padding: "0.8rem 1.2rem",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {avanceGuardado > 0 ? "Continuar cuestionario" : "Iniciar cuestionario"}
          </button>
        )}

        {mostrarCuestionario && !completado && pregunta && (
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

            <h3>{pregunta.pregunta}</h3>

            <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
              {pregunta.opciones.map((opcion, index) => (
                <button
                  key={index}
                  disabled={guardando}
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
                    cursor: guardando ? "wait" : "pointer",
                    opacity: guardando ? 0.7 : 1,
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

            {guardando && (
              <p style={{ marginTop: "1rem", color: "#666" }}>
                Registrando la unidad completada...
              </p>
            )}
          </div>
        )}

        {errorGuardado && !completado && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "1rem",
              background: "#fff4e5",
              border: "1px solid #f0d2a4",
              borderRadius: "10px",
            }}
          >
            <p style={{ marginTop: 0 }}>{errorGuardado}</p>

            <button
              onClick={reintentarGuardado}
              disabled={guardando}
              style={{
                background: "#6b6f1a",
                color: "white",
                padding: "0.7rem 1rem",
                border: "none",
                borderRadius: "8px",
                cursor: guardando ? "wait" : "pointer",
              }}
            >
              {guardando ? "Guardando..." : "Reintentar registro"}
            </button>
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
            <h3 style={{ marginTop: 0 }}>✅ Unidad completada</h3>

            <p style={{ lineHeight: 1.8 }}>
              Ha completado las {QUESTIONS.length} preguntas de retroalimentación.
              La Unidad 5 ha quedado registrada como finalizada y puede continuar
              con la siguiente unidad del Nivel Novicio.
            </p>

            <Link
              href="/miembros/proceso_nov"
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
              Volver al proceso de ascenso
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}