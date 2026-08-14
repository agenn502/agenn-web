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

type EnsayoRevision = {
  unidad_slug: string;
  estado_revision: string | null;
  observaciones_revision?: string | null;
  fecha_evidencia?: string | null;
  fecha_revision?: string | null;
  slug?: string | null;
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
        subtitulo: "Economía y medios de intercambio en la Guatemala prehispánica",
        href: "/miembros/proceso_inv/unidad-1",
      },
      {
        slug: "unidad-2",
        titulo: "Unidad 2",
        subtitulo: "El sistema monetario en la época colonial (1524–1733)",
        href: "/miembros/proceso_inv/unidad-2",
      },
      {
        slug: "unidad-3",
        titulo: "Unidad 3",
        subtitulo: "La Casa de Moneda de Guatemala y la acuñación colonial (1733–1821)",
        href: "/miembros/proceso_inv/unidad-3",
      },
      {
        slug: "unidad-4",
        titulo: "Unidad 4",
        subtitulo: "Independencia y transición monetaria en Centroamérica",
        href: "/miembros/proceso_inv/unidad-4",
      },
      {
        slug: "unidad-5",
        titulo: "Unidad 5",
        subtitulo: "La República y las primeras reformas monetarias",
        href: "/miembros/proceso_inv/unidad-5",
      },
      {
        slug: "unidad-6",
        titulo: "Unidad 6",
        subtitulo: "La reforma de 1924 y el nacimiento del quetzal",
        href: "/miembros/proceso_inv/unidad-6",
      },
      {
        slug: "unidad-7",
        titulo: "Unidad 7",
        subtitulo: "Evolución del sistema bancario en Guatemala",
        href: "/miembros/proceso_inv/unidad-7",
      },
      {
        slug: "unidad-8",
        titulo: "Unidad 8",
        subtitulo: "Historia del papel moneda guatemalteco",
        href: "/miembros/proceso_inv/unidad-8",
      },
      {
        slug: "unidad-9",
        titulo: "Unidad 9",
        subtitulo: "Fundamentos de notafilia y clasificación de billetes",
        href: "/miembros/proceso_inv/unidad-9",
      },
      {
        slug: "unidad-10",
        titulo: "Unidad 10",
        subtitulo: "Coleccionismo, conservación y mercado numismático",
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
        setError("Esta sección corresponde al proceso de ascenso del Nivel Investigador.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("progreso_inv")
        .select("*")
        .eq("user_codigo", parsed.codigo);

	  const { data: ensayosData } = await supabase
		  .from("ensayos")
		  .select(
			"unidad_slug, estado_revision, observaciones_revision, fecha_evidencia, fecha_revision, slug"
		  )
		  .eq("autor_codigo", parsed.codigo)
		  .eq("proceso", "INV")
		  .eq("estado", "publicado")
		  .in("estado_revision", ["pendiente", "rechazado", "aprobado"])
		  .order("updated_at", { ascending: false });

		setEnsayosRevision((ensayosData as EnsayoRevision[]) || []);
		
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
    const unidadesEvaluables = unidades.filter((u) => u.slug !== "tarea-final");
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

    if (unidad.slug === "tarea-final") {
      const unidad10 = progresoMap.get("unidad-10");
      return !!unidad10?.completada;
    }

    if (index === 0) return true;

    const anterior = unidades[index - 1];
    return !!progresoMap.get(anterior.slug)?.completada;
  };

  const estadoUnidad = (slug: string) => {
    const row = progresoMap.get(slug);
    if (!row) return { porcentaje: 0, completada: false };
    return {
      porcentaje: row.porcentaje || 0,
      completada: !!row.completada,
    };
  };

  if (loading) return <div>Cargando proceso de ascenso...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!user) return <div>Cargando usuario...</div>;

  return (
    <div style={{ maxWidth: "980px" }}>
      <h1 style={{ marginTop: 0 }}>Proceso de Formación y Acreditación — Nivel Investigador</h1>

      <p style={{ lineHeight: 1.8 }}>
        El <strong>Nivel Investigador</strong> corresponde a una etapa de formación
        académica intermedia dentro de la Academia, orientada al fortalecimiento de
        capacidades analíticas, metodológicas e interpretativas en materia numismática
        y notafílica. En este nivel, el miembro ya no se limita a una aproximación
        introductoria, sino que profundiza en el estudio histórico y técnico de los
        sistemas monetarios, con especial atención al caso guatemalteco.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Este proceso busca consolidar una comprensión más rigurosa del dinero como
        fenómeno histórico, económico, político y cultural, así como fortalecer la
        capacidad del participante para analizar piezas, contextos de emisión,
        variantes, series y procesos de transformación monetaria.
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

      <h2>Estructura del Nivel Investigador</h2>

      <p style={{ lineHeight: 1.8 }}>
        El Nivel Investigador está compuesto por diez unidades temáticas organizadas
        de manera progresiva. El recorrido inicia con los sistemas de intercambio en
        la Guatemala prehispánica y avanza cronológicamente a través del período
        colonial, la independencia, la república, las reformas monetarias, el sistema
        bancario, la historia del papel moneda y los fundamentos de la clasificación,
        conservación y mercado numismático.
      </p>

      <h2>Instrucciones para el participante</h2>

      <p style={{ lineHeight: 1.8 }}>
        Al ingresar a cada unidad, el participante encontrará el contenido teórico
        correspondiente al tema. Se recomienda estudiarlo cuidadosamente, pues
        constituye la base para la evaluación posterior.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Al finalizar cada unidad, el usuario deberá completar un cuestionario. Cada
        pregunta incluirá retroalimentación formativa, con el propósito de reforzar la
        comprensión de los contenidos y consolidar el aprendizaje.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Para avanzar a la siguiente unidad, será necesario completar
        satisfactoriamente el cuestionario de la unidad anterior. Este sistema busca
        asegurar un progreso ordenado y una comprensión sólida de los temas.
      </p>

      <p style={{ lineHeight: 1.8 }}>
		  Una vez completadas satisfactoriamente las diez unidades del Nivel
		  Investigador, el miembro habrá concluido su proceso de formación y
		  obtendrá la <strong>acreditación como Académico Investigador</strong>,
		  acompañada de su correspondiente certificado institucional.
		</p>

		<p style={{ lineHeight: 1.8 }}>
		  La categoría de Académico Investigador constituye un nivel académico
		  pleno dentro de la Academia y puede mantenerse de forma indefinida.
		  Aquellos miembros que posteriormente deseen aspirar a la categoría
		  superior de <strong>Académico Numerario</strong> podrán iniciar,
		  voluntariamente, el Proceso NUM, sujeto a los requisitos académicos
		  establecidos por el Consejo Académico.
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
		  const revision = ensayoRevisionMap.get(unidad.slug);
		  
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
                {unidad.slug === "tarea-final" ? "Evaluación final" : "Unidad de formación"}
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
					: desbloqueada
					? "Unidad disponible."
					: "Debes completar la unidad anterior para desbloquear esta sección."}
				</p>

				{revision?.estado_revision === "pendiente" && !estado.completada && (
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
					<strong>⏳ Ensayo en revisión</strong>
					<br />
					Su evidencia fue enviada al Consejo Académico. Cuando exista una resolución,
					se actualizará el estado de esta unidad.
				  </div>
				)}

				{revision?.estado_revision === "rechazado" && !estado.completada && (
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
					<strong>⚠️ Observaciones pendientes</strong>
					<br />
					El Consejo Académico devolvió su ensayo para corrección. Ingrese nuevamente
					a la unidad para revisar las observaciones.
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
					<strong>✅ Unidad aprobada</strong>
					<br />
					El Consejo Académico aprobó esta unidad. Puede continuar con la siguiente.
				  </div>
				)}

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
                  Ingresar
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