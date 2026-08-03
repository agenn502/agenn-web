"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { TEORIA, QUESTIONS } from "@/content/proceso_inv/unidad1";
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

export default function Unidad1InvestigadorPage() {
  const secciones = TEORIA as Seccion[];

  const [mostrarCuestionario, setMostrarCuestionario] = useState(false);
  const [preguntaActual, setPreguntaActual] = useState(24);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<number | null>(null);
  const [mostrarRetroalimentacion, setMostrarRetroalimentacion] = useState(false);
  const [completado, setCompletado] = useState(false);
  const [unidadCompletada, setUnidadCompletada] = useState(false);
  const [progresoCargado, setProgresoCargado] = useState(false);

  const pregunta = QUESTIONS[preguntaActual];

  const responder = async (index: number) => {
    setRespuestaSeleccionada(index);

    if (index === pregunta.correcta) {
      setMostrarRetroalimentacion(false);

      setTimeout(() => {
        setRespuestaSeleccionada(null);

        if (preguntaActual === QUESTIONS.length - 1) {
		  guardarProgresoCuestionario();

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
        unidad_slug: "unidad-1",
        completada: false,
        porcentaje: 25,
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
};
useEffect(() => {
  const cargarProgreso = async () => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      setProgresoCargado(true);
      return;
    }

    const user = JSON.parse(stored);

    const { data } = await supabase
	  .from("progreso_inv")
	  .select("respuestas, completada")
	  .eq("user_codigo", user.codigo)
	  .eq("unidad_slug", "unidad-1")
	  .maybeSingle();

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
        Unidad 1: Economía y medios de intercambio en la Guatemala prehispánica
      </h1>

      <p style={{ color: "#555", lineHeight: 1.8 }}>
        Economía y medios de intercambio en la Guatemala prehispánica: el
        origen del valor antes de la moneda.
      </p>

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
          los conceptos clave de la unidad antes de elaborar el ensayo.
        </p>

        {!mostrarCuestionario && !completado && (
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
                  Vuelve a intentarlo seleccionando la respuesta correcta.
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
				  Esta unidad ya fue aprobada por el Consejo Académico.
				  Puede continuar con la siguiente unidad del proceso de ascenso.
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
				  Volver al proceso de ascenso
				</Link>
			  </>
			) : (
			  <>
				<h3 style={{ marginTop: 0 }}>Cuestionario completado</h3>

				<p style={{ lineHeight: 1.8 }}>
				  Has completado las 25 preguntas de retroalimentación de esta unidad.

				  El siguiente paso consiste en elaborar y publicar un ensayo académico
				  basado en uno de los temas propuestos para esta unidad.

				  La Unidad 1 únicamente se considerará completada cuando el ensayo haya sido
				  publicado en la plataforma de la Academia y se haya registrado correctamente
				  la evidencia de su difusión en redes sociales.
				</p>

				<Link
				  href="/miembros/proceso_inv/unidad-1/ensayo"
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
				  Continuar al ensayo
				</Link>

				<p
				  style={{
					marginTop: "1rem",
					fontSize: "0.9rem",
					color: "#666",
				  }}
				>
				  Nota: completar el cuestionario no desbloquea la siguiente unidad. El
				  desbloqueo ocurre al finalizar satisfactoriamente el proceso de ensayo y
				  difusión correspondiente.
				</p>
			  </>
			)}
		  </div>
		)}
      </div>
    </div>
  );
}