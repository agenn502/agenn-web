"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
  administrador?: boolean | string | number;
  estado_miembro?: string | null;

  estado_academico?: string | null;
  origen_acreditacion?: string | null;
};

type MenuItem = {
  label: string;
  href: string;
};

function MenuIcon({ href }: { href: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (href === "/miembros") return <svg {...common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>;
  if (href.includes("directorio")) return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6"/><path d="M16 7h5M16 11h5M17 15h4"/></svg>;
  if (href.includes("biografia")) return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4.5 3-7 7-7s6.3 2.5 7 7"/></svg>;
  if (href.includes("logo")) return <svg {...common}><path d="M12 3 19 7v10l-7 4-7-4V7z"/><path d="m9 12 2 2 4-5"/></svg>;
  if (href.includes("niveles")) return <svg {...common}><path d="M4 18h5v-4H4zM9.5 18h5v-8h-5zM15 18h5V6h-5z"/></svg>;
  if (href.includes("certificados")) return <svg {...common}><path d="M6 3h12v12H6z"/><path d="m9 15-1 6 4-2 4 2-1-6"/><path d="m9.5 9 1.5 1.5L14.5 7"/></svg>;
  if (href.includes("eventos")) return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>;
  if (href.includes("biblioteca")) return <svg {...common}><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22z"/></svg>;
  if (href.includes("ensayos")) return <svg {...common}><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 12h8M8 16h8"/></svg>;
  if (href.includes("revista")) return <svg {...common}><path d="M4 5h7v15H4zM13 5h7v15h-7z"/><path d="M6.5 9h2M6.5 13h2M15.5 9h2M15.5 13h2"/></svg>;
  if (href.includes("documentos")) return <svg {...common}><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></svg>;
  if (href.includes("procesos") || href.includes("proceso_asp") || href.includes("proceso_nov") || href.includes("proceso_inv") || href.includes("proceso_num")) return <svg {...common}><path d="M4 19h16M6 16l4-4 3 2 5-7"/><path d="M15 7h3v3"/></svg>;
  if (href.includes("asimilaciones")) return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-4 2.5-6 5.5-6 1.4 0 2.6.4 3.5 1.1"/><path d="M18 13v7M14.5 16.5h7"/></svg>;
  if (href.includes("proceso-aprobacion")) return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 8"/></svg>;
  if (href.includes("bitacora")) return <svg {...common}><path d="M5 4h14v17H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if (href.includes("administracion")) return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6.2L14.7 3h-4L10.4 6.2A7 7 0 0 0 8.8 7L6.5 6.1l-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 1.6.8l.3 3.2h4l.3-3.2a7 7 0 0 0 1.6-.8l2.3.9 2-3.4-2-1.5c.1-.3.1-.7.1-1z"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>;
}

export default function MiembrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);
  const [esAdministrador, setEsAdministrador] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [pendientesAprobacion, setPendientesAprobacion] =
    useState(0);
  const [pendientesEditoriales, setPendientesEditoriales] =
    useState(0);
  const [novedadesRevistaAutor, setNovedadesRevistaAutor] =
    useState(0);

  const [alertaAscenso, setAlertaAscenso] = useState("");
  const [verificandoPerfil, setVerificandoPerfil] = useState(true);

  const pathname = usePathname();

  useEffect(() => {
    const cargar = async () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        window.location.href = "/login";
        return;
      }

      let parsed: User;

      try {
        const original = JSON.parse(stored);

        parsed = {
          ...original,

          codigo: String(original.codigo || "")
            .trim()
            .toUpperCase(),

          nivel: String(original.nivel || "")
            .trim()
            .toUpperCase(),

          nombre: String(original.nombre || "").trim(),

          estado_academico:
            original.estado_academico
              ? String(original.estado_academico)
                  .trim()
                  .toUpperCase()
              : null,

          origen_acreditacion:
            original.origen_acreditacion
              ? String(original.origen_acreditacion)
                  .trim()
                  .toUpperCase()
              : null,
        };
      } catch {
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      const consejoNormalizado =
        parsed.consejo === true ||
        parsed.consejo === "true" ||
        parsed.consejo === "TRUE" ||
        parsed.consejo === 1;
	  
	  const administradorNormalizado =
		  parsed.administrador === true ||
		  parsed.administrador === "true" ||
		  parsed.administrador === "TRUE" ||
		  parsed.administrador === 1;

      setUser(parsed);
      setEsConsejo(consejoNormalizado);
	  setEsAdministrador(administradorNormalizado);

      // -------------------------------------------------------
      // PERFIL INICIAL OBLIGATORIO
      // -------------------------------------------------------

      const { data: miembroPerfil, error: perfilError } = await supabase
        .from("miembros")
        .select("bio")
        .eq("codigo", parsed.codigo)
        .maybeSingle();

      if (perfilError) {
        console.error(
          "No fue posible verificar el perfil inicial del miembro:",
          perfilError
        );
      } else {
        const biografiaCompleta = Boolean(
          String(miembroPerfil?.bio || "").trim()
        );

        const estaEnBiografia =
          pathname === "/miembros/biografia";

        if (!biografiaCompleta && !estaEnBiografia) {
          window.location.href =
            "/miembros/biografia?inicial=1";
          return;
        }
      }

      setVerificandoPerfil(false);

      // -------------------------------------------------------
      // CONTADOR DE PROCESOS PENDIENTES DEL CONSEJO
      // -------------------------------------------------------

      if (consejoNormalizado) {
        try {
          const response = await fetch(
            "/api/aprobacion/pendientes",
            {
              headers: {
                "x-user-codigo": parsed.codigo,
              },
              cache: "no-store",
            }
          );

          const result = await response.json();

          if (response.ok && result.ok) {
            setPendientesAprobacion(
              result.total || 0
            );
          }
        } catch {
          setPendientesAprobacion(0);
        }
      }

            // -------------------------------------------------------
      // CONTADOR DE PENDIENTES DEL CONSEJO EDITORIAL
      // -------------------------------------------------------

      if (consejoNormalizado) {
        try {
          const response = await fetch("/api/revista/editorial", {
            headers: { "x-user-codigo": parsed.codigo },
            cache: "no-store",
          });

          if (response.ok) {
            const result = await response.json();

            if (result?.ok) {
              // La API editorial ya devuelve únicamente los manuscritos
              // que corresponden al revisor actual. Contamos solo aquellos
              // cuya asignación requiere una decisión suya en la ronda vigente.
              const requierenAtencion = (result.manuscritos || []).filter(
                (m: any) => {
                  const estadoAsignacion = String(
                    m.estado_asignacion || m.asignacion_estado || ""
                  )
                    .trim()
                    .toUpperCase();

                  return estadoAsignacion === "PENDIENTE";
                }
              );

              setPendientesEditoriales(requierenAtencion.length);
            }
          } else {
            setPendientesEditoriales(0);
          }
        } catch {
          setPendientesEditoriales(0);
        }
      } else {
        setPendientesEditoriales(0);
      }

      // -------------------------------------------------------
      // NOVEDADES DE REVISTA PARA EL AUTOR
      // -------------------------------------------------------

      try {
        const response = await fetch(
          "/api/revista/mis-manuscritos",
          {
            headers: { "x-user-codigo": parsed.codigo },
            cache: "no-store",
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result?.ok) {
            const ultimaVista = Number(
              localStorage.getItem(
                `revista-vista-${parsed.codigo}`
              ) || "0"
            );

            const novedadesAutor = (result.manuscritos || []).filter(
              (m: any) => {
                const estado = String(m.estado || "")
                  .trim()
                  .toUpperCase();
                const actualizado = new Date(
                  m.updated_at || m.fecha_aval || m.fecha_ingreso || 0
                ).getTime();

                return (
                  ["CORRECCIONES", "AVALADO", "ASIGNADO", "PUBLICADO"].includes(estado) &&
                  actualizado > ultimaVista
                );
              }
            );

            const estaEnPortadaRevista =
              pathname === "/miembros/revista";

            if (estaEnPortadaRevista) {
              // Entrar a la portada de Revista AGENN marca como vistas
              // las novedades del propio autor de forma inmediata.
              localStorage.setItem(
                `revista-vista-${parsed.codigo}`,
                String(Date.now())
              );
              setNovedadesRevistaAutor(0);
            } else {
              setNovedadesRevistaAutor(novedadesAutor.length);
            }
          }
        }
      } catch {
        setNovedadesRevistaAutor(0);
        // Las novedades del autor no deben bloquear la navegación.
      }

      // -------------------------------------------------------
      // ALERTAS RELACIONADAS CON ENSAYOS / PROCESOS
      // -------------------------------------------------------

      if (
        parsed.nivel === "INV" ||
        parsed.nivel === "NOV" ||
        parsed.nivel === "ASP"
      ) {
        const { data: revisionData } =
          await supabase
            .from("ensayos")
            .select("estado_revision")
            .eq(
              "autor_codigo",
              parsed.codigo
            )
            .eq("estado", "publicado")
            .order("updated_at", {
              ascending: false,
            });

        const tieneRechazado =
          revisionData?.some(
            (r) =>
              r.estado_revision ===
              "rechazado"
          );

        const tienePendiente =
          revisionData?.some(
            (r) =>
              r.estado_revision ===
              "pendiente"
          );

        if (tieneRechazado) {
          setAlertaAscenso("⚠️");
        } else if (tienePendiente) {
          setAlertaAscenso("⏳");
        }
      }

      /*
       * IMPORTANTE:
       *
       * Ya NO consultamos progreso_inv para decidir
       * si un Investigador puede ver el proceso NUM.
       *
       * La fuente de verdad pasa a ser:
       *
       * estado_academico = ACREDITADO
       *
       * Esto permite que lleguen al mismo estado:
       *
       * - quienes completaron las 10 unidades;
       * - quienes fueron acreditados por reconocimiento
       *   del Consejo Académico.
       */
    };

    cargar();
  }, [pathname]);

  if (!user || verificandoPerfil) {
    return (
      <p style={{ padding: 40 }}>
        Cargando...
      </p>
    );
  }

  const esInvAcreditado =
    user.nivel === "INV" &&
    user.estado_academico ===
      "ACREDITADO";

  const getMenu = (): MenuItem[] => {
    switch (user.nivel) {
      // =======================================================
      // NUMERARIO
      // =======================================================

      case "NUM": {
        const baseMenu: MenuItem[] = [
          {
            label: "Directorio",
            href: "/miembros/directorio",
          },
          {
            label: "Biografía personal",
            href: "/miembros/biografia",
          },
          {
            label: "AGENN Logo de miembro",
            href: "/miembros/logo",
          },
          {
            label: "Niveles",
            href: "/miembros/niveles",
          },
          {
            label: "Certificados",
            href: "/miembros/certificados",
          },
          {
            label: "Eventos",
            href: "/miembros/eventos",
          },
          {
            label: "Biblioteca",
            href: "/miembros/biblioteca",
          },
          {
            label: "Trabajos académicos",
            href: "/miembros/ensayos",
          },
		  {
			  label: "Revista AGENN",
			  href: "/miembros/revista",
			},
          {
            label: "Documentos oficiales",
            href: "/miembros/documentos",
          },
        ];

        if (esConsejo) {
          baseMenu.push(
            {
              label:
                "Procesos de formación",
              href: "/miembros/procesos",
            },
            {
              label:
                "Proponer incorporación",
              href: "/miembros/asimilaciones/nueva",
            },
            {
              label:
                "Proceso de aprobación",
              href: "/miembros/proceso-aprobacion",
            }
          );
        }

        return baseMenu;
      }

      // =======================================================
      // INVESTIGADOR
      // =======================================================

      case "INV": {
        const baseMenu: MenuItem[] = [
          {
            label: "Directorio",
            href: "/miembros/directorio",
          },
          {
            label: "Biografía personal",
            href: "/miembros/biografia",
          },
          {
            label: "AGENN Logo de miembro",
            href: "/miembros/logo",
          },
          {
            label: "Niveles",
            href: "/miembros/niveles",
          },

          /*
           * Ya no mostramos "Certificado de Novicio".
           * Todos los certificados del miembro viven
           * bajo una sola sección.
           */
          {
            label: "Certificados",
            href: "/miembros/certificados",
          },

          {
            label: "Eventos",
            href: "/miembros/eventos",
          },
		  {
			  label: "Biblioteca",
			  href: "/miembros/biblioteca",
			},
		  {
			  label: "Revista AGENN",
			  href: "/miembros/revista",
			},
          {
            label: "Documentos oficiales",
            href: "/miembros/documentos",
          },
          {
            label: "Repasar nivel Novicio",
            href: "/miembros/proceso_nov",
          },
        ];

        // -----------------------------------------------------
        // INV ACREDITADO
        // -----------------------------------------------------

        if (esInvAcreditado) {
          baseMenu.push(
            {
              label: alertaAscenso
                ? `Proceso para Numerario ${alertaAscenso}`
                : "Proceso para Numerario",
              href: "/miembros/proceso_num",
            },
            {
              label:
                "Trabajos académicos",
              href: "/miembros/ensayos",
            }
          );

          return baseMenu;
        }

        // -----------------------------------------------------
        // INV EN FORMACIÓN
        // -----------------------------------------------------

        baseMenu.push(
          {
            label: alertaAscenso
              ? `Proceso de formación y acreditación ${alertaAscenso}`
              : "Proceso de formación y acreditación",
            href: "/miembros/proceso_inv",
          },
          {
            label:
              "Trabajos académicos",
            href: "/miembros/ensayos",
          }
        );

        return baseMenu;
      }

      // =======================================================
      // NOVICIO
      // =======================================================

      case "NOV":
        return [
          {
            label: "Directorio",
            href: "/miembros/directorio",
          },
          {
            label: "Biografía personal",
            href: "/miembros/biografia",
          },
          {
            label: "AGENN Logo de miembro",
            href: "/miembros/logo",
          },
          {
            label: "Niveles",
            href: "/miembros/niveles",
          },
          {
            label: "Eventos",
            href: "/miembros/eventos",
          },
          {
            label: "Biblioteca",
            href: "/miembros/biblioteca",
          },
          {
            label: "Documentos oficiales",
            href: "/miembros/documentos",
          },
          {
            label:
              "Proceso de formación y acreditación",
            href: "/miembros/proceso_nov",
          },
		  {
			  label: "Revista AGENN",
			  href: "/miembros/revista",
			},
          {
            label: "Trabajos académicos",
            href: "/miembros/ensayos",
          },
        ];

      // =======================================================
      // ASPIRANTE
      // =======================================================

      case "ASP":
        return [
          {
            label: "Biografía personal",
            href: "/miembros/biografia",
          },
          {
            label: "AGENN Logo de miembro",
            href: "/miembros/logo",
          },
          {
            label: "Niveles",
            href: "/miembros/niveles",
          },
          {
            label:
              "Proceso de formación",
            href: "/miembros/proceso_asp",
          },
        ];

      default:
        return [];
    }
  };

  // Para integrantes del Consejo, la insignia de Revista representa
  // exclusivamente decisiones editoriales pendientes. Las novedades de sus
  // propios manuscritos no se mezclan con las tareas de revisión.
  const pendientesRevista = esConsejo
    ? pendientesEditoriales
    : novedadesRevistaAutor;

  const menu: MenuItem[] = [
    {
      label: "Inicio",
      href: "/miembros",
    },
    ...getMenu(),
    ...(esConsejo
      ? [{ label: "Bitácora interna", href: "/miembros/bitacora" }]
      : []),
	...(esAdministrador
    ? [{ label: "Administración", href: "/miembros/administracion" }]
    : []),
  ];

  return (
    <div className="miembros-layout">
      <aside
        className={`menu-lateral ${
          menuAbierto ? "abierto" : ""
        }`}
      >
        <h2
          style={{
            marginBottom: "1rem",
          }}
        >
          Área de miembros
        </h2>

        <p
          style={{
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          {user.nombre}
          <br />
          {user.codigo}
        </p>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {menu.map(
            (item, index) => (
              <li
                key={index}
                style={{
                  borderBottom:
                    "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <Link
                  href={item.href}
                  onClick={() =>
                    setMenuAbierto(false)
                  }
                  style={{
                    display: "block",
                    padding:
                      "0.8rem 0",
                    color: "white",
                    textDecoration:
                      "none",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: "0.75rem",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          flex: "0 0 20px",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0.92,
                        }}
                      >
                        <MenuIcon href={item.href} />
                      </span>
                      <span>{item.label}</span>
                    </span>

                    {item.href ===
                      "/miembros/revista" &&
                      pendientesRevista > 0 && (
                        <span
                          style={{
                            display: "inline-grid",
                            placeItems: "center",
                            minWidth: "24px",
                            height: "24px",
                            padding: "0 6px",
                            borderRadius: "999px",
                            background: "#6b6f1a",
                            color: "white",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                          }}
                        >
                          {pendientesRevista}
                        </span>
                      )}

                    {item.href ===
                      "/miembros/proceso-aprobacion" &&
                      pendientesAprobacion >
                        0 && (
                        <span
                          style={{
                            display:
                              "inline-grid",
                            placeItems:
                              "center",
                            minWidth:
                              "24px",
                            height:
                              "24px",
                            padding:
                              "0 6px",
                            borderRadius:
                              "999px",
                            background:
                              "#6b6f1a",
                            color:
                              "white",
                            fontSize:
                              "0.78rem",
                            fontWeight:
                              700,
                          }}
                        >
                          {
                            pendientesAprobacion
                          }
                        </span>
                      )}
                  </span>
                </Link>
              </li>
            )
          )}
        </ul>

        <button
          onClick={() => {
            localStorage.removeItem(
              "user"
            );

            window.location.href =
              "/login";
          }}
          style={{
            marginTop: "2rem",
            padding: "0.7rem",
            width: "100%",
            border: "none",
            background: "#6b6f1a",
            color: "white",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.55rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 4H5v16h5" />
              <path d="M14 8l4 4-4 4" />
              <path d="M18 12H9" />
            </svg>
            Cerrar sesión
          </span>
        </button>
      </aside>

      {menuAbierto && (
        <div
          className="menu-overlay"
          onClick={() =>
            setMenuAbierto(false)
          }
        />
      )}

      <main className="contenido-miembros">
        <div className="barra-movil-miembros">
          <button
            onClick={() =>
              setMenuAbierto(true)
            }
            className="menu-toggle-btn"
            aria-label="Abrir menú de miembros"
          >
            ☰
          </button>
        </div>

        {children}
      </main>

      <style jsx>{`
        .miembros-layout {
          display: flex;
          min-height: 100vh;
        }

        .menu-lateral {
          width: 260px;
          background: #6f8760;
          color: white;
          padding: 1.5rem;
          flex-shrink: 0;
        }

        .contenido-miembros {
          flex: 1;
          padding: 2rem;
          background: #faf8f2;
        }

        .barra-movil-miembros {
          display: none;
        }

        .menu-toggle-btn {
          display: none;
        }

        .menu-overlay {
          display: none;
        }

        @media (max-width: 768px) {
          .barra-movil-miembros {
            display: flex;
            justify-content: flex-start;
            margin-bottom: 1rem;
          }

          .menu-toggle-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #6f8760;
            color: white;
            border: none;
            border-radius: 8px;
            width: 42px;
            height: 42px;
            font-size: 1.2rem;
            cursor: pointer;
          }

          .menu-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(
              0,
              0,
              0,
              0.35
            );
            z-index: 1100;
          }

          .menu-lateral {
            position: fixed;
            top: 0;
            left: -280px;
            height: 100%;
            z-index: 1201;
            transition:
              left 0.25s ease;
            box-shadow: none;
            overflow-y: auto;
          }

          .menu-lateral.abierto {
            left: 0;
            box-shadow:
              4px 0 16px
              rgba(
                0,
                0,
                0,
                0.2
              );
          }

          .contenido-miembros {
            width: 100%;
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}