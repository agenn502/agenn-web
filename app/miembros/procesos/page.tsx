"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

type Proceso = {
  codigo: "ASP" | "NOV" | "INV" | "NUM";
  titulo: string;
  descripcion: string;
  href: string;
};

const procesos: Proceso[] = [
  {
    codigo: "ASP",
    titulo: "Nivel Aspirante",
    descripcion:
      "Módulo Introductorio con los fundamentos de la numismática, la notafilia y la historia del dinero.",
    href: "/miembros/proceso_asp",
  },
  {
    codigo: "NOV",
    titulo: "Nivel Novicio",
    descripcion:
      "Proceso de formación y acreditación orientado al estudio progresivo de la historia monetaria de Guatemala, la numismática y la notafilia.",
    href: "/miembros/proceso_nov",
  },
  {
    codigo: "INV",
    titulo: "Nivel Investigador",
    descripcion:
      "Proceso de formación y acreditación avanzado, orientado al análisis histórico, metodológico e investigativo de la numismática y la notafilia.",
    href: "/miembros/proceso_inv",
  },
  {
    codigo: "NUM",
    titulo: "Académico Numerario",
    descripcion:
      "Proceso superior de acreditación académica basado en producción y trayectoria académica verificable.",
    href: "/miembros/proceso_num",
  },
];

export default function ProcesosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    const parsed = JSON.parse(stored) as User;

    const consejo =
      parsed.consejo === true ||
      parsed.consejo === "true" ||
      parsed.consejo === "TRUE" ||
      parsed.consejo === 1;

    setUser(parsed);
    setEsConsejo(consejo);
  }, []);

  if (!user) {
    return <div>Cargando procesos...</div>;
  }

  const ordenNivel: Record<string, number> = {
    ASP: 0,
    NOV: 1,
    INV: 2,
    NUM: 3,
  };

  const indiceActual = ordenNivel[user.nivel] ?? 0;

  return (
    <div style={{ maxWidth: "1000px" }}>
      <p
        style={{
          margin: "0 0 0.4rem",
          color: "#6b6f1a",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontSize: "0.82rem",
        }}
      >
        Itinerario académico
      </p>

      <h1 style={{ marginTop: 0 }}>Procesos de formación</h1>

      <p style={{ lineHeight: 1.8 }}>
        Desde esta sección puede acceder a los diferentes procesos de formación
        y acreditación académica de la AGENN.
      </p>

      {esConsejo && (
        <div
          style={{
            margin: "1.5rem 0",
            padding: "1rem",
            background: "#f4f1e8",
            border: "1px solid #ddd4c7",
            borderRadius: "10px",
          }}
        >
          <strong>Modo Consejo Académico.</strong>
          <p style={{ marginBottom: 0, lineHeight: 1.7 }}>
            Como miembro del Consejo Académico puede acceder a todos los procesos
            para revisar sus contenidos y funcionamiento.
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
          marginTop: "2rem",
        }}
      >
        {procesos.map((proceso) => {
          const indiceProceso = ordenNivel[proceso.codigo];

          const actual = proceso.codigo === user.nivel;
          const superado = indiceProceso < indiceActual;
          const futuro = indiceProceso > indiceActual;

          const disponible =
            esConsejo ||
            proceso.codigo === user.nivel ||
            superado ||
            (user.nivel === "INV" && proceso.codigo === "NUM");

          return (
            <div
              key={proceso.codigo}
              style={{
                background: actual ? "#f7f8ee" : "white",
                border: actual
                  ? "2px solid #6b6f1a"
                  : "1px solid #ddd4c7",
                borderRadius: "14px",
                padding: "1.4rem",
                opacity: disponible ? 1 : 0.65,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 0.35rem",
                      color: "#6b6f1a",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {proceso.codigo}
                  </p>

                  <h2 style={{ margin: 0 }}>{proceso.titulo}</h2>
                </div>

                <span
                  style={{
                    padding: "0.35rem 0.7rem",
                    borderRadius: "999px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    background: actual
                      ? "#6b6f1a"
                      : superado
                      ? "#e8f2e4"
                      : futuro
                      ? "#f1eee8"
                      : "#f1eee8",
                    color: actual
                      ? "white"
                      : superado
                      ? "#356128"
                      : "#666",
                  }}
                >
                  {actual
                    ? "Nivel actual"
                    : superado
                    ? "Etapa superada"
                    : futuro
                    ? "Etapa futura"
                    : ""}
                </span>
              </div>

              <p style={{ lineHeight: 1.7 }}>
                {proceso.descripcion}
              </p>

              {proceso.codigo === "NUM" && user.nivel !== "NUM" && (
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#666",
                    lineHeight: 1.6,
                  }}
                >
                  Este proceso es voluntario y está destinado a Académicos
                  Investigadores que deseen aspirar al nivel superior de la
                  Academia.
                </p>
              )}

              {disponible ? (
                <Link
                  href={proceso.href}
                  style={{
                    display: "inline-block",
                    marginTop: "0.5rem",
                    background: "#6b6f1a",
                    color: "white",
                    padding: "0.7rem 1rem",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  {esConsejo
                    ? "Revisar proceso"
                    : actual
                    ? "Continuar proceso"
                    : superado
                    ? "Consultar proceso"
                    : "Ingresar al proceso"}
                </Link>
              ) : (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "0.5rem",
                    padding: "0.7rem 1rem",
                    borderRadius: "8px",
                    background: "#ddd",
                    color: "#777",
                    fontWeight: 700,
                  }}
                >
                  No disponible
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}