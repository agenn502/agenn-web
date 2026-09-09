"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { obtenerReglaTrabajoInv } from "@/content/proceso_inv/config";

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

type EnsayoRevision = {
  id: number;
  unidad_slug: string;
  estado: string | null;
  estado_revision: string | null;
  observaciones_revision: string | null;
  fecha_revision: string | null;
  slug: string | null;
};

type Unidad = {
  slug: string;
  titulo: string;
  subtitulo?: string;
  href: string;
};

export default function ProcesoInvPage() {
  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);
  const [progreso, setProgreso] = useState<ProgresoRow[]>([]);
  const [ensayosRevision, setEnsayosRevision] = useState<EnsayoRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unidades: Unidad[] = useMemo(
    () => [
      {
        slug: "unidad-1",
        titulo: "Unidad 1",
        subtitulo:
          "Introducción a la investigación numismática y notafílica",
        href: "/miembros/proceso_inv/unidad-1",
      },
      {
        slug: "unidad-2",
        titulo: "Unidad 2",
        subtitulo:
          "Búsqueda de evidencia y construcción del corpus documental",
        href: "/miembros/proceso_inv/unidad-2",
      },
      {
        slug: "unidad-3",
        titulo: "Unidad 3",
        subtitulo:
          "Evaluación crítica y contraste de fuentes",
        href: "/miembros/proceso_inv/unidad-3",
      },
      {
        slug: "unidad-4",
        titulo: "Unidad 4",
        subtitulo:
          "Identificación, clasificación y catalogación numismática",
        href: "/miembros/proceso_inv/unidad-4",
      },
      {
        slug: "unidad-5",
        titulo: "Unidad 5",
        subtitulo:
          "Reconstrucción de sistemas monetarios mediante evidencia",
        href: "/miembros/proceso_inv/unidad-5",
      },
      {
        slug: "unidad-6",
        titulo: "Unidad 6",
        subtitulo:
          "La exonumia como campo de investigación histórica",
        href: "/miembros/proceso_inv/unidad-6",
      },
      {
        slug: "unidad-7",
        titulo: "Unidad 7",
        subtitulo:
          "El billete como documento y fuente histórica",
        href: "/miembros/proceso_inv/unidad-7",
      },
      {
        slug: "unidad-8",
        titulo: "Unidad 8",
        subtitulo:
          "De la evidencia a la inferencia y la explicación",
        href: "/miembros/proceso_inv/unidad-8",
      },
      {
        slug: "unidad-9",
        titulo: "Unidad 9",
        subtitulo:
          "Argumentación y escritura del ensayo académico",
        href: "/miembros/proceso_inv/unidad-9",
      },
      {
        slug: "unidad-10",
        titulo: "Unidad 10",
        subtitulo:
          "Diseño de una propuesta de investigación propia",
        href: "/miembros/proceso_inv/unidad-10",
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

      if (!consejoNormalizado && parsed.nivel !== "INV") {
        setError(
          "Esta sección corresponde al proceso de ascenso del Nivel Investigador."
        );
        setLoading(false);
        return;
      }

      const { data: progresoData, error: progresoError } =
        await supabase
          .from("progreso_inv")
          .select("*")
          .eq("user_codigo", parsed.codigo);

      if (progresoError) {
        setError(progresoError.message);
        setLoading(false);
        return;
      }

      setProgreso((progresoData as ProgresoRow[]) || []);

      const { data: ensayosData, error: ensayosError } =
        await supabase
          .from("ensayos")
          .select(`
            id,
            unidad_slug,
            estado,
            estado_revision,
            observaciones_revision,
            fecha_revision,
            slug,
            updated_at
          `)
          .eq("autor_codigo", parsed.codigo)
          .eq("proceso", "INV")
          .order("updated_at", { ascending: false });

      if (ensayosError) {
        setError(ensayosError.message);
        setLoading(false);
        return;
      }

      setEnsayosRevision(
        (ensayosData as EnsayoRevision[]) || []
      );

      setLoading(false);
    };

    cargar();
  }, []);

  const progresoMap = useMemo(() => {
    const map = new Map<string, ProgresoRow>();

    progreso.forEach((row) => {
      map.set(row.unidad_slug, row);
    });

    return map;
  }, [progreso]);

  const ensayoRevisionMap = useMemo(() => {
    const map = new Map<string, EnsayoRevision>();

    ensayosRevision.forEach((row) => {
      if (!map.has(row.unidad_slug)) {
        map.set(row.unidad_slug, row);
      }
    });

    return map;
  }, [ensayosRevision]);

  const porcentajeGeneral = useMemo(() => {
    const total = unidades.length;

    const sumado = unidades.reduce((acc, unidad) => {
      const row = progresoMap.get(unidad.slug);
      return acc + (row?.porcentaje || 0);
    }, 0);

    return total > 0
      ? Math.round(sumado / total)
      : 0;
  }, [unidades, progresoMap]);

  const estaDesbloqueada = (index: number) => {
    if (esConsejo) return true;

    if (index === 0) return true;

    const anterior = unidades[index - 1];

    return !!progresoMap.get(anterior.slug)?.completada;
  };

  const estadoUnidad = (slug: string) => {
    const row = progresoMap.get(slug);

    if (!row) {
      return {
        porcentaje: 0,
        completada: false,
      };
    }

    return {
      porcentaje: row.porcentaje || 0,
      completada: !!row.completada,
    };
  };

  /*
   * Cada unidad dispone de una página para desarrollar su trabajo académico.
   */
  const rutaTrabajo = (slug: string) => {
    if (!/^unidad-(?:[1-9]|10)$/.test(slug)) return null;
    return `/miembros/proceso_inv/${slug}/ensayo`;
  };

  const obtenerAccionUnidad = (
    unidad: Unidad,
    porcentaje: number,
    completada: boolean,
    ensayo?: EnsayoRevision
  ) => {
    const trabajoHref = rutaTrabajo(unidad.slug);
    const reglaTrabajo = obtenerReglaTrabajoInv(unidad.slug);

    if (completada || porcentaje >= 100) {
      return {
        texto: "Revisar unidad",
        href: unidad.href,
        bloqueado: false,
      };
    }

    /*
     * Todavía no se ha completado el cuestionario.
     * Si existe algún avance, ofrecemos continuarlo.
     */
    if (porcentaje < 50) {
      return {
        texto:
          porcentaje > 0
            ? "Continuar cuestionario"
            : "Ingresar a la unidad",
        href: unidad.href,
        bloqueado: false,
      };
    }

    /*
     * Si se recibe un identificador de unidad inválido, no se ofrece ruta de trabajo.
     */
    if (!trabajoHref) {
      return {
        texto: "Ingresar",
        href: unidad.href,
        bloqueado: false,
      };
    }

    /*
     * Cuestionario terminado pero todavía
     * no existe trabajo escrito.
     */
    if (!ensayo) {
      return {
        texto: `Iniciar ${reglaTrabajo?.nombre.toLowerCase() || "trabajo académico"}`,
        href: trabajoHref,
        bloqueado: false,
      };
    }

    /*
     * Borrador existente.
     */
    if (
      ensayo.estado === "borrador" &&
      !ensayo.estado_revision
    ) {
      return {
        texto: `Continuar ${reglaTrabajo?.nombre.toLowerCase() || "trabajo académico"}`,
        href: trabajoHref,
        bloqueado: false,
      };
    }

    /*
     * Trabajo enviado al CA.
     */
    if (ensayo.estado_revision === "pendiente") {
      return {
        texto: "Trabajo en revisión",
        href: trabajoHref,
        bloqueado: false,
      };
    }

    /*
     * Compatibilidad con el flujo antiguo:
     * rechazado equivale a correcciones.
     */
    if (
      ensayo.estado_revision === "correcciones" ||
      ensayo.estado_revision === "rechazado"
    ) {
      return {
        texto: "Corregir trabajo",
        href: trabajoHref,
        bloqueado: false,
      };
    }

    /* El CA completa la unidad al aprobar el trabajo. */
    if (ensayo.estado_revision === "aprobado") {
      return {
        texto: "Revisar unidad",
        href: unidad.href,
        bloqueado: false,
      };
    }

    return {
      texto: "Continuar trabajo",
      href: trabajoHref,
      bloqueado: false,
    };
  };

  if (loading) {
    return <div>Cargando proceso de ascenso...</div>;
  }

  if (error) {
    return (
      <div style={{ color: "red" }}>
        Error: {error}
      </div>
    );
  }

  if (!user) {
    return <div>Cargando usuario...</div>;
  }

  return (
    <div style={{ maxWidth: "980px" }}>
      <h1 style={{ marginTop: 0 }}>
        Proceso de Formación y Acreditación — Nivel
        Investigador
      </h1>

      <p style={{ lineHeight: 1.8 }}>
        El <strong>Nivel Investigador</strong> tiene como
        finalidad desarrollar la capacidad del participante
        para convertir una pregunta numismática o notafílica
        en un problema de investigación, localizar y evaluar
        evidencia, contrastar interpretaciones y comunicar
        conclusiones propias debidamente sustentadas.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        A diferencia del Nivel Novicio, en esta etapa el
        participante no se limita a conocer y comprender los
        principales procesos históricos y numismáticos. Cada
        unidad incorpora progresivamente herramientas de
        análisis, interpretación crítica de fuentes y
        producción académica.
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
        <p
          style={{
            marginTop: 0,
            marginBottom: "0.6rem",
          }}
        >
          <strong>Avance general:</strong>{" "}
          {porcentajeGeneral}%
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
          <p
            style={{
              marginBottom: 0,
              marginTop: "0.8rem",
              color: "#555",
            }}
          >
            Modo Consejo Académico: todas las unidades
            están visibles sin restricción.
          </p>
        )}
      </div>

      <h2>Estructura del Nivel Investigador</h2>

      <p style={{ lineHeight: 1.8 }}>
        El Nivel Investigador está compuesto por diez
        unidades de formación. En cada una, el participante
        deberá estudiar el contenido, completar un
        cuestionario de retroalimentación y desarrollar un
        trabajo académico cuya extensión y exigencia aumentarán
        progresivamente a lo largo del nivel.
      </p>

      <div
        style={{
          display: "grid",
          gap: "12px",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          margin: "1.25rem 0 1.75rem",
        }}
      >
        {[
          {
            unidades: "Unidades 1–3",
            producto: "Análisis breve",
            extension: "Entre 1 y 2 páginas; mínimo 500 palabras.",
          },
          {
            unidades: "Unidades 4–6",
            producto: "Nota de investigación",
            extension: "Entre 2 y 3 páginas; mínimo 800 palabras.",
          },
          {
            unidades: "Unidades 7–10",
            producto: "Ensayo académico",
            extension: "Más de 3 páginas; mínimo 1,200 palabras.",
          },
        ].map((etapa) => (
          <div
            key={etapa.unidades}
            style={{
              background: "#f8f5ee",
              border: "1px solid #ddd4c7",
              borderRadius: "12px",
              padding: "1rem",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#6b6f1a",
                fontSize: "0.8rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {etapa.unidades}
            </p>
            <h3 style={{ margin: "0.45rem 0" }}>{etapa.producto}</h3>
            <p style={{ margin: 0, color: "#555", lineHeight: 1.6 }}>
              {etapa.extension}
            </p>
          </div>
        ))}
      </div>

      <h2>Instrucciones para el participante</h2>

      <p style={{ lineHeight: 1.8 }}>
        El cuestionario constituye una etapa formativa
        previa a la investigación. Su finalidad es comprobar
        que el participante comprende los conceptos y
        herramientas necesarios antes de desarrollar el
        trabajo académico correspondiente. El cuestionario representa
        el 50 % del avance de la unidad y el trabajo escrito completa
        el 50 % restante después de su aprobación.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Una vez completado el cuestionario, deberá elaborar
        el trabajo académico solicitado en la unidad.
        Podrá guardar su trabajo como borrador y continuar
        desarrollándolo en sesiones posteriores.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Cuando considere finalizado su trabajo, deberá
        enviarlo al <strong>Consejo Académico</strong>. El
        Consejo podrá aprobarlo o devolverlo con
        observaciones para su corrección.
        El Consejo podrá seleccionar trabajos destacados para su
        incorporación al proceso editorial de Revista AGENN; esta
        selección es independiente de la aprobación académica.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Los trabajos aprobados formarán parte de la sección de{" "}
        <strong>Producción académica</strong>, donde podrán consultarse
        según su tipo. Su incorporación a Revista AGENN no será automática:
        dependerá de la selección y del proceso editorial correspondientes.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        La unidad se considerará completada cuando el Consejo
        Académico apruebe el trabajo escrito. Solo entonces
        se desbloqueará la siguiente unidad.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Una vez completadas satisfactoriamente las diez
        unidades del Nivel Investigador, el miembro habrá
        concluido su proceso de formación y obtendrá la{" "}
        <strong>
          acreditación como Académico Investigador
        </strong>
        , acompañada de su correspondiente certificado
        institucional.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        La categoría de Académico Investigador constituye un
        nivel académico pleno dentro de la Academia y puede
        mantenerse de forma indefinida. Aquellos miembros
        que posteriormente deseen aspirar a la categoría
        superior de <strong>Académico Numerario</strong>{" "}
        podrán iniciar voluntariamente el Proceso NUM,
        sujeto a los requisitos académicos establecidos por
        el Consejo Académico.
      </p>

      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          marginTop: "1.5rem",
        }}
      >
        {unidades.map((unidad, index) => {
          const desbloqueada = estaDesbloqueada(index);
          const estado = estadoUnidad(unidad.slug);
          const reglaTrabajo = obtenerReglaTrabajoInv(unidad.slug);
          const revision =
            ensayoRevisionMap.get(unidad.slug);

          const accion = obtenerAccionUnidad(
            unidad,
            estado.porcentaje,
            estado.completada,
            revision
          );

          const revisionAcademicaPendiente =
            revision?.estado_revision === "pendiente";

          const correccionesAcademicas =
            revision?.estado_revision === "correcciones" ||
            revision?.estado_revision === "rechazado";

          const aprobadoAcademicamente =
            revision?.estado_revision === "aprobado";

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

              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "0.5rem",
                }}
              >
                {unidad.titulo}
              </h3>

              {unidad.subtitulo && (
                <p
                  style={{
                    marginTop: 0,
                    color: "#555",
                    lineHeight: 1.6,
                  }}
                >
                  {unidad.subtitulo}
                </p>
              )}

              {reglaTrabajo && (
                <div
                  style={{
                    background: "#f8f5ee",
                    borderRadius: "8px",
                    padding: "0.65rem 0.75rem",
                    marginBottom: "0.9rem",
                    color: "#4d4337",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>{reglaTrabajo.nombre}</strong>
                  <br />
                  {reglaTrabajo.indicacionExtension} Mínimo{" "}
                  {reglaTrabajo.palabrasMinimas.toLocaleString("es-GT")} palabras.
                </div>
              )}

              <p
                style={{
                  marginBottom: "0.5rem",
                }}
              >
                <strong>Avance:</strong>{" "}
                {estado.porcentaje}%
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
                    background: estado.completada
                      ? "#4f7f3b"
                      : "#6b6f1a",
                  }}
                />
              </div>

              {!desbloqueada && (
                <p
                  style={{
                    marginTop: 0,
                    marginBottom: "1rem",
                    color: "#555",
                  }}
                >
                  Debe completar la unidad anterior para
                  desbloquear esta sección.
                </p>
              )}

              {desbloqueada &&
                !estado.completada &&
                estado.porcentaje < 50 && (
                  <div
                    style={{
                      background: "#f4f1e8",
                      border: "1px solid #ddd4c7",
                      borderRadius: "10px",
                      padding: "0.75rem",
                      marginBottom: "1rem",
                      color: "#555",
                      lineHeight: 1.6,
                    }}
                  >
                    {estado.porcentaje > 0 ? (
                      <>
                        <strong>
                          Cuestionario en curso
                        </strong>
                        <br />
                        Puede continuar desde el punto en
                        que dejó su evaluación.
                      </>
                    ) : (
                      <>
                        <strong>Unidad disponible</strong>
                        <br />
                        Puede iniciar el estudio de esta
                        unidad.
                      </>
                    )}
                  </div>
                )}

              {desbloqueada &&
                !estado.completada &&
                estado.porcentaje >= 50 &&
                !revision &&
                rutaTrabajo(unidad.slug) && (
                  <div
                    style={{
                      background: "#f4f1e8",
                      border: "1px solid #ddd4c7",
                      borderRadius: "10px",
                      padding: "0.75rem",
                      marginBottom: "1rem",
                      color: "#555",
                      lineHeight: 1.6,
                    }}
                  >
                    <strong>
                      ✓ Cuestionario completado
                    </strong>
                    <br />
                    Puede iniciar ahora el producto
                    investigativo de esta unidad.
                  </div>
                )}

              {revision?.estado === "borrador" &&
                !revision.estado_revision &&
                !estado.completada && (
                  <div
                    style={{
                      background: "#f4f1e8",
                      border: "1px solid #ddd4c7",
                      borderRadius: "10px",
                      padding: "0.75rem",
                      marginBottom: "1rem",
                      color: "#555",
                      lineHeight: 1.6,
                    }}
                  >
                    <strong>
                      ✎ Trabajo guardado como borrador
                    </strong>
                    <br />
                    Puede continuar desarrollando su
                    trabajo desde donde lo dejó.
                  </div>
                )}

              {revisionAcademicaPendiente &&
                !estado.completada && (
                  <div
                    style={{
                      background: "#fff8e5",
                      border: "1px solid #e0c46c",
                      borderRadius: "10px",
                      padding: "0.75rem",
                      marginBottom: "1rem",
                      color: "#6a5200",
                      lineHeight: 1.6,
                    }}
                  >
                    <strong>
                      ⏳ Trabajo pendiente de revisión
                    </strong>
                    <br />
                    Su trabajo fue enviado al Consejo
                    Académico. Mientras se encuentre en
                    revisión no podrá editarlo.
                  </div>
                )}

              {correccionesAcademicas &&
                !estado.completada && (
                  <div
                    style={{
                      background: "#fff3f3",
                      border: "1px solid #d28b8b",
                      borderRadius: "10px",
                      padding: "0.75rem",
                      marginBottom: "1rem",
                      color: "#7a1f1f",
                      lineHeight: 1.6,
                    }}
                  >
                    <strong>
                      ⚠ Correcciones académicas
                      pendientes
                    </strong>
                    <br />
                    El Consejo Académico devolvió su
                    trabajo con observaciones. Ingrese al
                    trabajo para revisarlas y presentar una
                    nueva versión.
                  </div>
                )}

              {aprobadoAcademicamente &&
                !estado.completada && (
                  <div
                    style={{
                      background: "#eef7ea",
                      border: "1px solid #b9d7ad",
                      borderRadius: "10px",
                      padding: "0.75rem",
                      marginBottom: "1rem",
                      color: "#2f5f24",
                      lineHeight: 1.6,
                    }}
                  >
                    <strong>
                      ✓ Trabajo aprobado académicamente
                    </strong>
                    <br />
                    Su trabajo fue aprobado y la unidad ha
                    quedado completada.
                  </div>
                )}

              {estado.completada && (
                <div
                  style={{
                    background: "#eef7ea",
                    border: "1px solid #b9d7ad",
                    borderRadius: "10px",
                    padding: "0.75rem",
                    marginBottom: "1rem",
                    color: "#2f5f24",
                    lineHeight: 1.6,
                  }}
                >
                  <strong>✓ Unidad aprobada</strong>
                  <br />
                  El Consejo Académico aprobó esta unidad.
                  Puede continuar con la siguiente.
                </div>
              )}

              {desbloqueada ? (
                <Link
                  href={accion.href}
                  style={{
                    display: "inline-block",
                    background:
                      estado.completada
                        ? "#4f7f3b"
                        : "#6b6f1a",
                    color: "white",
                    padding: "0.7rem 1rem",
                    borderRadius: "8px",
                    textDecoration: "none",
                  }}
                >
                  {accion.texto}
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
