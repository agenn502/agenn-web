"use client";

import { useEffect, useState } from "react";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
  estado_academico?: string | null;
  origen_acreditacion?: string | null;
};

export default function ProcesoNumerarioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [autorizado, setAutorizado] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsed = JSON.parse(stored);

      const usuarioNormalizado: User = {
        ...parsed,

        codigo: String(parsed.codigo || "")
          .trim()
          .toUpperCase(),

        nivel: String(parsed.nivel || "")
          .trim()
          .toUpperCase(),

        nombre: String(parsed.nombre || "").trim(),

        estado_academico: parsed.estado_academico
          ? String(parsed.estado_academico)
              .trim()
              .toUpperCase()
          : null,

        origen_acreditacion: parsed.origen_acreditacion
          ? String(parsed.origen_acreditacion)
              .trim()
              .toUpperCase()
          : null,
      };

      setUser(usuarioNormalizado);

      const esConsejo =
		  usuarioNormalizado.consejo === true ||
		  usuarioNormalizado.consejo === "true" ||
		  usuarioNormalizado.consejo === "TRUE" ||
		  usuarioNormalizado.consejo === 1;

		const esInvAcreditado =
		  usuarioNormalizado.nivel === "INV" &&
		  usuarioNormalizado.estado_academico === "ACREDITADO";

		const puedeIngresar =
		  esConsejo || esInvAcreditado;

      setAutorizado(puedeIngresar);
    } catch {
      localStorage.removeItem("user");
      window.location.href = "/login";
      return;
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div>Cargando proceso para Numerario...</div>;
  }

  if (!user) {
    return <div>Cargando usuario...</div>;
  }

  if (!autorizado) {
    return (
      <div
        style={{
          maxWidth: "760px",
          background: "white",
          border: "1px solid #ebc8c8",
          borderRadius: "14px",
          padding: "2rem",
        }}
      >
        <p
          style={{
            margin: "0 0 0.4rem",
            color: "#8b2f2f",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "0.82rem",
          }}
        >
          Acceso restringido
        </p>

        <h1 style={{ marginTop: 0 }}>
          Proceso para Académico Numerario
        </h1>

        <p
          style={{
            lineHeight: 1.8,
            marginBottom: 0,
          }}
        >
          Este proceso está disponible únicamente para Académicos
          Investigadores que hayan obtenido su acreditación.
        </p>
      </div>
    );
  }

  const acreditacionPorReconocimiento =
    user.origen_acreditacion === "RECONOCIMIENTO";

  const acreditacionPorFormacion =
    user.origen_acreditacion === "FORMACION";

  return (
    <div
      style={{
        maxWidth: "980px",
      }}
    >
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
        Nivel Numerario
      </p>

      <h1
        style={{
          marginTop: 0,
          color: "#4d371c",
        }}
      >
        Proceso para Académico Numerario
      </h1>

      <p
        style={{
          lineHeight: 1.8,
        }}
      >
        El Nivel Numerario constituye la categoría académica superior
        dentro de la AGENN y está reservado para Académicos
        Investigadores acreditados que deseen continuar su desarrollo
        dentro de la Academia y cumplir los requisitos establecidos
        para este nivel.
      </p>

      <div
        style={{
          marginTop: "1.5rem",
          background: "#eef6e9",
          border: "1px solid #cfe3c4",
          borderRadius: "12px",
          padding: "1.25rem",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#356128",
          }}
        >
          ✓ Habilitado para iniciar el proceso
        </h2>

        <p
          style={{
            lineHeight: 1.8,
            marginBottom: 0,
          }}
        >
          Su condición de Académico Investigador acreditado le permite
          iniciar el proceso correspondiente para optar al Nivel
          Numerario.
        </p>
      </div>

      {(acreditacionPorFormacion ||
        acreditacionPorReconocimiento) && (
        <div
          style={{
            marginTop: "1.5rem",
            background: "#faf8f3",
            border: "1px solid #ddd4c7",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <p
            style={{
              margin: 0,
              lineHeight: 1.8,
            }}
          >
            <strong>
              Acreditación como Investigador:
            </strong>{" "}
            {acreditacionPorFormacion
              ? "obtenida mediante formación."
              : "otorgada por méritos reconocidos."}
          </p>
        </div>
      )}

      <div
        style={{
          marginTop: "2rem",
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
          Finalidad del proceso
        </h2>

        <p
          style={{
            lineHeight: 1.8,
          }}
        >
          El proceso para alcanzar el Nivel Numerario deberá acreditar
          una madurez académica superior, capacidad investigativa y una
          producción que contribuya al estudio y difusión de la
          numismática, la notafilia y las disciplinas relacionadas.
        </p>

        <p
          style={{
            lineHeight: 1.8,
            marginBottom: 0,
          }}
        >
          La estructura académica, requisitos, evidencias y mecanismos
          de evaluación de este proceso serán establecidos por el
          Consejo Académico.
        </p>
      </div>

      <div
        style={{
          marginTop: "1.5rem",
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
          Estructura del proceso
        </h2>

        <p
          style={{
            lineHeight: 1.8,
          }}
        >
          Esta sección contendrá posteriormente las etapas, requisitos
          y actividades necesarias para optar al Nivel Numerario.
        </p>

        <div
          style={{
            marginTop: "1rem",
            padding: "1.25rem",
            background: "#faf8f3",
            border: "1px dashed #cbbfa9",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#666",
              lineHeight: 1.7,
            }}
          >
            El contenido académico del Proceso Numerario se encuentra
            actualmente en preparación.
          </p>
        </div>
      </div>
    </div>
  );
}