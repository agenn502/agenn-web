"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Ensayo = {
  id: number;
  titulo: string;
  slug: string;
  autor_nombre: string;
  autor_codigo: string;
  nivel: string;
  proceso: string;
  unidad_slug: string;
  imagen_url: string | null;
  contenido: string;
  codigo_verificacion: string;
  url_social: string | null;
  estado: string;
  created_at: string;
};

export default function EnsayosPage() {
  const [ensayos, setEnsayos] = useState<Ensayo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState("");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("ensayos")
        .select("*")
        .eq("estado", "publicado")
        .order("created_at", { ascending: false });

      if (!error) {
        setEnsayos((data as Ensayo[]) || []);
      }

      setLoading(false);
    };

    cargar();
  }, []);

  const niveles = Array.from(
    new Set(ensayos.map((e) => e.nivel).filter(Boolean))
  ).sort();

  const resultados = useMemo(() => {
    const t = busqueda.toLowerCase().trim();

    return ensayos.filter((ensayo) => {
      const texto = [
        ensayo.titulo,
        ensayo.autor_nombre,
        ensayo.autor_codigo,
        ensayo.nivel,
        ensayo.contenido,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!t || texto.includes(t)) &&
        (!nivelFiltro || ensayo.nivel === nivelFiltro)
      );
    });
  }, [ensayos, busqueda, nivelFiltro]);

  if (loading) return <main style={{ padding: "2rem" }}>Cargando ensayos...</main>;

  return (
    <main style={{ padding: "2rem", background: "#faf8f2", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Ensayos AGENN</h1>

        <p style={{ lineHeight: 1.8, maxWidth: "850px", color: "#555" }}>
          Esta sección reúne textos breves elaborados por miembros en formación
          de la Academia Guatemalteca de Estudios Numismáticos y Notafílicos,
          como parte de su proceso académico y de difusión del conocimiento.
        </p>

        <div
          style={{
            display: "flex",
            gap: "0.8rem",
            flexWrap: "wrap",
            margin: "1.5rem 0",
          }}
        >
          <input
            type="text"
            placeholder="Buscar por título, autor o contenido..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              flex: "1 1 320px",
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              fontSize: "1rem",
            }}
          />

          <select
            value={nivelFiltro}
            onChange={(e) => setNivelFiltro(e.target.value)}
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              background: "white",
            }}
          >
            <option value="">Todos los niveles</option>
            {niveles.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setBusqueda("");
              setNivelFiltro("");
            }}
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #6b4f2a",
              borderRadius: "8px",
              background: "#6b4f2a",
              color: "white",
              cursor: "pointer",
            }}
          >
            Limpiar
          </button>
        </div>

        <p style={{ color: "#555" }}>
          {resultados.length} ensayo{resultados.length !== 1 ? "s" : ""} encontrado
          {resultados.length !== 1 ? "s" : ""}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.2rem",
            marginTop: "1rem",
          }}
        >
          {resultados.map((ensayo) => (
            <article
              key={ensayo.id}
              style={{
                background: "white",
                border: "1px solid #ddd4c7",
                borderRadius: "14px",
                overflow: "hidden",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  height: "165px",
                  background: "#eee",
                  overflow: "hidden",
                }}
              >
                <img
                  src={ensayo.imagen_url || "/placeholder-miembro.jpg"}
                  alt={ensayo.titulo}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>

              <div
                style={{
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                }}
              >
                <p
                  style={{
                    margin: "0 0 0.4rem 0",
                    fontSize: "0.78rem",
                    color: "#6b6f1a",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {ensayo.nivel} · {ensayo.unidad_slug}
                </p>

                <h2
                  style={{
                    fontSize: "1.1rem",
                    lineHeight: 1.35,
                    margin: "0 0 0.6rem 0",
                  }}
                >
                  {ensayo.titulo}
                </h2>

                <p style={{ margin: "0 0 0.8rem 0", color: "#555" }}>
                  Por {ensayo.autor_nombre}
                </p>

                <p
                  style={{
                    color: "#666",
                    lineHeight: 1.55,
                    fontSize: "0.92rem",
                    flex: 1,
                  }}
                >
                  {ensayo.contenido.length > 180
                    ? ensayo.contenido.slice(0, 180) + "..."
                    : ensayo.contenido}
                </p>

                <Link
                  href={`/ensayos/${ensayo.slug}`}
                  style={{
                    marginTop: "0.8rem",
                    display: "inline-block",
                    color: "#4d371c",
                    fontWeight: "bold",
                    textDecoration: "none",
                  }}
                >
                  Leer ensayo
                </Link>
              </div>
            </article>
          ))}
        </div>

        {resultados.length === 0 && (
          <div
            style={{
              background: "white",
              border: "1px solid #ddd4c7",
              borderRadius: "12px",
              padding: "1.2rem",
              marginTop: "1rem",
            }}
          >
            No se encontraron ensayos publicados.
          </div>
        )}
      </div>
    </main>
  );
}