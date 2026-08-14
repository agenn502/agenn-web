"use client";

import { useEffect, useState } from "react";

type User = {
  codigo: string;
  nombre: string;
  nivel: string;
  estado_academico?: string | null;
  origen_acreditacion?: string | null;
};

export default function DashboardINVACREDITADO() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsed = JSON.parse(stored);

      setUser({
        ...parsed,

        codigo: String(parsed.codigo || "")
          .trim()
          .toUpperCase(),

        nivel: String(parsed.nivel || "")
          .trim()
          .toUpperCase(),

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
      });
    } catch {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  }, []);

  if (!user) {
    return <p>Cargando...</p>;
  }

  const porFormacion =
    user.origen_acreditacion === "FORMACION";

  const porReconocimiento =
    user.origen_acreditacion === "RECONOCIMIENTO";

  return (
    <div
      style={{
        display: "grid",
        gap: "1.5rem",
      }}
    >
      {/* =====================================================
          ENCABEZADO
          ===================================================== */}

      <div
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "14px",
          padding: "2rem",
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
          Nivel Investigador
        </p>

        <h1
          style={{
            marginTop: 0,
            color: "#4d371c",
          }}
        >
          Académico Investigador acreditado
        </h1>

        {/* Acreditación obtenida mediante formación */}

        {porFormacion && (
          <p
            style={{
              lineHeight: 1.8,
              marginBottom: 0,
            }}
          >
            Ha completado satisfactoriamente el
            proceso de formación y acreditación
            correspondiente al Nivel Investigador
            de la AGENN.
          </p>
        )}

        {/* Acreditación otorgada por reconocimiento */}

        {porReconocimiento && (
          <p
            style={{
              lineHeight: 1.8,
              marginBottom: 0,
            }}
          >
            El Consejo Académico ha reconocido su
            trayectoria, experiencia y méritos
            académicos, otorgándole la acreditación
            correspondiente al Nivel Investigador
            de la AGENN.
          </p>
        )}

        {/* Compatibilidad por si existiera un acreditado
            antiguo sin origen registrado */}

        {!porFormacion && !porReconocimiento && (
          <p
            style={{
              lineHeight: 1.8,
              marginBottom: 0,
            }}
          >
            Su acreditación correspondiente al Nivel
            Investigador se encuentra registrada
            oficialmente en la AGENN.
          </p>
        )}
      </div>

      {/* =====================================================
          ESTADO DE ACREDITACIÓN
          ===================================================== */}

      <div
        style={{
          background: "#eef6e9",
          border: "1px solid #cfe3c4",
          borderRadius: "14px",
          padding: "1.5rem",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#356128",
          }}
        >
          ✓ Acreditación vigente
        </h2>

        {porFormacion && (
          <p
            style={{
              lineHeight: 1.8,
              marginBottom: 0,
            }}
          >
            Ha concluido el proceso de formación
            correspondiente al Nivel Investigador.
            No tiene unidades de formación
            pendientes en este nivel.
          </p>
        )}

        {porReconocimiento && (
          <p
            style={{
              lineHeight: 1.8,
              marginBottom: 0,
            }}
          >
            Su acreditación fue otorgada por
            resolución del Consejo Académico en
            reconocimiento de su trayectoria y
            méritos académicos. No requiere cursar
            el proceso de formación correspondiente
            al Nivel Investigador.
          </p>
        )}

        {!porFormacion && !porReconocimiento && (
          <p
            style={{
              lineHeight: 1.8,
              marginBottom: 0,
            }}
          >
            Su condición de Académico Investigador
            acreditado se encuentra vigente.
          </p>
        )}
      </div>

      {/* =====================================================
          QUÉ SIGUE
          ===================================================== */}

      <div
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
          ¿Qué sigue?
        </h2>

        <p style={{ lineHeight: 1.8 }}>
          Como Académico Investigador acreditado,
          puede continuar desarrollando su
          producción académica y participando en
          las actividades de la Academia.
        </p>

        <p
          style={{
            lineHeight: 1.8,
            marginBottom: 0,
          }}
        >
          Cuando cumpla los requisitos establecidos,
          podrá iniciar el proceso correspondiente
          para optar al Nivel Numerario.
        </p>
      </div>

      {/* =====================================================
          OPCIONES
          ===================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#6b4f2a",
            }}
          >
            Certificados
          </h3>

          <p
            style={{
              lineHeight: 1.7,
              color: "#555",
              marginBottom: 0,
            }}
          >
            Consulte los certificados académicos
            correspondientes a las acreditaciones
            que haya obtenido dentro de la Academia.
          </p>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #ddd4c7",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#6b4f2a",
            }}
          >
            Proceso para Numerario
          </h3>

          <p
            style={{
              lineHeight: 1.7,
              color: "#555",
              marginBottom: 0,
            }}
          >
            Consulte los requisitos y el
            procedimiento establecido para optar
            al Nivel Numerario.
          </p>
        </div>
      </div>
    </div>
  );
}