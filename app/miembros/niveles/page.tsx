"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

type Nivel = {
  codigo: "ASP" | "NOV" | "INV" | "NUM";
  nombre: string;
  descripcion: string;
  requisito: string;
  resultado: string;
};

const NIVELES: Nivel[] = [
  {
    codigo: "ASP",
    nombre: "Aspirante",
    descripcion:
      "Es la etapa inicial de incorporación a la Academia. El Aspirante recibe una introducción general a la numismática, la notafilia y la historia del dinero, con el propósito de establecer una base común antes de comenzar el proceso formal de formación.",
    requisito:
      "Completar satisfactoriamente el Módulo Introductorio y su cuestionario de evaluación.",
    resultado:
      "Al completar esta etapa, el miembro es promovido al Nivel Novicio y recibe un nuevo código institucional NOV.",
  },
  {
    codigo: "NOV",
    nombre: "Académico Novicio",
    descripcion:
      "Es la primera etapa formal de formación académica. El miembro estudia progresivamente la historia monetaria de Guatemala, los fundamentos de la numismática y la notafilia, la clasificación, conservación y otros conocimientos esenciales para construir un criterio académico sólido.",
    requisito:
      "Completar las diez unidades formativas y aprobar la tarea final establecida para el Nivel Novicio.",
    resultado:
	  "Al aprobar el proceso, el miembro recibe el certificado que lo acredita como Académico Novicio y es promovido al Nivel Investigador, donde continuará su formación académica.",
  },
  {
    codigo: "INV",
    nombre: "Académico Investigador",
    descripcion:
      "En esta etapa el miembro profundiza en el análisis histórico, metodológico e interpretativo de la numismática y la notafilia. El objetivo es fortalecer su capacidad para investigar, analizar fuentes, interpretar piezas y desarrollar trabajos académicos con mayor rigor.",
    requisito:
      "Completar satisfactoriamente las diez unidades del proceso de formación para Investigadores.",
    resultado:
	  "Al completar esta etapa, el miembro recibe el certificado que lo acredita como Académico Investigador. Puede permanecer en este nivel de forma indefinida o, si desea aspirar a la categoría académica superior, iniciar voluntariamente el Proceso NUM.",
  },
  {
    codigo: "NUM",
    nombre: "Académico Numerario",
    descripcion:
      "Es el nivel académico superior de la Academia. Representa el reconocimiento a miembros que, además de completar el proceso formativo, han demostrado capacidad para realizar aportes académicos originales y de calidad en el campo numismático o notafílico.",
    requisito:
	  "Completar el Proceso NUM mediante una contribución académica relevante y verificable, como la publicación de un artículo en una revista arbitrada, la publicación de un libro u otra modalidad de producción académica que sea reconocida expresamente por el Consejo Académico.",
    resultado:
      "El miembro obtiene la categoría de Académico Numerario y se incorpora al nivel superior de la estructura académica de la AGENN.",
  },
];

export default function NivelesPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    setUser(JSON.parse(stored));
  }, []);

  if (!user) {
    return <div>Cargando niveles...</div>;
  }

  const indiceActual = NIVELES.findIndex(
    (nivel) => nivel.codigo === String(user.nivel || "").toUpperCase()
  );

  return (
    <div style={{ maxWidth: "980px" }}>
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
        Trayectoria académica
      </p>

      <h1 style={{ marginTop: 0 }}>Itinerario de Formación y Acreditación Académica</h1>

      <p style={{ lineHeight: 1.8, fontSize: "1.05rem" }}>
        La formación dentro de la Academia Guatemalteca de Estudios
        Numismáticos y Notafílicos está organizada en una trayectoria
        progresiva de cuatro niveles.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Cada nivel representa una etapa distinta de aprendizaje y desarrollo
        académico. El propósito no es únicamente avanzar de categoría, sino
        adquirir progresivamente los conocimientos, capacidades de análisis y
        experiencia necesarios para contribuir de manera responsable al estudio
        y divulgación de la numismática y la notafilia.
      </p>

      <div
        style={{
          margin: "2rem 0",
          padding: "1.25rem",
          background: "#f4f1e8",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
        }}
      >
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          <strong>Su nivel actual:</strong>{" "}
          {NIVELES[indiceActual]?.nombre || user.nivel}{" "}
          <span style={{ color: "#666" }}>({user.codigo})</span>
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: "1.25rem",
        }}
      >
        {NIVELES.map((nivel, index) => {
          const actual = nivel.codigo === user.nivel;
          const superado = indiceActual > index;
          const futuro = indiceActual < index;

          return (
            <div
              key={nivel.codigo}
              style={{
                background: actual ? "#f7f8ee" : "white",
                border: actual
                  ? "2px solid #6b6f1a"
                  : "1px solid #ddd4c7",
                borderRadius: "14px",
                padding: "1.4rem",
                opacity: futuro ? 0.88 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 0.35rem",
                      color: "#6b6f1a",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Nivel {index + 1}
                  </p>

                  <h2 style={{ margin: 0 }}>
                    {nivel.nombre}
                  </h2>
                </div>

                <div
                  style={{
                    padding: "0.4rem 0.75rem",
                    borderRadius: "999px",
                    background: actual
                      ? "#6b6f1a"
                      : superado
                      ? "#e8f2e4"
                      : "#f1eee8",
                    color: actual
                      ? "white"
                      : superado
                      ? "#356128"
                      : "#666",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                  }}
                >
                  {actual
                    ? "Nivel actual"
                    : superado
                    ? "Etapa superada"
                    : "Etapa futura"}
                </div>
              </div>

              <p style={{ lineHeight: 1.8 }}>
                {nivel.descripcion}
              </p>

              <div
                style={{
                  background: "#faf8f3",
                  borderRadius: "10px",
                  padding: "1rem",
                  marginTop: "1rem",
                }}
              >
                <p style={{ marginTop: 0, lineHeight: 1.7 }}>
                  <strong>Para avanzar:</strong> {nivel.requisito}
                </p>

                <p style={{ marginBottom: 0, lineHeight: 1.7 }}>
                  <strong>Al finalizar:</strong> {nivel.resultado}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1.4rem",
          background: "#fff8e5",
          border: "1px solid #e5d29a",
          borderRadius: "12px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          El objetivo final no es únicamente alcanzar una categoría
        </h2>

        <p style={{ lineHeight: 1.8, marginBottom: 0 }}>
          La trayectoria académica de la AGENN busca formar miembros capaces de
          estudiar, investigar y comunicar responsablemente el conocimiento
          numismático y notafílico. El Nivel Numerario representa el resultado
          de esa formación y de una contribución académica demostrable, no
          simplemente la acumulación de unidades aprobadas.
        </p>
      </div>

      {user.nivel === "ASP" && (
        <div style={{ marginTop: "1.5rem" }}>
          <Link
            href="/miembros/proceso_asp"
            style={{
              display: "inline-block",
              background: "#6b6f1a",
              color: "white",
              padding: "0.8rem 1.2rem",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Iniciar mi proceso de formación
          </Link>
        </div>
      )}
    </div>
  );
}