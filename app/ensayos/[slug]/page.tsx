"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";
import { nombreNivel, colorNivel } from "@/lib/niveles";

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
  fuente_imagen: string | null;
  tema: string | null;
};

export default function EnsayoDetallePage() {
  const params = useParams();
  const slug = String(params.slug || "");

  const [ensayo, setEnsayo] = useState<Ensayo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("ensayos")
        .select("*")
        .eq("slug", slug)
        .eq("estado", "publicado")
        .maybeSingle();

      if (!error && data) {
        setEnsayo(data as Ensayo);
      }

      setLoading(false);
    };

    if (slug) cargar();
  }, [slug]);

  const urlActual =
    typeof window !== "undefined"
      ? window.location.href
      : `https://agenn.org/ensayos/${slug}`;

  const textoCompartir = ensayo
	  ? `${ensayo.titulo}

	Ensayo publicado en AGENN como parte del proceso formativo del Nivel Investigador.

	Código de verificación: ${ensayo.codigo_verificacion}

	#NumismáticaGuatemalteca #AGENN

	${urlActual}`
	  : "";

  const copiarEnlace = async () => {
    await navigator.clipboard.writeText(textoCompartir);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  if (loading) {
    return <main style={{ padding: "2rem" }}>Cargando ensayo...</main>;
  }

  if (!ensayo) {
    return (
      <main style={{ padding: "2rem" }}>
        <p>No se encontró el ensayo.</p>
        <Link href="/ensayos">Volver a ensayos</Link>
      </main>
    );
  }

  return (
    <main style={{ background: "#faf8f2", minHeight: "100vh", padding: "2rem" }}>
      <article
        style={{
          maxWidth: "920px",
          margin: "0 auto",
          background: "white",
          border: "1px solid #ddd4c7",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        {ensayo.imagen_url && (
          <div style={{ width: "100%", maxHeight: "380px", overflow: "hidden" }}>
            <img
              src={ensayo.imagen_url}
              alt={ensayo.titulo}
              style={{
                width: "100%",
                height: "100%",
                maxHeight: "380px",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        )}
		
		{ensayo.fuente_imagen && (
		  <p
			style={{
			  fontSize: "0.85rem",
			  color: "#666",
			  padding: "0.6rem 2rem 0",
			  margin: 0,
			}}
		  >
			Fuente de imagen: {ensayo.fuente_imagen}
		  </p>
		)}

        <div style={{ padding: "2rem" }}>
          <p
            style={{
              margin: "0 0 0.6rem 0",
              fontSize: "0.82rem",
              color: "#6b6f1a",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <span
			  style={{
				color: colorNivel(ensayo.nivel),
				fontWeight: 700,
			  }}
			>
			  {nombreNivel(ensayo.nivel)}
			</span>{" "}
			· {ensayo.proceso} · {ensayo.unidad_slug}
          </p>

          <h1 style={{ marginTop: 0, fontSize: "2rem", lineHeight: 1.2 }}>
            {ensayo.titulo}
          </h1>
		  {ensayo.tema && (
			  <p style={{ color: "#555", lineHeight: 1.7 }}>
				<strong>Tema:</strong> {ensayo.tema}
			  </p>
			)}

          <p style={{ color: "#555", marginBottom: "1.5rem" }}>
            Por <strong>{ensayo.autor_nombre}</strong> · {ensayo.autor_codigo}
          </p>

          <div
            style={{
              lineHeight: 1.85,
              fontSize: "1.03rem",
              marginBottom: "2rem",
            }}
          >
            <ReactMarkdown>{ensayo.contenido}</ReactMarkdown>
          </div>

          <div
            style={{
              borderTop: "1px solid #ddd4c7",
              paddingTop: "1.2rem",
              display: "flex",
              gap: "0.8rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              onClick={copiarEnlace}
              style={{
                background: "#6b4f2a",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                cursor: "pointer",
              }}
            >
              {copiado ? "Texto copiado" : "Copiar texto para compartir"}
            </button>

            <Link
              href="/ensayos"
              style={{
                color: "#4d371c",
                fontWeight: "bold",
                textDecoration: "none",
                marginLeft: "auto",
              }}
            >
              Volver a ensayos
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}