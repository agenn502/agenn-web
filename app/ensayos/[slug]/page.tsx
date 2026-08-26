

import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { supabaseServer } from "@/lib/supabaseServer";
import { nombreNivel, colorNivel } from "@/lib/niveles";
import CompartirEnsayo from "./CompartirEnsayo";

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

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    origen?: string | string[];
    volver?: string | string[];
  }>;
};

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://agenn-web.vercel.app"
).replace(/\/+$/, "");

function limpiarMarkdown(texto: string) {
  return texto
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[`*_>#~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function descripcionEnsayo(ensayo: Ensayo) {
  const base = limpiarMarkdown(ensayo.contenido);

  if (base.length <= 180) {
    return base || `Ensayo de ${ensayo.autor_nombre} publicado en AGENN.`;
  }

  return `${base.slice(0, 177).trim()}...`;
}

async function obtenerEnsayo(slug: string): Promise<Ensayo | null> {
  const { data, error } = await supabaseServer
    .from("ensayos")
    .select(
      `
      id,
      titulo,
      slug,
      autor_nombre,
      autor_codigo,
      nivel,
      proceso,
      unidad_slug,
      imagen_url,
      contenido,
      codigo_verificacion,
      url_social,
      estado,
      created_at,
      fuente_imagen,
      tema
      `
    )
    .eq("slug", slug)
    .eq("estado", "publicado")
    .maybeSingle();

  if (error) {
    console.error("Error cargando ensayo público:", error);
    return null;
  }

  return (data as Ensayo | null) || null;
}

export async function generateMetadata({
  params,
}: Pick<PageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const ensayo = await obtenerEnsayo(String(slug || ""));

  if (!ensayo) {
    return {
      metadataBase: new URL(SITE_URL),
      title: "Ensayo no encontrado | AGENN",
      description:
        "El ensayo solicitado no se encuentra disponible en AGENN.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const urlCanonica = `${SITE_URL}/ensayos/${ensayo.slug}`;
  const descripcion = descripcionEnsayo(ensayo);

  const imagenes = ensayo.imagen_url
    ? [
        {
          url: ensayo.imagen_url,
          alt: ensayo.titulo,
        },
      ]
    : undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title: `${ensayo.titulo} | AGENN`,
    description: descripcion,
    alternates: {
      canonical: urlCanonica,
    },
    openGraph: {
      type: "article",
      locale: "es_GT",
      url: urlCanonica,
      siteName:
        "Academia Guatemalteca de Estudios Numismáticos y Notafílicos",
      title: ensayo.titulo,
      description: descripcion,
      publishedTime: ensayo.created_at,
      authors: [ensayo.autor_nombre],
      images: imagenes,
    },
    twitter: {
      card: ensayo.imagen_url ? "summary_large_image" : "summary",
      title: ensayo.titulo,
      description: descripcion,
      images: ensayo.imagen_url ? [ensayo.imagen_url] : undefined,
    },
  };
}

export default async function EnsayoDetallePage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const ensayo = await obtenerEnsayo(String(slug || ""));

  if (!ensayo) {
    return (
      <main style={{ padding: "2rem" }}>
        <p>No se encontró el ensayo.</p>
        <a href="/ensayos">Volver a ensayos</a>
      </main>
    );
  }

  const origen = Array.isArray(query.origen)
    ? query.origen[0]
    : query.origen;

  const volverRecibido = Array.isArray(query.volver)
    ? query.volver[0]
    : query.volver;

  /*
   * Solo aceptamos una ruta interna de Revista AGENN.
   * Así evitamos utilizar como retorno una URL externa recibida por query.
   */
  const volverARevista =
    origen === "revista" &&
    typeof volverRecibido === "string" &&
    volverRecibido.startsWith("/revista");

  const volverHref = volverARevista ? volverRecibido : "/ensayos";
  const volverTexto = volverARevista
    ? "Volver a Revista AGENN"
    : "Volver a ensayos";

  const urlCanonica = `${SITE_URL}/ensayos/${ensayo.slug}`;

  return (
    <main
      style={{
        background: "#faf8f2",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
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
          <div
            style={{
              width: "100%",
              maxHeight: "380px",
              overflow: "hidden",
            }}
          >
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

          <h1
            style={{
              marginTop: 0,
              fontSize: "2rem",
              lineHeight: 1.2,
            }}
          >
            {ensayo.titulo}
          </h1>

          {ensayo.tema && (
            <p style={{ color: "#555", lineHeight: 1.7 }}>
              <strong>Tema:</strong> {ensayo.tema}
            </p>
          )}

          <p style={{ color: "#555", marginBottom: "1.5rem" }}>
            Por <strong>{ensayo.autor_nombre}</strong> ·{" "}
            {ensayo.autor_codigo}
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

          <CompartirEnsayo
            titulo={ensayo.titulo}
            codigoVerificacion={ensayo.codigo_verificacion}
            urlCanonica={urlCanonica}
            volverHref={volverHref}
            volverTexto={volverTexto}
          />
        </div>
      </article>
    </main>
  );
}
