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
  publicaciones: string | null;
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
            String(item.codigo || "")
              .replace(/\s+/g, "")
              .trim()
              .toUpperCase() ===
            codigoRuta.replace(/\s+/g, "").trim().toUpperCase()
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

  const nombreNivel: Record<string, string> = {
    NUM: "Académico Numerario",
    INV: "Académico Investigador",
    NOV: "Académico Novicio",
    ASP: "Aspirante",
  };

  if (loading) {
    return <div>Cargando perfil...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }

  if (!miembro) {
    return <div>No hay datos del miembro.</div>;
  }

  return (
    <div className="detalle-miembro">
      <div className="detalle-grid">
        <div className="foto-box">
          <img
            src={miembro.foto_url || "/placeholder-miembro.jpg"}
            alt={miembro.nombre}
            className="foto-miembro"
          />
          <img
            src="/marcos/marco-miembro.png"
            alt="Marco"
            className="marco-miembro"
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

          {miembro.publicaciones && (
            <div style={{ marginTop: "1.5rem" }}>
              <h2 style={{ marginBottom: "0.5rem" }}>Publicaciones</h2>
              <ul style={{ paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                {miembro.publicaciones
                  .split("\n")
                  .filter((p) => p.trim() !== "")
                  .map((pub, i) => (
                    <li key={i} style={{ marginBottom: "0.4rem" }}>
                      {pub}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .detalle-miembro {
          max-width: 1000px;
        }

        .detalle-grid {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 32px;
          align-items: start;
        }

        .foto-box {
          position: relative;
          width: 100%;
          aspect-ratio: 818 / 1082;
          background: #f3f3f3;
          border-radius: 12px;
          overflow: hidden;
        }

        .foto-miembro {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .marco-miembro {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .detalle-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .foto-box {
            max-width: 280px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
}