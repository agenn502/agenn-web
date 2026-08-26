"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type User = {
  codigo: string;
  nombre: string;
};

type EnsayoPendiente = {
  id: string;
  titulo: string;
  slug: string;
  autor_nombre: string;
  autor_codigo: string;
  nivel: string;
  unidad_slug: string;
  tema: string | null;
  url_social: string | null;
  codigo_verificacion: string | null;
  fecha_evidencia: string | null;

  estado_revision: string | null;
  observaciones_revision: string | null;
  revisado_por: string | null;
  fecha_revision: string | null;

  seleccionado_revista: boolean;

  estado_difusion: string | null;
  observaciones_difusion: string | null;
  difusion_revisada_por: string | null;
  fecha_revision_difusion: string | null;
};

type Props = {
  user: User;
  onConteoChange?: (conteo: number) => void;
};

export default function InvestigadoresPanel({
  user,
  onConteoChange,
}: Props) {
  const [ensayos, setEnsayos] = useState<EnsayoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

    const cargar = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("ensayos")
      .select(`
        id,
        titulo,
        slug,
        autor_nombre,
        autor_codigo,
        nivel,
        unidad_slug,
        tema,
        url_social,
        codigo_verificacion,
        fecha_evidencia,
        estado_revision,
        observaciones_revision,
        revisado_por,
        fecha_revision,
        seleccionado_revista,
        estado_difusion,
        observaciones_difusion,
        difusion_revisada_por,
        fecha_revision_difusion
      `)
      .eq("estado", "publicado")
      .or(
        "estado_revision.eq.pendiente,estado_difusion.eq.pendiente"
      )
      .order("updated_at", { ascending: true });

    if (error) {
      setError(error.message);
      setEnsayos([]);
      } else {
      const filas = (data as EnsayoPendiente[]) || [];

      setEnsayos(filas);
      }

        setLoading(false);
		  };

		  useEffect(() => {
			cargar();
			// eslint-disable-next-line react-hooks/exhaustive-deps
		  }, []);

  const quitarDeLista = (id: string) => {
	  setEnsayos((prev) =>
		prev.filter((x) => x.id !== id)
	  );
	};
  
  useEffect(() => {
	  if (!loading) {
		onConteoChange?.(ensayos.length);
	  }
	}, [ensayos.length, loading]);
  /*
   * =========================================================
   * PRIMERA REVISIÓN
   * Revisión académica del ensayo
   * =========================================================
   */

  const aprobarEnsayo = async (
    ensayo: EnsayoPendiente
  ) => {
    if (
      !confirm(
        `¿Aprobar académicamente el ensayo de ${ensayo.autor_nombre} para ${ensayo.unidad_slug}?`
      )
    ) {
      return;
    }

    setProcesandoId(ensayo.id);

    const ahora = new Date().toISOString();

    const { error: e1 } = await supabase
      .from("ensayos")
      .update({
        estado_revision: "aprobado",
        observaciones_revision: null,
        revisado_por: user.codigo,
        fecha_revision: ahora,

        evidencia_validada: false,

        estado_difusion: null,
        observaciones_difusion: null,
        difusion_revisada_por: null,
        fecha_revision_difusion: null,

        updated_at: ahora,
      })
      .eq("id", ensayo.id);

    if (e1) {
      setProcesandoId(null);
      alert(e1.message);
      return;
    }

    const { error: e2 } = await supabase
      .from("progreso_inv")
      .update({
        porcentaje: 75,
        completada: false,
        fecha_actualizacion: ahora,
      })
      .eq("user_codigo", ensayo.autor_codigo)
      .eq("unidad_slug", ensayo.unidad_slug);

    if (e2) {
      setProcesandoId(null);
      alert(e2.message);
      return;
    }

    quitarDeLista(ensayo.id);
    setProcesandoId(null);

    alert(
      "Ensayo aprobado académicamente. El investigador ya puede divulgarlo y presentar la evidencia correspondiente."
    );
  };

  const solicitarCorreccionesEnsayo = async (
    ensayo: EnsayoPendiente
  ) => {
    const observaciones = prompt(
      `Escriba las correcciones solicitadas a ${ensayo.autor_nombre}:`
    );

    if (!observaciones?.trim()) {
      alert(
        "Debe escribir las observaciones que recibirá el investigador."
      );
      return;
    }

    if (
      !confirm(
        `¿Devolver el ensayo de ${ensayo.autor_nombre} para correcciones?`
      )
    ) {
      return;
    }

    setProcesandoId(ensayo.id);

    const ahora = new Date().toISOString();

    const { error: e1 } = await supabase
      .from("ensayos")
      .update({
        estado_revision: "correcciones",
        observaciones_revision: observaciones.trim(),
        revisado_por: user.codigo,
        fecha_revision: ahora,

        evidencia_validada: false,

        estado_difusion: null,
        observaciones_difusion: null,
        difusion_revisada_por: null,
        fecha_revision_difusion: null,

        updated_at: ahora,
      })
      .eq("id", ensayo.id);

    if (e1) {
      setProcesandoId(null);
      alert(e1.message);
      return;
    }

    const { error: e2 } = await supabase
      .from("progreso_inv")
      .update({
        porcentaje: 50,
        completada: false,
        fecha_actualizacion: ahora,
      })
      .eq("user_codigo", ensayo.autor_codigo)
      .eq("unidad_slug", ensayo.unidad_slug);

    if (e2) {
      setProcesandoId(null);
      alert(e2.message);
      return;
    }

    quitarDeLista(ensayo.id);
    setProcesandoId(null);

    alert(
      "El ensayo fue devuelto al investigador para correcciones."
    );
  };

  /*
   * =========================================================
   * SELECCIÓN EDITORIAL
   * Revista AGENN
   * =========================================================
   */

  const cambiarSeleccionRevista = async (
    ensayo: EnsayoPendiente,
    seleccionado: boolean
  ) => {
    setProcesandoId(ensayo.id);

    const { error } = await supabase
      .from("ensayos")
      .update({
        seleccionado_revista: seleccionado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ensayo.id);

    if (error) {
      setProcesandoId(null);
      alert(error.message);
      return;
    }

    setEnsayos((prev) =>
      prev.map((item) =>
        item.id === ensayo.id
          ? {
              ...item,
              seleccionado_revista: seleccionado,
            }
          : item
      )
    );

    setProcesandoId(null);
  };

  /*
   * =========================================================
   * SEGUNDA REVISIÓN
   * Validación de la difusión
   * =========================================================
   */

  const aprobarDifusion = async (
    ensayo: EnsayoPendiente
  ) => {
    if (!ensayo.url_social) {
      alert(
        "Este ensayo no tiene un enlace de difusión registrado."
      );
      return;
    }

    if (
      !confirm(
        `¿Validar la difusión de ${ensayo.autor_nombre} y completar ${ensayo.unidad_slug}?`
      )
    ) {
      return;
    }

    setProcesandoId(ensayo.id);

    const ahora = new Date().toISOString();

    const { error: e1 } = await supabase
      .from("ensayos")
      .update({
        evidencia_validada: true,

        estado_difusion: "aprobado",
        observaciones_difusion: null,
        difusion_revisada_por: user.codigo,
        fecha_revision_difusion: ahora,

        updated_at: ahora,
      })
      .eq("id", ensayo.id);

    if (e1) {
      setProcesandoId(null);
      alert(e1.message);
      return;
    }

    const { error: e2 } = await supabase
      .from("progreso_inv")
      .update({
        porcentaje: 100,
        completada: true,
        fecha_actualizacion: ahora,
      })
      .eq("user_codigo", ensayo.autor_codigo)
      .eq("unidad_slug", ensayo.unidad_slug);

    if (e2) {
      setProcesandoId(null);
      alert(e2.message);
      return;
    }

    quitarDeLista(ensayo.id);
    setProcesandoId(null);

    alert(
      "Difusión aprobada. La unidad fue completada al 100 %."
    );
  };

  const solicitarCorreccionDifusion = async (
    ensayo: EnsayoPendiente
  ) => {
    const observaciones = prompt(
      `Escriba las observaciones sobre la evidencia de difusión de ${ensayo.autor_nombre}:`
    );

    if (!observaciones?.trim()) {
      alert(
        "Debe escribir las observaciones que recibirá el investigador."
      );
      return;
    }

    if (
      !confirm(
        `¿Devolver la evidencia de difusión de ${ensayo.autor_nombre} para corrección?`
      )
    ) {
      return;
    }

    setProcesandoId(ensayo.id);

    const ahora = new Date().toISOString();

    const { error: e1 } = await supabase
      .from("ensayos")
      .update({
        evidencia_validada: false,

        estado_difusion: "correcciones",
        observaciones_difusion: observaciones.trim(),
        difusion_revisada_por: user.codigo,
        fecha_revision_difusion: ahora,

        updated_at: ahora,
      })
      .eq("id", ensayo.id);

    if (e1) {
      setProcesandoId(null);
      alert(e1.message);
      return;
    }

    const { error: e2 } = await supabase
      .from("progreso_inv")
      .update({
        porcentaje: 75,
        completada: false,
        fecha_actualizacion: ahora,
      })
      .eq("user_codigo", ensayo.autor_codigo)
      .eq("unidad_slug", ensayo.unidad_slug);

    if (e2) {
      setProcesandoId(null);
      alert(e2.message);
      return;
    }

    quitarDeLista(ensayo.id);
    setProcesandoId(null);

    alert(
      "La evidencia fue devuelta para corrección. El ensayo continúa aprobado académicamente."
    );
  };

  if (loading) {
    return <p>Cargando revisiones pendientes...</p>;
  }

  if (error) {
    return (
      <p style={{ color: "#8b2f2f" }}>
        {error}
      </p>
    );
  }

  if (ensayos.length === 0) {
    return (
      <p>
        No hay ensayos ni evidencias pendientes de
        revisión.
      </p>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "1rem",
      }}
    >
      {ensayos.map((ensayo) => {
        const esRevisionAcademica =
          ensayo.estado_revision === "pendiente";

        const esRevisionDifusion =
          ensayo.estado_revision === "aprobado" &&
          ensayo.estado_difusion === "pendiente";

        const procesando =
          procesandoId === ensayo.id;

        return (
          <article
            key={ensayo.id}
            style={{
              background: "white",
              border: "1px solid #ddd4c7",
              borderRadius: 12,
              padding: "1rem",
            }}
          >
            {esRevisionAcademica && (
              <div
                style={{
                  display: "inline-block",
                  background: "#fff3cd",
                  color: "#6d5711",
                  border: "1px solid #e2cf8b",
                  borderRadius: "999px",
                  padding: "0.3rem 0.7rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                }}
              >
                REVISIÓN ACADÉMICA
              </div>
            )}

            {esRevisionDifusion && (
              <div
                style={{
                  display: "inline-block",
                  background: "#e8f1f7",
                  color: "#315a73",
                  border: "1px solid #b9cfdd",
                  borderRadius: "999px",
                  padding: "0.3rem 0.7rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                }}
              >
                APROBACIÓN FINAL DE DIFUSIÓN
              </div>
            )}

            <h3 style={{ marginTop: 0 }}>
              {ensayo.titulo}
            </h3>

            <p>
              <strong>Autor:</strong>{" "}
              {ensayo.autor_nombre} (
              {ensayo.autor_codigo})
            </p>

            <p>
              <strong>Unidad:</strong>{" "}
              {ensayo.unidad_slug}
            </p>

            {ensayo.tema && (
              <p>
                <strong>Tema:</strong>{" "}
                {ensayo.tema}
              </p>
            )}

            <p>
              <strong>Ensayo:</strong>{" "}
              <Link
                href={`/ensayos/${ensayo.slug}`}
                target="_blank"
              >
                Ver ensayo
              </Link>
            </p>

            {esRevisionDifusion &&
              ensayo.url_social && (
                <p>
                  <strong>
                    Evidencia de difusión:
                  </strong>{" "}
                  <a
                    href={ensayo.url_social}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver publicación externa
                  </a>
                </p>
              )}

            {esRevisionAcademica && (
              <>
                <div
                  style={{
                    marginTop: "1rem",
                    marginBottom: "1rem",
                    padding: "0.85rem",
                    background: "#f4f1e8",
                    borderRadius: "8px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      gap: "0.6rem",
                      alignItems: "center",
                      cursor: procesando
                        ? "wait"
                        : "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        ensayo.seleccionado_revista
                      }
                      disabled={procesando}
                      onChange={(e) =>
                        cambiarSeleccionRevista(
                          ensayo,
                          e.target.checked
                        )
                      }
                    />

                    <span>
                      <strong>
                        Seleccionar para Revista AGENN
                      </strong>
                      <br />
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "#666",
                        }}
                      >
                        Esta selección es editorial y
                        no afecta la aprobación de la
                        unidad.
                      </span>
                    </span>
                  </label>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    disabled={procesando}
                    onClick={() =>
                      aprobarEnsayo(ensayo)
                    }
                    style={{
                      background: "#4f7f3b",
                      color: "white",
                      border: 0,
                      padding: "0.75rem 1rem",
                      borderRadius: 8,
                      cursor: procesando
                        ? "wait"
                        : "pointer",
                    }}
                  >
                    Aprobar ensayo
                  </button>

                  <button
                    disabled={procesando}
                    onClick={() =>
                      solicitarCorreccionesEnsayo(
                        ensayo
                      )
                    }
                    style={{
                      background: "#8b2f2f",
                      color: "white",
                      border: 0,
                      padding: "0.75rem 1rem",
                      borderRadius: 8,
                      cursor: procesando
                        ? "wait"
                        : "pointer",
                    }}
                  >
                    Solicitar correcciones
                  </button>
                </div>
              </>
            )}

            {esRevisionDifusion && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginTop: "1rem",
                }}
              >
                <button
                  disabled={procesando}
                  onClick={() =>
                    aprobarDifusion(ensayo)
                  }
                  style={{
                    background: "#4f7f3b",
                    color: "white",
                    border: 0,
                    padding: "0.75rem 1rem",
                    borderRadius: 8,
                    cursor: procesando
                      ? "wait"
                      : "pointer",
                  }}
                >
                  Aprobar difusión y completar unidad
                </button>

                <button
                  disabled={procesando}
                  onClick={() =>
                    solicitarCorreccionDifusion(
                      ensayo
                    )
                  }
                  style={{
                    background: "#8b2f2f",
                    color: "white",
                    border: 0,
                    padding: "0.75rem 1rem",
                    borderRadius: 8,
                    cursor: procesando
                      ? "wait"
                      : "pointer",
                  }}
                >
                  Solicitar corrección de evidencia
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}