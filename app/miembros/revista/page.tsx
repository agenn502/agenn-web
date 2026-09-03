"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type User = {
  codigo: string;
  nombre: string;
  nivel: string;
  estado_academico?: string | null;
};

type Miembro = {
  id: number;
  codigo: string;
  nombre: string;
  nivel: string;
  estado_academico: string | null;
};

type ConsejoEditorial = {
  rol: "DIRECTOR" | "EDITOR" | "MIEMBRO";
  activo: boolean;
};

type Revista = {
  id: number;
  numero: number;
  anio: number;
  titulo: string | null;
  subtitulo: string | null;
  portada_url: string | null;
  estado: string;
  fecha_publicacion: string | null;
};

export default function RevistaAgennPage() {
  const [user, setUser] = useState<User | null>(null);
  const [miembro, setMiembro] = useState<Miembro | null>(null);
  const [ce, setCe] = useState<ConsejoEditorial | null>(null);
  const [revistas, setRevistas] = useState<Revista[]>([]);
  const [cantidadManuscritos, setCantidadManuscritos] = useState(0);
  const [pendientesEditoriales, setPendientesEditoriales] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        window.location.href = "/login";
        return;
      }

      let parsed: User;

      try {
        parsed = JSON.parse(stored);
      } catch {
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      const codigo = String(parsed.codigo || "")
        .trim()
        .toUpperCase();

      const nivel = String(parsed.nivel || "")
        .trim()
        .toUpperCase();

      const usuarioNormalizado: User = {
        ...parsed,
        codigo,
        nivel,
        nombre: String(parsed.nombre || "").trim(),
        estado_academico: parsed.estado_academico
          ? String(parsed.estado_academico).trim().toUpperCase()
          : null,
      };

      setUser(usuarioNormalizado);

      // =====================================================
      // MIEMBRO
      // =====================================================

      const { data: miembroData, error: miembroError } = await supabase
        .from("miembros")
        .select("id,codigo,nombre,nivel,estado_academico")
        .eq("codigo", codigo)
        .maybeSingle();

      if (miembroError) {
        console.error("Error cargando miembro:", miembroError);
      }

      if (miembroData) {
        setMiembro(miembroData as Miembro);

        // ===================================================
        // CONSEJO EDITORIAL
        // ===================================================

        const { data: ceData, error: ceError } = await supabase
          .from("consejo_editorial_miembros")
          .select("rol,activo")
          .eq("miembro_id", miembroData.id)
          .eq("activo", true)
          .maybeSingle();

        if (ceError) {
          console.error("Error verificando Consejo Editorial:", ceError);
        }

        if (ceData) {
          setCe(ceData as ConsejoEditorial);

          try {
            const editorialResponse = await fetch("/api/revista/editorial", {
              headers: { "x-user-codigo": codigo },
              cache: "no-store",
            });
            const editorialTexto = await editorialResponse.text();
            const editorialResult = editorialTexto
              ? JSON.parse(editorialTexto)
              : null;

            if (editorialResponse.ok && editorialResult?.ok) {
              const requierenAtencion = (
                editorialResult.manuscritos || []
              ).filter((m: any) =>
                ["CANDIDATO", "EN_REVISION", "REENVIADO"].includes(
                  String(m.estado || "")
                    .trim()
                    .toUpperCase(),
                ),
              );
              setPendientesEditoriales(requierenAtencion.length);
            }
          } catch (error) {
            console.error("Error consultando pendientes editoriales:", error);
            setPendientesEditoriales(0);
          }
        }
      }

      // =====================================================
      // MANUSCRITOS DEL MIEMBRO
      //
      // Se consultan mediante la API del servidor porque
      // manuscritos_editoriales está protegido por RLS.
      // =====================================================

      try {
        const manuscritosResponse = await fetch(
          "/api/revista/mis-manuscritos",
          {
            headers: {
              "x-user-codigo": codigo,
            },
            cache: "no-store",
          },
        );

        const manuscritosTexto = await manuscritosResponse.text();

        let manuscritosResult: any = null;

        try {
          manuscritosResult = manuscritosTexto
            ? JSON.parse(manuscritosTexto)
            : null;
        } catch {
          console.error(
            "La API de manuscritos devolvió una respuesta no válida.",
          );
        }

        if (manuscritosResponse.ok && manuscritosResult?.ok) {
          setCantidadManuscritos(manuscritosResult.manuscritos?.length || 0);
        } else {
          console.error(
            "Error verificando manuscritos editoriales:",
            manuscritosResult?.error || `HTTP ${manuscritosResponse.status}`,
          );

          setCantidadManuscritos(0);
        }
      } catch (error) {
        console.error("Error consultando manuscritos editoriales:", error);

        setCantidadManuscritos(0);
      }

      // =====================================================
      // NÚMEROS DE REVISTA
      // =====================================================

      const { data: revistasData, error: revistasError } = await supabase
        .from("revistas")
        .select(
          `
            id,
            numero,
            anio,
            titulo,
            subtitulo,
            portada_url,
            estado,
            fecha_publicacion
            `,
        )
        .order("anio", { ascending: false })
        .order("numero", { ascending: false });

      if (revistasError) {
        console.error(
          "Error cargando números de Revista AGENN:",
          revistasError,
        );
      }

      setRevistas((revistasData || []) as Revista[]);
      setLoading(false);
    };

    cargar();
  }, []);

  if (loading || !user) {
    return <p>Cargando Revista AGENN...</p>;
  }

  // =========================================================
  // PERMISOS
  // =========================================================

  const esNUM = user.nivel === "NUM";

  const esInvAcreditado =
    user.nivel === "INV" && miembro?.estado_academico === "ACREDITADO";

  const puedeEscribir = esNUM || esInvAcreditado;

  const tieneManuscritos = cantidadManuscritos > 0;

  const esCE = Boolean(ce?.activo);

  const puedeAdministrarCE = ce?.rol === "DIRECTOR" || ce?.rol === "EDITOR";

  const revistasPublicadas = revistas.filter(
    (revista) => revista.estado === "PUBLICADA",
  );

  const revistasEnPreparacion = revistas.filter(
    (revista) => revista.estado !== "PUBLICADA",
  );

  return (
    <div style={{ maxWidth: "1100px" }}>
      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <div
        style={{
          marginBottom: "2rem",
        }}
      >
        <p
          style={{
            margin: "0 0 0.4rem 0",
            fontSize: "0.82rem",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#6b6f1a",
            fontWeight: 700,
          }}
        >
          Publicación académica
        </p>

        <h1
          style={{
            marginTop: 0,
            color: "#4d371c",
          }}
        >
          Revista AGENN
        </h1>

        <p
          style={{
            maxWidth: "850px",
            lineHeight: 1.8,
            color: "#555",
          }}
        >
          Revista académica de la Academia Guatemalteca de Estudios Numismáticos
          y Notafílicos, orientada a la publicación y difusión de estudios,
          ensayos y trabajos especializados sobre numismática, notafilia y
          disciplinas afines.
        </p>
      </div>

      {/* =====================================================
          NÚMEROS PUBLICADOS
      ===================================================== */}

      <section
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "14px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#4d371c",
          }}
        >
          Números publicados
        </h2>

        {revistasPublicadas.length === 0 ? (
          <div
            style={{
              background: "#faf8f2",
              border: "1px dashed #cfc5b6",
              borderRadius: "10px",
              padding: "1rem",
              color: "#666",
              lineHeight: 1.7,
            }}
          >
            Revista AGENN se encuentra actualmente en preparación. El primer
            número será publicado próximamente.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            {revistasPublicadas.map((revista) => (
              <Link
                key={revista.id}
                href={`/revista/${revista.anio}/${revista.numero}`}
                style={{
                  display: "block",
                  border: "1px solid #ddd4c7",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "#faf8f2",
                  textDecoration: "none",
                  color: "#4d371c",
                }}
              >
                {revista.portada_url && (
                  <img
                    src={revista.portada_url}
                    alt={`Revista AGENN núm. ${revista.numero}`}
                    style={{
                      width: "100%",
                      height: "220px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                )}

                <div
                  style={{
                    padding: "1rem",
                  }}
                >
                  <strong>Revista AGENN</strong>

                  <div
                    style={{
                      marginTop: "0.35rem",
                      color: "#666",
                    }}
                  >
                    Núm. {revista.numero} · {revista.anio}
                  </div>

                  {revista.titulo && (
                    <div
                      style={{
                        marginTop: "0.65rem",
                        lineHeight: 1.5,
                      }}
                    >
                      {revista.titulo}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          PARTICIPAR
          Solo INV acreditados y NUM
      ===================================================== */}

      {puedeEscribir && (
        <section
          style={{
            background: "#f4f1e8",
            border: "1px solid #ddd4c7",
            borderRadius: "14px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#4d371c",
            }}
          >
            Participar en Revista AGENN
          </h2>

          <p
            style={{
              lineHeight: 1.7,
              color: "#555",
            }}
          >
            Los miembros Investigadores acreditados y Numerarios pueden proponer
            trabajos originales para consideración del Consejo Editorial.
          </p>

          <Link
            href="/miembros/revista/escribir"
            style={{
              display: "inline-block",
              background: "#6b6f1a",
              color: "white",
              textDecoration: "none",
              padding: "0.8rem 1rem",
              borderRadius: "8px",
              fontWeight: 700,
              marginTop: "0.3rem",
            }}
          >
            Escribir ensayo
          </Link>
        </section>
      )}

      {/* =====================================================
          MIS MANUSCRITOS
          Cualquier miembro con trabajos en circuito editorial
      ===================================================== */}

      {tieneManuscritos && (
        <section
          style={{
            background: "#faf8f2",
            border: "1px solid #ddd4c7",
            borderRadius: "14px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.4rem 0",
              color: "#6b6f1a",
              textTransform: "uppercase",
              fontSize: "0.8rem",
              letterSpacing: "0.05em",
              fontWeight: 700,
            }}
          >
            Proceso editorial
          </p>

          <h2
            style={{
              marginTop: 0,
              color: "#4d371c",
            }}
          >
            Mis manuscritos
          </h2>

          <p
            style={{
              lineHeight: 1.7,
              color: "#555",
            }}
          >
            {cantidadManuscritos === 1
              ? "Tiene 1 manuscrito en proceso editorial de Revista AGENN."
              : `Tiene ${cantidadManuscritos} manuscritos en proceso editorial de Revista AGENN.`}
          </p>

          <p
            style={{
              lineHeight: 1.7,
              color: "#555",
            }}
          >
            Desde este espacio puede consultar su estado, revisar las
            observaciones del Consejo Editorial y atender las correcciones
            solicitadas cuando corresponda.
          </p>

          <Link
            href="/miembros/revista/mis-manuscritos"
            style={{
              display: "inline-block",
              background: "#6b6f1a",
              color: "white",
              textDecoration: "none",
              padding: "0.8rem 1rem",
              borderRadius: "8px",
              fontWeight: 700,
              marginTop: "0.3rem",
            }}
          >
            Ver mis manuscritos
          </Link>
        </section>
      )}

      {/* =====================================================
          CONSEJO EDITORIAL
      ===================================================== */}

      {esCE && (
        <section
          style={{
            background: "#eef6e9",
            border: "1px solid #cfe3c4",
            borderRadius: "14px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.4rem 0",
              color: "#356128",
              textTransform: "uppercase",
              fontSize: "0.8rem",
              letterSpacing: "0.05em",
              fontWeight: 700,
            }}
          >
            Consejo Editorial
          </p>

          <h2
            style={{
              marginTop: 0,
              color: "#356128",
            }}
          >
            Gestión editorial
          </h2>

          <p
            style={{
              lineHeight: 1.7,
              color: "#4d5f44",
            }}
          >
            Usted forma parte del Consejo Editorial de Revista AGENN con el rol
            de <strong>{ce?.rol}</strong>.
          </p>

          {pendientesEditoriales > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: "#fff8d9",
                border: "1px solid #dfc96d",
                borderRadius: "10px",
                padding: "0.9rem 1rem",
                marginTop: "1rem",
                color: "#66520a",
              }}
            >
              <span
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  minWidth: "28px",
                  height: "28px",
                  padding: "0 7px",
                  borderRadius: "999px",
                  background: "#6b6f1a",
                  color: "white",
                  fontWeight: 800,
                  fontSize: "0.82rem",
                }}
              >
                {pendientesEditoriales}
              </span>
              <strong>
                {pendientesEditoriales === 1
                  ? "Hay 1 manuscrito que requiere atención del Consejo Editorial."
                  : `Hay ${pendientesEditoriales} manuscritos que requieren atención del Consejo Editorial.`}
              </strong>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.8rem",
              marginTop: "1rem",
            }}
          >
            <Link
              href="/miembros/revista/editorial"
              style={{
                background: "#356128",
                color: "white",
                textDecoration: "none",
                padding: "0.8rem 1rem",
                borderRadius: "8px",
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.55rem",
                }}
              >
                Gestión editorial
                {pendientesEditoriales > 0 && (
                  <span
                    style={{
                      display: "inline-grid",
                      placeItems: "center",
                      minWidth: "22px",
                      height: "22px",
                      padding: "0 6px",
                      borderRadius: "999px",
                      background: "white",
                      color: "#356128",
                      fontSize: "0.76rem",
                      fontWeight: 800,
                    }}
                  >
                    {pendientesEditoriales}
                  </span>
                )}
              </span>
            </Link>

            <Link
              href="/miembros/revista/editorial/archivo"
              style={{
                background: "white",
                color: "#356128",
                textDecoration: "none",
                padding: "0.8rem 1rem",
                borderRadius: "8px",
                border: "1px solid #9dbc91",
                fontWeight: 700,
              }}
            >
              Archivo editorial
            </Link>

            {puedeAdministrarCE && (
              <>
                <Link
                  href="/miembros/revista/numeros"
                  style={{
                    background: "white",
                    color: "#356128",
                    textDecoration: "none",
                    padding: "0.8rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid #9dbc91",
                    fontWeight: 700,
                  }}
                >
                  Números de revista
                </Link>

                <Link
                  href="/miembros/revista/consejo-editorial"
                  style={{
                    background: "white",
                    color: "#356128",
                    textDecoration: "none",
                    padding: "0.8rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid #9dbc91",
                    fontWeight: 700,
                  }}
                >
                  Consejo Editorial
                </Link>
              </>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          NÚMEROS EN PREPARACIÓN
      ===================================================== */}

      {esCE && revistasEnPreparacion.length > 0 && (
        <section
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "14px",
            padding: "1.5rem",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#4d371c",
            }}
          >
            Números en preparación
          </h2>

          {revistasEnPreparacion.map((revista) => (
            <div
              key={revista.id}
              style={{
                padding: "0.9rem 0",
                borderBottom: "1px solid #eee8de",
              }}
            >
              <strong>
                Núm. {revista.numero} · {revista.anio}
              </strong>

              <span
                style={{
                  marginLeft: "0.7rem",
                  fontSize: "0.8rem",
                  background: "#f4f1e8",
                  borderRadius: "999px",
                  padding: "0.25rem 0.55rem",
                  color: "#6b4f2a",
                }}
              >
                {revista.estado}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}