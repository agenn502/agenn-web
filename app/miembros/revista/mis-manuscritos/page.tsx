"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

type Manuscrito = {
  id: number;
  ensayo_id: number;
  origen: string;
  tipo_contenido: string;
  estado: string;
  titulo_actual: string;
  tema: string | null;
  fecha_ingreso: string;
  fecha_aval: string | null;
  updated_at: string;
  version_actual: number | null;
};

function codigoLocal() {
  const stored =
    localStorage.getItem("user");

  if (!stored) return "";

  try {
    const user =
      JSON.parse(stored);

    return String(
      user.codigo || ""
    )
      .trim()
      .toUpperCase();
  } catch {
    return "";
  }
}

function estadoTexto(
  estado: string
) {
  const nombres:
    Record<string, string> = {
    BORRADOR:
      "Borrador en preparación",
    CANDIDATO:
      "Propuesto al Consejo Editorial",
    EN_REVISION:
      "En revisión editorial",
    CORRECCIONES:
      "Correcciones solicitadas",
    REENVIADO:
      "Nueva versión enviada",
    AVALADO:
      "Aval editorial otorgado",
    ASIGNADO:
      "Asignado a Revista AGENN",
    PUBLICADO:
      "Publicado en Revista AGENN",
    DESCARTADO:
      "No seleccionado para publicación",
  };

  return (
    nombres[estado] ||
    estado
  );
}

export default function MisManuscritosPage() {
  const [
    manuscritos,
    setManuscritos,
  ] =
    useState<Manuscrito[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const cargar =
    useCallback(async () => {
      const codigo =
        codigoLocal();

      if (!codigo) {
        window.location.href =
          "/login";
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/revista/mis-manuscritos",
            {
              headers: {
                "x-user-codigo":
                  codigo,
              },
              cache:
                "no-store",
            }
          );

        const texto =
          await response.text();

        const result =
          texto
            ? JSON.parse(texto)
            : null;

        if (
          !response.ok ||
          !result?.ok
        ) {
          throw new Error(
            result?.error ||
              "No fue posible cargar sus manuscritos."
          );
        }

        setManuscritos(
          result.manuscritos ||
            []
        );

        localStorage.setItem(
          `revista-vista-${codigo}`,
          String(Date.now())
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar sus manuscritos."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (loading) {
    return (
      <p>
        Cargando sus
        manuscritos...
      </p>
    );
  }

  return (
    <div
      style={{
        maxWidth: "1050px",
      }}
    >
      <p
        style={{
          color: "#6b6f1a",
          fontWeight: 700,
          textTransform:
            "uppercase",
          fontSize: "0.82rem",
          letterSpacing:
            "0.05em",
        }}
      >
        Revista AGENN
      </p>

      <h1
        style={{
          color: "#4d371c",
        }}
      >
        Mis manuscritos
      </h1>

      <p
        style={{
          lineHeight: 1.8,
          color: "#555",
        }}
      >
        En este espacio puede
        consultar el estado de
        los trabajos de su autoría
        que han ingresado al
        proceso editorial de
        Revista AGENN.
      </p>

      {error && (
        <div
          style={{
            background:
              "#fff3f3",
            border:
              "1px solid #d28b8b",
            color:
              "#7a1f1f",
            padding: "1rem",
            borderRadius:
              "10px",
            marginBottom:
              "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      {manuscritos.length ===
      0 ? (
        <div
          style={{
            background:
              "white",
            border:
              "1px solid #ddd4c7",
            borderRadius:
              "12px",
            padding: "1.5rem",
            color: "#666",
          }}
        >
          Todavía no tiene
          manuscritos dentro del
          proceso editorial de
          Revista AGENN.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          {manuscritos.map(
            (manuscrito) => (
              <div
                key={
                  manuscrito.id
                }
                style={{
                  background:
                    "white",
                  border:
                    "1px solid #ddd4c7",
                  borderRadius:
                    "12px",
                  padding:
                    "1.2rem",
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  gap: "1rem",
                  alignItems:
                    "center",
                  flexWrap:
                    "wrap",
                }}
              >
                <div
                  style={{
                    flex:
                      "1 1 500px",
                  }}
                >
                  <h2
                    style={{
                      margin:
                        "0 0 0.5rem",
                      color:
                        "#4d371c",
                      fontSize:
                        "1.2rem",
                    }}
                  >
                    {
                      manuscrito.titulo_actual
                    }
                  </h2>

                  <div
                    style={{
                      color:
                        "#666",
                      lineHeight:
                        1.7,
                    }}
                  >
                    {
                      manuscrito.tipo_contenido
                    }{" "}
                    ·{" "}
                    {manuscrito.origen ===
                    "FORMACION"
                      ? "Origen formativo"
                      : "Envío libre"}

                    <br />

                    Versión{" "}
                    {manuscrito.version_actual ||
                      "—"}
                  </div>

                  <div
                    style={{
                      marginTop:
                        "0.65rem",
                    }}
                  >
                    <span
                      style={{
                        background:
                          manuscrito.estado ===
                          "CORRECCIONES"
                            ? "#fff1cf"
                            : manuscrito.estado ===
                              "AVALADO"
                            ? "#eef6e9"
                            : "#f4f1e8",

                        color:
                          manuscrito.estado ===
                          "CORRECCIONES"
                            ? "#775500"
                            : manuscrito.estado ===
                              "AVALADO"
                            ? "#356128"
                            : "#6b4f2a",

                        borderRadius:
                          "999px",

                        padding:
                          "0.35rem 0.7rem",

                        fontSize:
                          "0.84rem",

                        fontWeight:
                          700,
                      }}
                    >
                      {estadoTexto(
                        manuscrito.estado
                      )}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/miembros/revista/mis-manuscritos/${manuscrito.id}`}
                  style={{
                    background:
                      ["BORRADOR", "CORRECCIONES"].includes(
                        manuscrito.estado
                      )
                        ? "#d9a928"
                        : "#6b6f1a",

                    color:
                      ["BORRADOR", "CORRECCIONES"].includes(
                        manuscrito.estado
                      )
                        ? "#332600"
                        : "white",

                    textDecoration:
                      "none",

                    padding:
                      "0.75rem 1rem",

                    borderRadius:
                      "8px",

                    fontWeight:
                      700,
                  }}
                >
                  {manuscrito.estado === "BORRADOR"
                    ? "Continuar escribiendo"
                    : manuscrito.estado === "CORRECCIONES"
                    ? "Realizar correcciones"
                    : "Ver manuscrito"}
                </Link>
              </div>
            )
          )}
        </div>
      )}

      <Link
        href="/miembros/revista"
        style={{
          display:
            "inline-block",
          marginTop: "1.5rem",
          color: "#4d371c",
          fontWeight: 700,
          textDecoration:
            "none",
        }}
      >
        ← Volver a Revista
        AGENN
      </Link>
    </div>
  );
}