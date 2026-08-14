"use client";

import { useEffect, useState } from "react";
import AspirantesPanel from "@/components/aprobacion/AspirantesPanel";
import CandidatosPanel from "@/components/aprobacion/CandidatosPanel";
import InvestigadoresPanel from "@/components/aprobacion/InvestigadoresPanel";
import NoviciosPanel from "@/components/aprobacion/NoviciosPanel";
import AsimilacionesPanel from "@/components/aprobacion/AsimilacionesPanel";

type User = {
  codigo: string;
  nombre: string;
  nivel: string;
  consejo?: boolean | string | number;
};

type Pestana =
  | "candidatos"
  | "aspirantes"
  | "novicios"
  | "investigadores"
  | "asimilaciones";

type Conteos = {
  candidatos: number;
  aspirantes: number;
  novicios: number;
  investigadores: number;
  asimilaciones: number;
};

export default function ProcesoAprobacionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activa, setActiva] = useState<Pestana>("candidatos");

  const [conteos, setConteos] = useState<Conteos>({
    candidatos: 0,
    aspirantes: 0,
    novicios: 0,
    investigadores: 0,
    asimilaciones: 0,
  });

  useEffect(() => {
    const cargar = async () => {
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

      if (!consejo) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/aprobacion/pendientes", {
          headers: {
            "x-user-codigo": parsed.codigo,
          },
          cache: "no-store",
        });

        const result = await response.json();

        if (response.ok && result.ok) {
          setConteos((actual) => ({
            ...actual,
            ...(result.conteos || {}),
            asimilaciones:
              Number(result.conteos?.asimilaciones) || 0,
          }));
        }
      } catch (error) {
        console.error(
          "Error cargando conteos del proceso de aprobación:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  if (loading) {
    return <div>Cargando proceso de aprobación...</div>;
  }

  if (!esConsejo || !user) {
    return (
      <div style={{ color: "red" }}>
        Esta sección es exclusiva del Consejo Académico.
      </div>
    );
  }

  const pestanas: { id: Pestana; label: string }[] = [
    { id: "candidatos", label: "Candidatos" },
    { id: "aspirantes", label: "Aspirantes" },
    { id: "novicios", label: "Novicios" },
    { id: "investigadores", label: "Investigadores" },
    { id: "asimilaciones", label: "Asimilaciones" },
  ];

  const tituloActivo =
    pestanas.find((pestana) => pestana.id === activa)?.label || "";

  return (
    <div style={{ maxWidth: 1100 }}>
      <h1 style={{ marginTop: 0 }}>Proceso de aprobación</h1>

      <p style={{ lineHeight: 1.7 }}>
        Centro de revisión del Consejo Académico para solicitudes de ingreso,
        actividades formativas, procesos de acreditación y propuestas de
        incorporación por asimilación.
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          margin: "1.5rem 0",
          flexWrap: "wrap",
        }}
      >
        {pestanas.map((pestana) => {
          const seleccionada = activa === pestana.id;

          return (
            <button
              key={pestana.id}
              type="button"
              onClick={() => setActiva(pestana.id)}
              style={{
                background: seleccionada ? "#6b6f1a" : "white",
                color: seleccionada ? "white" : "#4d371c",
                border: "1px solid #6b6f1a",
                padding: "0.65rem 1rem",
                borderRadius: 999,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {pestana.label}

              <span
                style={{
                  display: "inline-grid",
                  placeItems: "center",
                  minWidth: 24,
                  height: 24,
                  padding: "0 6px",
                  marginLeft: 6,
                  borderRadius: 999,
                  background: seleccionada ? "white" : "#6b6f1a",
                  color: seleccionada ? "#6b6f1a" : "white",
                  fontSize: "0.8rem",
                }}
              >
                {conteos[pestana.id]}
              </span>
            </button>
          );
        })}
      </div>

      <h2>{tituloActivo} pendientes de aprobación</h2>

      {activa === "candidatos" && (
        <CandidatosPanel
          userCodigo={user.codigo}
          onConteoChange={(numero) =>
            setConteos((actual) => ({
              ...actual,
              candidatos: numero,
            }))
          }
        />
      )}

      {activa === "aspirantes" && <AspirantesPanel />}

      {activa === "novicios" && <NoviciosPanel />}

      {activa === "investigadores" && (
        <InvestigadoresPanel
          user={user}
          onConteoChange={(numero) =>
            setConteos((actual) => ({
              ...actual,
              investigadores: numero,
            }))
          }
        />
      )}

      {activa === "asimilaciones" && <AsimilacionesPanel />}
    </div>
  );
}