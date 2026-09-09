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
  tipo_trabajo: string | null;
};

const NOMBRES_TIPO: Record<string, string> = {
  ANALISIS_BREVE: "Análisis breve",
  NOTA_INVESTIGACION: "Nota de investigación",
  ENSAYO_ACADEMICO: "Ensayo académico",
};

function textoPlano(contenido: string) {
  return contenido
    .replace("<!--AGENN_RICH_HTML_V1-->", " ")
    .replace(/<p\b[^>]*data-agenn-imagen-id=["']\d+["'][^>]*>[\s\S]*?<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[(?:IMAGEN:\d+|ESPACIO)\]\]/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export default function EnsayosPage() {
  const [ensayos, setEnsayos] = useState<Ensayo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("ensayos")
        .select("*")
        .eq("estado", "publicado")
        .eq("estado_revision", "aprobado")
        .eq("origen_ensayo", "FORMACION")
        .order("created_at", { ascending: false });

      if (!error) {
        setEnsayos((data as Ensayo[]) || []);
      }

      setLoading(false);
    };

    cargar();
  }, []);

  const resultados = useMemo(() => {
    const t = busqueda.toLowerCase().trim();

    return ensayos.filter((ensayo) => {
      const texto = [
        ensayo.titulo,
        ensayo.autor_nombre,
        ensayo.autor_codigo,
        ensayo.nivel,
        NOMBRES_TIPO[ensayo.tipo_trabajo || ""] || "Trabajo escrito",
        textoPlano(ensayo.contenido),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!t || texto.includes(t)) &&
        (!tipoFiltro || ensayo.tipo_trabajo === tipoFiltro)
      );
    });
  }, [ensayos, busqueda, tipoFiltro]);

  if (loading) return <main style={{ padding: "2rem" }}>Cargando trabajos académicos...</main>;

  return (
    <main style={{ padding: "2rem", background: "#faf8f2", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Trabajos académicos</h1>

        <p style={{ lineHeight: 1.8, maxWidth: "850px", color: "#555" }}>
          Esta sección reúne los análisis breves, notas de investigación y
          ensayos académicos aprobados durante el proceso formativo del Nivel
          Investigador de AGENN.
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
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            aria-label="Filtrar por tipo de trabajo"
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              background: "white",
            }}
          >
            <option value="">Todos los tipos</option>
            <option value="ANALISIS_BREVE">Análisis breve</option>
            <option value="NOTA_INVESTIGACION">Nota de investigación</option>
            <option value="ENSAYO_ACADEMICO">Ensayo académico</option>
          </select>

          <button
            onClick={() => {
              setBusqueda("");
              setTipoFiltro("");
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
          {resultados.length} trabajo{resultados.length !== 1 ? "s" : ""} encontrado
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
              {ensayo.imagen_url && <div
                style={{
                  height: "165px",
                  background: "#eee",
                  overflow: "hidden",
                }}
              >
                <img
                  src={ensayo.imagen_url}
                  alt={ensayo.titulo}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>}

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
                  {NOMBRES_TIPO[ensayo.tipo_trabajo || ""] || "Trabajo escrito"} · {ensayo.unidad_slug}
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
                  {textoPlano(ensayo.contenido).length > 180
                    ? textoPlano(ensayo.contenido).slice(0, 180) + "..."
                    : textoPlano(ensayo.contenido)}
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
                  Leer trabajo
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
            No se encontraron trabajos académicos aprobados.
          </div>
        )}
      </div>
    </main>
  );
}