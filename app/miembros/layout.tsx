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

  estado_academico?: string | null;
  origen_acreditacion?: string | null;
};

type MenuItem = {
  label: string;
  href: string;
};

export default function MiembrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [pendientesAprobacion, setPendientesAprobacion] =
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

      setUser(parsed);
      setEsConsejo(consejoNormalizado);

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

  const esPropietario =
    user.codigo === "NUM0002";

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
            label: "Ensayos académicos",
            href: "/miembros/ensayos",
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

        if (esPropietario) {
          baseMenu.push({
            label:
              "🧭 Estado del proyecto",
            href: "/miembros/diagnostico",
          });
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
            label: "Documentos oficiales",
            href: "/miembros/documentos",
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
                "Ensayos académicos",
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
              "Ensayos académicos",
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
            label: "Documentos oficiales",
            href: "/miembros/documentos",
          },
          {
            label:
              "Proceso de formación y acreditación",
            href: "/miembros/proceso_nov",
          },
          {
            label: "Ensayos académicos",
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

  const menu = getMenu();

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
                    <span>
                      {item.label}
                    </span>

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
          Cerrar sesión
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