"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

type User = {
  codigo: string;
  nivel: string;
  nombre: string;
  consejo?: boolean;
};

export default function DirectorioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    const parsedUser = JSON.parse(stored);
    setUser(parsedUser);

    const cargarMiembros = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("miembros")
        .select("*")
        .order("codigo", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setMiembros(data || []);
      }

      setLoading(false);
    };

    cargarMiembros();
  }, []);

  if (loading) return <div>Cargando directorio...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!user) return <div>Cargando usuario...</div>;

  const nivelesVisibles: Record<string, string[]> = {
    NUM: ["NUM", "INV", "NOV", "ASP"],
    INV: ["INV", "NOV", "ASP"],
    NOV: ["NOV", "ASP"],
    ASP: ["ASP"],
  };

  const nombreNivel: Record<string, string> = {
    NUM: "Académico Numerario",
    INV: "Académico Investigador",
    NOV: "Académico Novicio",
    ASP: "Aspirante",
  };

  const visibles = nivelesVisibles[user.nivel] || [];

  const miembrosFiltrados = miembros.filter((m) => visibles.includes(m.nivel));

  const numerarios = miembrosFiltrados.filter((m) => m.nivel === "NUM");
  const investigadores = miembrosFiltrados.filter((m) => m.nivel === "INV");
  const novicios = miembrosFiltrados.filter((m) => m.nivel === "NOV");
  const aspirantes = miembrosFiltrados.filter((m) => m.nivel === "ASP");

  const renderGrupo = (titulo: string, lista: Miembro[]) => {
    if (lista.length === 0) return null;

    return (
      <section style={{ marginBottom: "2.5rem" }}>
        <h2
          style={{
            fontSize: "1.35rem",
            marginBottom: "1rem",
          }}
        >
          {titulo}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "18px",
          }}
        >
          {lista.map((miembro) => (
            <Link
              key={miembro.id}
              href={`/miembros/directorio/${miembro.codigo}`}
              style={{
                display: "block",
                border: "1px solid #ddd",
                borderRadius: "14px",
                padding: "12px",
                background: "#fff",
                textDecoration: "none",
                color: "inherit",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "818 / 1082",
                  marginBottom: "12px",
                  overflow: "hidden",
                  borderRadius: "10px",
                  background: "#f3f3f3",
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

              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                  lineHeight: 1.3,
                }}
              >
                {miembro.nombre}
              </h3>

              <p
                style={{
                  margin: "0 0 4px 0",
                  color: "#666",
                  fontSize: "0.9rem",
                }}
              >
                {miembro.codigo}
              </p>

              <p
                style={{
                  margin: 0,
                  color: "#444",
                  fontSize: "0.88rem",
                }}
              >
                {nombreNivel[miembro.nivel] || miembro.nivel}
              </p>
            </Link>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div>
      <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>Directorio</h1>

      {renderGrupo("Directorio de miembros Académicos Numerarios", numerarios)}
      {renderGrupo(
        "Directorio de miembros Académicos Investigadores",
        investigadores
      )}
      {renderGrupo("Directorio de miembros Académicos Novicios", novicios)}
      {renderGrupo("Directorio de Candidatos o Aspirantes", aspirantes)}
    </div>
  );
}