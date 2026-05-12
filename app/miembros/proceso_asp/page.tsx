"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean | string | number;
};

type ProgresoRow = {
  user_codigo: string;
  unidad_slug: string;
  completada: boolean;
  porcentaje: number;
  respuestas: any;
};

export default function ProcesoAspPage() {
  const [user, setUser] = useState<User | null>(null);
  const [esConsejo, setEsConsejo] = useState(false);
  const [progreso, setProgreso] = useState<ProgresoRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        window.location.href = "/login";
        return;
      }

      const parsed = JSON.parse(stored) as User;

      const consejoNormalizado =
        parsed.consejo === true ||
        parsed.consejo === "true" ||
        parsed.consejo === "TRUE" ||
        parsed.consejo === 1;

      setUser(parsed);
      setEsConsejo(consejoNormalizado);

      if (!consejoNormalizado && parsed.nivel !== "ASP") {
        setError("Esta sección corresponde al proceso de ingreso del Nivel Aspirante.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("progreso_aspirante")
        .select("*")
        .eq("user_codigo", parsed.codigo)
        .eq("unidad_slug", "introductorio")
        .maybeSingle();

      if (error) {
        setError(error.message);
      } else {
        setProgreso((data as ProgresoRow) || null);
      }

      setLoading(false);
    };

    cargar();
  }, []);

  const porcentajeGeneral = useMemo(() => {
    return progreso?.porcentaje || 0;
  }, [progreso]);

  if (loading) return <div>Cargando proceso de ingreso...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!user) return <div>Cargando usuario...</div>;

  return (
    <div style={{ maxWidth: "980px" }}>
      <h1 style={{ marginTop: 0 }}>Proceso de Ingreso — Nivel Aspirante</h1>

      <p style={{ lineHeight: 1.8 }}>
        El <strong>Nivel Aspirante</strong> corresponde a la etapa inicial de
        acercamiento académico a la Academia. Su propósito es ofrecer una base común
        de conocimientos introductorios sobre numismática, notafilia, historia del
        dinero, coleccionismo, conservación y criterios básicos de análisis.
      </p>

      <p style={{ lineHeight: 1.8 }}>
        Este proceso permite valorar el interés, la constancia y la comprensión
        inicial del participante antes de incorporarse formalmente al Nivel Novicio.
      </p>

      <div
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          margin: "1.5rem 0",
        }}
      >
        <p style={{ marginTop: 0, marginBottom: "0.6rem" }}>
          <strong>Avance general:</strong> {porcentajeGeneral}%
        </p>

        <div
          style={{
            width: "100%",
            height: "14px",
            background: "#e6dfd1",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${porcentajeGeneral}%`,
              height: "100%",
              background: "#6b6f1a",
            }}
          />
        </div>

        {esConsejo && (
          <p style={{ marginBottom: 0, marginTop: "0.8rem", color: "#555" }}>
            Modo Consejo Académico: puedes revisar este proceso sin restricción.
          </p>
        )}
      </div>

      <h2>Estructura del proceso</h2>

      <div
        style={{
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1rem",
          marginTop: "1rem",
        }}
      >
        <p
          style={{
            marginTop: 0,
            marginBottom: "0.4rem",
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "#6b6f1a",
            fontWeight: 700,
          }}
        >
          Unidad de ingreso
        </p>

        <h3 style={{ marginTop: 0 }}>Módulo Introductorio</h3>

        <p style={{ color: "#555", lineHeight: 1.6 }}>
          Fundamentos de numismática, notafilia, historia del dinero,
          coleccionismo y criterios básicos de conservación.
        </p>

        <p style={{ marginBottom: "0.5rem" }}>
          <strong>Avance:</strong> {porcentajeGeneral}%
        </p>

        <div
          style={{
            width: "100%",
            height: "10px",
            background: "#e6dfd1",
            borderRadius: "999px",
            overflow: "hidden",
            marginBottom: "0.8rem",
          }}
        >
          <div
            style={{
              width: `${porcentajeGeneral}%`,
              height: "100%",
              background: progreso?.completada ? "#4f7f3b" : "#6b6f1a",
            }}
          />
        </div>

        <p style={{ marginTop: 0, marginBottom: "1rem", color: "#555" }}>
          {progreso?.completada
            ? "Módulo completado. El aspirante queda habilitado para incorporarse al Nivel Novicio."
            : "Módulo disponible."}
        </p>

        <Link
          href="/miembros/proceso_asp/introductorio"
          style={{
            display: "inline-block",
            background: "#6b6f1a",
            color: "white",
            padding: "0.7rem 1rem",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          Ingresar
        </Link>
      </div>

      <h2 style={{ marginTop: "2rem" }}>Promoción al Nivel Novicio</h2>

      <p style={{ lineHeight: 1.8 }}>
        Al completar satisfactoriamente el módulo introductorio, el Aspirante podrá
        ser promovido al <strong>Nivel Novicio</strong>, donde iniciará formalmente
        el proceso de formación académica mediante las diez unidades temáticas del
        programa.
      </p>
    </div>
  );
}