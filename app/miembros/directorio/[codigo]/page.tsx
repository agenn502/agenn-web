"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Miembro = {
  id: number;
  codigo: string;
  nombre: string;
  nivel: string;
  foto_url: string | null;
  fecha_nacimiento: string | null;
  profesion: string | null;
  bio: string | null;
};

export default function MiembroDetallePage() {
  const params = useParams();
  const codigoRuta = String(params.codigo || "").trim().toUpperCase();

  const [miembro, setMiembro] = useState<Miembro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarMiembro = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("miembros")
        .select("*")
        .order("codigo", { ascending: true });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const encontrado =
        data?.find(
          (item) =>
            String(item.codigo || "").trim().toUpperCase() === codigoRuta
        ) || null;

      if (!encontrado) {
        setError("No se encontró el miembro.");
      } else {
        setMiembro(encontrado);
      }

      setLoading(false);
    };

    if (codigoRuta) {
      cargarMiembro();
    }
  }, [codigoRuta]);

  if (loading) {
    return <div>Cargando perfil...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }

  if (!miembro) {
    return <div>No hay datos del miembro.</div>;
  }

const nombreNivel: Record<string, string> = {
  NUM: "Académico Numerario",
  INV: "Académico Investigador",
  NOV: "Académico Novicio",
  ASP: "Aspirante",
};
  return (
    <div style={{ maxWidth: 1000 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: "32px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "818 / 1082",
            background: "#f3f3f3",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <img
            src={miembro.foto_url || "/placeholder-miembro.jpg"}
            alt={miembro.nombre}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
          <img
            src="/marcos/marco-miembro.png"
            alt="Marco"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />
        </div>

        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            {miembro.nombre}
          </h1>

          <p>
            <strong>Código:</strong> {miembro.codigo}
          </p>

          <p>
		    <strong>Nivel:</strong> {nombreNivel[miembro.nivel] || miembro.nivel}
		  </p>

          {miembro.fecha_nacimiento && (
            <p>
              <strong>Fecha de nacimiento:</strong> {miembro.fecha_nacimiento}
            </p>
          )}

          {miembro.profesion && (
            <p>
              <strong>Profesión:</strong> {miembro.profesion}
            </p>
          )}

          {miembro.bio && (
            <div style={{ marginTop: "1.5rem" }}>
              <h2 style={{ marginBottom: "0.5rem" }}>Biografía</h2>
              <p style={{ lineHeight: 1.7, whiteSpace: "pre-line" }}>
                {miembro.bio}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}