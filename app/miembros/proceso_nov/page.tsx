"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

type ProgresoRow = {
  user_codigo: string;
  unidad_slug: string;
  completada: boolean;
  porcentaje: number;
  respuestas: any;
};

type Unidad = {
  slug: string;
  titulo: string;
  subtitulo?: string;
  href: string;
};

export default function ProcesoNovPage() {
  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);
  const [progreso, setProgreso] = useState<ProgresoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unidades: Unidad[] = useMemo(
    () => [
      {
        slug: "unidad-1",
        titulo: "Unidad 1",
        subtitulo: "Economía y medios de intercambio en la Guatemala prehispánica",
        href: "/miembros/proceso_nov/unidad-1",
      },
      {
        slug: "unidad-2",
        titulo: "Unidad 2",
        subtitulo: "El sistema monetario en la época colonial (1524–1733)",
        href: "/miembros/proceso_nov/unidad-2",
      },
      {
        slug: "unidad-3",
        titulo: "Unidad 3",
        subtitulo: "La Casa de Moneda de Guatemala y la acuñación colonial (1733–1821)",
        href: "/miembros/proceso_nov/unidad-3",
      },
      {
        slug: "unidad-4",
        titulo: "Unidad 4",
        subtitulo: "Independencia y transición monetaria en Centroamérica",
        href: "/miembros/proceso_nov/unidad-4",
      },
      {
        slug: "unidad-5",
        titulo: "Unidad 5",
        subtitulo: "La República y las primeras reformas monetarias",
        href: "/miembros/proceso_nov/unidad-5",
      },
      {
        slug: "unidad-6",
        titulo: "Unidad 6",
        subtitulo: "La Reforma Liberal y la modernización monetaria (1871–1924)",
        href: "/miembros/proceso_nov/unidad-6",
      },
      {
        slug: "unidad-7",
        titulo: "Unidad 7",
        subtitulo: "La reforma de 1924 y el nacimiento del quetzal",
        href: "/miembros/proceso_nov/unidad-7",
      },
      {
        slug: "unidad-8",
        titulo: "Unidad 8",
        subtitulo: "Evolución del sistema bancario en Guatemala",
        href: "/miembros/proceso_nov/unidad-8",
      },
      {
        slug: "unidad-9",
        titulo: "Unidad 9",
        subtitulo: "Historia del papel moneda guatemalteco",
        href: "/miembros/proceso_nov/unidad-9",
      },
      {
        slug: "unidad-10",
        titulo: "Unidad 10",
        subtitulo: "Fundamentos de notafilia y clasificación de billetes. Coleccionismo, conservación y mercado numismático",
        href: "/miembros/proceso_nov/unidad-10",
      },
      
    ],
    []
  );

  useEffect(() => {
    const cargar = async () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        window.location.href = "/login";
        return;
      }

      const parsed = JSON.parse(stored) as User;
      const consejoNormalizado =
        parsed.consejo === true ||
        parsed.consejo === "true" ||
        parsed.consejo === "TRUE" ||
        parsed.consejo === 1;

      setUser(parsed);
      setEsConsejo(consejoNormalizado);

      // Solo NOV o Consejo
      if (!consejoNormalizado && parsed.nivel !== "NOV") {
        setError("Esta sección corresponde al proceso de formación y acreditación del Nivel Novicio.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("progreso_novicio")
        .select("*")
        .eq("user_codigo", parsed.codigo);

      if (error) {
        setError(error.message);
      } else {
        setProgreso((data as ProgresoRow[]) || []);
      }

      setLoading(false);
    };

    cargar();
  }, []);

  const progresoMap = useMemo(() => {
    const map = new Map<string, ProgresoRow>();
    progreso.forEach((row) => map.set(row.unidad_slug, row));
    return map;
  }, [progreso]);

  const porcentajeGeneral = useMemo(() => {
    const unidadesEvaluables = unidades;
    const total = unidadesEvaluables.length;
    const sumado = unidadesEvaluables.reduce((acc, unidad) => {
      const row = progresoMap.get(unidad.slug);
      return acc + (row?.porcentaje || 0);
    }, 0);
    return total > 0 ? Math.round(sumado / total) : 0;
  }, [unidades, progresoMap]);

  const estaDesbloqueada = (index: number) => {
    if (esConsejo) return true;

    const unidad = unidades[index];

    if (index === 0) return true;

    const anterior = unidades[index - 1];
    return !!progresoMap.get(anterior.slug)?.completada;
  };

  const estadoUnidad = (slug: string) => {
    const row = progresoMap.get(slug);
    if (!row) return { porcentaje: 0, completada: false, preguntasCompletadas: 0 };

    return {
      porcentaje: row.porcentaje || 0,
      completada: !!row.completada,
      preguntasCompletadas: Number(
        row.respuestas?.preguntas_completadas ??
        row.respuestas?.pregunta_actual ??
        0
      ),
    };
  };

  if (loading) return <div>Cargando proceso de formación y acreditación...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!user) return <div>Cargando usuario...</div>;

  return (
    <div style={{ maxWidth: "980px" }}>
      <h1 style={{ marginTop: 0 }}>Proceso de Formación y Acreditación — Nivel Novicio</h1>

      <p style={{ lineHeight: 1.8 }}>
        El <strong>Nivel Novicio</strong> corresponde a la etapa inicial de formación
        académica dentro de la Academia. En ella se ubican aquellos miembros que
        han demostrado interés sostenido por la numismática y la notafilia, así como
        un conocimiento básico del campo, encontrándose en proceso de consolidación
        de criterios académicos, históricos y metodológicos.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Este nivel está concebido como una fase de formación progresiva, orientada
        a proporcionar al participante una comprensión sólida de los fundamentos del
        dinero, la evolución de los sistemas monetarios y el desarrollo histórico de
        la numismática y la notafilia, con especial atención al caso guatemalteco.
      </p>

      <div
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          margin: "1.5rem 0",
        }}
      >
        <p style={{ marginTop: 0, marginBottom: "0.6rem" }}>
          <strong>Avance general:</strong> {porcentajeGeneral}%
        </p>

        <div
          style={{
            width: "100%",
            height: "14px",
            background: "#e6dfd1",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${porcentajeGeneral}%`,
              height: "100%",
              background: "#6b6f1a",
            }}
          />
        </div>

        {esConsejo && (
          <p style={{ marginBottom: 0, marginTop: "0.8rem", color: "#555" }}>
            Modo Consejo Académico: todas las unidades están visibles sin restricción.
          </p>
        )}
      </div>

      <h2>Estructura del Nivel Novicio</h2>

      <p style={{ lineHeight: 1.8 }}>
        El Nivel Novicio está compuesto por diez unidades temáticas, organizadas de
        manera progresiva. El recorrido inicia con los sistemas de intercambio
        prehispánicos y avanza por la historia monetaria de Guatemala hasta el
        desarrollo del papel moneda, las instituciones bancarias y los fundamentos
        de la notafilia, la clasificación, la conservación y el coleccionismo.
      </p>

      <h2>Instrucciones para el participante</h2>

      <p style={{ lineHeight: 1.8 }}>
        Al ingresar a cada unidad, el participante encontrará en primer término el
        contenido teórico correspondiente al tema. Se recomienda leer cuidadosamente
        este material, pues constituye la base necesaria para la evaluación de la
        unidad.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Al finalizar cada unidad, el usuario deberá completar un cuestionario. Cada
        pregunta incluirá retroalimentación, con el propósito de reforzar el
        aprendizaje y favorecer una comprensión más sólida de los contenidos,
        independientemente de si la respuesta ha sido correcta o incorrecta.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Para avanzar a la siguiente unidad, será necesario completar satisfactoriamente
        el cuestionario correspondiente. Este sistema busca garantizar una formación
        ordenada, progresiva y académicamente consistente.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        La aprobación del cuestionario de la <strong>Unidad 10</strong> constituye
        la finalización del Nivel Novicio. No se requiere una tarea, ensayo o
        evaluación adicional.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Al completar satisfactoriamente las diez unidades, el miembro habrá
        <strong> aprobado el Nivel Novicio</strong>. El sistema generará su
        certificado institucional correspondiente y registrará la finalización
        de esta etapa formativa.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Inmediatamente después, el sistema actualizará su categoría a{" "}
        <strong>Académico Investigador</strong>, le asignará un nuevo código
        institucional con prefijo INV y habilitará su acceso al{" "}
        <strong>Proceso de Formación y Acreditación — Nivel Investigador</strong>.
        Su contraseña personal continuará siendo la misma.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        El miembro recibirá además un correo de felicitación con la confirmación
        de su ascenso, su nuevo código institucional y la indicación de que su
        certificado se encuentra disponible en el área privada de la Academia.
      </p>

      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          marginTop: "1.5rem",
        }}
      >
        {unidades.map((unidad, index) => {
          const desbloqueada = estaDesbloqueada(index);
          const estado = estadoUnidad(unidad.slug);

          return (
            <div
              key={unidad.slug}
              style={{
                background: "white",
                border: "1px solid #ddd4c7",
                borderRadius: "12px",
                padding: "1rem",
                opacity: desbloqueada ? 1 : 0.6,
              }}
            >
              <p
                style={{
                  marginTop: 0,
                  marginBottom: "0.4rem",
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "#6b6f1a",
                  fontWeight: 700,
                }}
              >
                Unidad de formación
              </p>

              <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
                {unidad.titulo}
              </h3>

              {unidad.subtitulo && (
                <p style={{ marginTop: 0, color: "#555", lineHeight: 1.6 }}>
                  {unidad.subtitulo}
                </p>
              )}

              <p style={{ marginBottom: "0.5rem" }}>
                <strong>Avance:</strong> {estado.porcentaje}%
              </p>

              <div
                style={{
                  width: "100%",
                  height: "10px",
                  background: "#e6dfd1",
                  borderRadius: "999px",
                  overflow: "hidden",
                  marginBottom: "0.8rem",
                }}
              >
                <div
                  style={{
                    width: `${estado.porcentaje}%`,
                    height: "100%",
                    background: estado.completada ? "#4f7f3b" : "#6b6f1a",
                  }}
                />
              </div>

              <p style={{ marginTop: 0, marginBottom: "1rem", color: "#555" }}>
                {estado.completada
                  ? "Unidad completada."
                  : desbloqueada && estado.porcentaje > 0
                  ? `Cuestionario en progreso: ${estado.porcentaje}% completado.`
                  : desbloqueada
                  ? "Unidad disponible."
                  : "Debes completar la unidad anterior para desbloquear esta sección."}
              </p>

              {desbloqueada ? (
                <Link
                  href={unidad.href}
                  style={{
                    display: "inline-block",
                    background: "#6b6f1a",
                    color: "white",
                    padding: "0.7rem 1rem",
                    borderRadius: "8px",
                    textDecoration: "none",
                  }}
                >
                  {estado.completada
                    ? "Revisar unidad"
                    : estado.porcentaje > 0
                    ? "Continuar cuestionario"
                    : "Ingresar"}
                </Link>
              ) : (
                <button
                  disabled
                  style={{
                    background: "#bbb",
                    color: "white",
                    padding: "0.7rem 1rem",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "not-allowed",
                  }}
                >
                  Bloqueada
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}