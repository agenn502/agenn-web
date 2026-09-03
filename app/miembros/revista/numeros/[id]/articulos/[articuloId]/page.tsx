"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import RevistaHeader from "@/components/revista/RevistaHeader";
import CompartirArticulo from "@/components/revista/CompartirArticulo";
import Footer from "@/components/Footer";

type Imagen = {
  id: number;
  version_id: number | null;
  url: string;
  titulo: string;
  fuente: string;
  orden: number;
};

type Resena = {
  titulo_obra: string;
  autores_obra: string;
  editorial: string | null;
  edicion: string | null;
  anio_publicacion: number | null;
  isbn: string | null;
  numero_paginas: number | null;
  portada_url: string | null;
  portada_alt: string | null;
  fuente_portada: string | null;
};

type Articulo = {
  id: number;
  manuscrito_id: number;
  version_id: number;
  seccion: string | null;
  orden: number;
  localizador: string | null;
  manuscrito: {
    id: number;
    titulo_actual: string;
    tipo_contenido: string;
    tipo_autoria: string;
    autor_corporativo: string | null;
    mostrar_referencia: boolean;
    autor: { id: number; codigo: string; nombre: string; nivel: string } | null;
  } | null;
  resena: Resena | null;
  version: {
    id: number;
    numero_version: number;
    titulo: string;
    contenido: string;
    imagen_url: string | null;
    fuente_imagen: string | null;
    imagenes: Imagen[];
  } | null;
};

function autorPublico(articulo: Articulo) {
  if (articulo.manuscrito?.tipo_autoria === "CONSEJO_EDITORIAL") {
    return articulo.manuscrito.autor_corporativo || "Consejo Editorial";
  }
  return articulo.manuscrito?.autor?.nombre || "Autor no identificado";
}

function sinPuntoFinal(valor: string) {
  return valor.trim().replace(/\.+$/, "");
}

type Numero = {
  id: number;
  volumen: number | null;
  numero: number;
  anio: number;
};

function codigoLocal() {
  const stored = localStorage.getItem("user");
  if (!stored) return "";
  try {
    return String(JSON.parse(stored).codigo || "")
      .trim()
      .toUpperCase();
  } catch {
    return "";
  }
}

function renderTexto(texto: string): ReactNode[] {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n");
  const salida: ReactNode[] = [];

  lineas.forEach((linea, i) => {
    const limpia = linea.trim();

    if (!limpia) {
      salida.push(<div key={`esp-${i}`} style={{ height: "0.9rem" }} />);
      return;
    }

    if (limpia.startsWith("### ")) {
      salida.push(<h3 key={i}>{limpia.slice(4)}</h3>);
      return;
    }

    if (limpia.startsWith("## ")) {
      salida.push(<h2 key={i}>{limpia.slice(3)}</h2>);
      return;
    }

    if (limpia.startsWith("# ")) {
      salida.push(<h2 key={i}>{limpia.slice(2)}</h2>);
      return;
    }

    salida.push(
      <p key={i} style={{ margin: "0 0 1.15rem", lineHeight: 1.9 }}>
        {renderInline(limpia)}
      </p>,
    );
  });

  return salida;
}

function renderInline(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(Boolean);

  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    if (parte.startsWith("*") && parte.endsWith("*")) {
      return <em key={i}>{parte.slice(1, -1)}</em>;
    }
    return <span key={i}>{parte}</span>;
  });
}

const PREFIJO_HTML_ENRIQUECIDO = "<!--AGENN_RICH_HTML_V1-->";

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function figuraHtml(imagen: Imagen) {
  const titulo = imagen.titulo
    ? `<strong style="display:block">${escaparHtml(imagen.titulo)}</strong>`
    : "";
  const fuente = imagen.fuente
    ? `<span style="display:block">Fuente: ${escaparHtml(imagen.fuente)}</span>`
    : "";

  return `<figure style="margin:2.2rem auto;max-width:760px;text-align:center"><img src="${escaparHtml(imagen.url)}" alt="${escaparHtml(imagen.titulo || "Imagen del artículo")}" style="width:100%;height:auto;display:block;border-radius:4px" />${titulo || fuente ? `<figcaption style="margin-top:.65rem;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#555">${titulo}${fuente}</figcaption>` : ""}</figure>`;
}

function htmlEnriquecidoConImagenes(contenido: string, imagenes: Imagen[]) {
  const mapa = new Map(imagenes.map((imagen) => [Number(imagen.id), imagen]));
  const html = contenido.trimStart().slice(PREFIJO_HTML_ENRIQUECIDO.length);

  return html.replace(
    /<p\b[^>]*data-agenn-imagen-id=["'](\d+)["'][^>]*>[\s\S]*?<\/p>/gi,
    (_marcador, idTexto: string) => {
      const imagen = mapa.get(Number(idTexto));
      return imagen
        ? figuraHtml(imagen)
        : '<div style="padding:1rem;border:1px dashed #c9b8a2;color:#8b5e34;margin:1.5rem 0">Imagen editorial no disponible en esta versión.</div>';
    },
  );
}

const fichaResena: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(170px, 260px) minmax(0, 1fr)",
  gap: "2rem",
  alignItems: "start",
  margin: "2.5rem 3mm 0",
  padding: "1.5rem",
  background: "#f6f2e9",
  border: "1px solid #ddd4c7",
  borderRadius: "12px",
};
const figuraPortada: React.CSSProperties = { margin: 0, textAlign: "center" };
const imagenPortada: React.CSSProperties = {
  display: "block",
  width: "100%",
  maxHeight: "380px",
  objectFit: "contain",
  borderRadius: "6px",
};
const piePortada: React.CSSProperties = {
  marginTop: "0.55rem",
  color: "#666",
  fontSize: "0.82rem",
};
const etiquetaFicha: React.CSSProperties = {
  margin: 0,
  color: "#6b6f1a",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontSize: "0.78rem",
};
const tituloObra: React.CSSProperties = {
  margin: "0.45rem 0 1rem",
  color: "#4d371c",
  fontFamily: "Georgia, serif",
};
const datosFicha: React.CSSProperties = {
  display: "grid",
  gap: "0.55rem",
  margin: 0,
  lineHeight: 1.5,
};

function contenidoConImagenes(contenido: string, imagenes: Imagen[]) {
  if (contenido.trimStart().startsWith(PREFIJO_HTML_ENRIQUECIDO)) {
    return (
      <div
        className="contenido-html-enriquecido"
        dangerouslySetInnerHTML={{
          __html: htmlEnriquecidoConImagenes(contenido, imagenes),
        }}
      />
    );
  }

  const mapa = new Map(imagenes.map((img) => [Number(img.id), img]));
  const partes = contenido.split(/(\[\[IMAGEN:\d+\]\]|\[\[ESPACIO\]\])/g);

  return partes.map((parte, indice) => {
    const match = parte.match(/^\[\[IMAGEN:(\d+)\]\]$/);

    if (match) {
      const imagen = mapa.get(Number(match[1]));

      if (!imagen) {
        return (
          <div
            key={indice}
            style={{
              padding: "1rem",
              border: "1px dashed #c9b8a2",
              color: "#8b5e34",
              margin: "1.5rem 0",
            }}
          >
            Imagen editorial no disponible en esta versión.
          </div>
        );
      }

      return (
        <figure
          key={indice}
          style={{ margin: "2.2rem auto", maxWidth: "760px" }}
        >
          <img
            src={imagen.url}
            alt={imagen.titulo || "Imagen del artículo"}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: "4px",
            }}
          />
          {(imagen.titulo || imagen.fuente) && (
            <figcaption
              style={{
                marginTop: "0.65rem",
                fontSize: "0.9rem",
                lineHeight: 1.5,
                color: "#555",
              }}
            >
              {imagen.titulo && (
                <div>
                  <strong>{imagen.titulo}</strong>
                </div>
              )}
              {imagen.fuente && <div>Fuente: {imagen.fuente}</div>}
            </figcaption>
          )}
        </figure>
      );
    }

    if (parte === "[[ESPACIO]]") {
      return <div key={indice} style={{ height: "1.1rem" }} />;
    }

    return <div key={indice}>{renderTexto(parte)}</div>;
  });
}

export default function ArticuloRevistaPage() {
  const params = useParams();
  const numeroId = String(params.id || "");
  const articuloId = Number(params.articuloId);

  const [numero, setNumero] = useState<Numero | null>(null);
  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const codigo = codigoLocal();
      if (!codigo) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch(`/api/revista/numeros/${numeroId}`, {
        headers: { "x-user-codigo": codigo },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No fue posible cargar el artículo.");
      }

      const encontrado = (data.articulos || []).find(
        (a: Articulo) => Number(a.id) === articuloId,
      );

      if (!encontrado) {
        throw new Error("Este artículo no pertenece al número solicitado.");
      }

      setNumero(data.numero);
      setArticulo(encontrado);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No fue posible cargar el artículo.",
      );
    } finally {
      setLoading(false);
    }
  }, [numeroId, articuloId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const referencia = useMemo(() => {
    if (!numero || !articulo) return "";

    const autor = autorPublico(articulo);
    const titulo =
      articulo.version?.titulo ||
      articulo.manuscrito?.titulo_actual ||
      "Sin título";
    const volumen = numero.volumen || "—";

    const resena =
      articulo.manuscrito?.tipo_contenido === "RESENA" && articulo.resena
        ? `[Reseña del libro ${sinPuntoFinal(articulo.resena.titulo_obra)}, por ${articulo.resena.autores_obra}]. `
        : "";
    return `${autor}. (${numero.anio}). ${sinPuntoFinal(titulo)}. ${resena}Revista AGENN, ${volumen}(${numero.numero}), ${articulo.localizador || ""}.`;
  }, [numero, articulo]);

  if (loading) return <p>Cargando artículo...</p>;
  if (!numero || !articulo)
    return <p>{error || "No se encontró el artículo."}</p>;

  const version = articulo.version;

  return (
    <>
      <RevistaHeader />
      <main
        style={{ maxWidth: "900px", margin: "0 auto", paddingBottom: "5rem" }}
      >
        <nav style={{ marginBottom: "2rem" }}>
          <Link
            href={`/miembros/revista/numeros/${numeroId}/vista-previa`}
            style={{
              color: "#4d371c",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ← Volver al número
          </Link>
        </nav>

        <header
          style={{
            borderTop: "7px solid #4d371c",
            padding: "2rem 0 2.3rem",
            borderBottom: "1px solid #ddd4c7",
          }}
        >
          <div
            style={{
              color: "#6b6f1a",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontSize: "0.82rem",
            }}
          >
            Revista AGENN · Vol. {numero.volumen || "—"} · Núm. {numero.numero}{" "}
            · {numero.anio} · {articulo.localizador || "—"}
          </div>

          <h1
            style={{
              color: "#4d371c",
              fontFamily: "Georgia, serif",
              fontSize: "clamp(2rem, 5vw, 3.6rem)",
              lineHeight: 1.08,
              margin: "1.1rem 0",
            }}
          >
            {version?.titulo ||
              articulo.manuscrito?.titulo_actual ||
              "Trabajo sin título"}
          </h1>

          <div style={{ fontSize: "1.1rem", color: "#555" }}>
            {autorPublico(articulo)}
          </div>

          {articulo.seccion && (
            <div style={{ marginTop: "0.8rem", color: "#777" }}>
              {articulo.seccion}
            </div>
          )}

          <CompartirArticulo
            titulo={
              version?.titulo ||
              articulo.manuscrito?.titulo_actual ||
              "Artículo de Revista AGENN"
            }
          />
        </header>

        {articulo.manuscrito?.tipo_contenido === "RESENA" &&
          articulo.resena && (
            <section style={fichaResena}>
              {articulo.resena.portada_url && (
                <figure style={figuraPortada}>
                  <img
                    src={articulo.resena.portada_url}
                    alt={
                      articulo.resena.portada_alt ||
                      `Portada de ${articulo.resena.titulo_obra}`
                    }
                    style={imagenPortada}
                  />
                  {articulo.resena.fuente_portada && (
                    <figcaption style={piePortada}>
                      Fuente: {articulo.resena.fuente_portada}
                    </figcaption>
                  )}
                </figure>
              )}
              <div>
                <p style={etiquetaFicha}>Obra reseñada</p>
                <h2 style={tituloObra}>{articulo.resena.titulo_obra}</h2>
                <dl className="datos-ficha-resena" style={datosFicha}>
                  <div>
                    <dt>Autoría</dt>
                    <dd>{articulo.resena.autores_obra}</dd>
                  </div>
                  {articulo.resena.editorial && (
                    <div>
                      <dt>Editorial</dt>
                      <dd>{articulo.resena.editorial}</dd>
                    </div>
                  )}
                  {articulo.resena.edicion && (
                    <div>
                      <dt>Edición</dt>
                      <dd>{articulo.resena.edicion}</dd>
                    </div>
                  )}
                  {articulo.resena.anio_publicacion && (
                    <div>
                      <dt>Año</dt>
                      <dd>{articulo.resena.anio_publicacion}</dd>
                    </div>
                  )}
                  {articulo.resena.isbn && (
                    <div>
                      <dt>ISBN</dt>
                      <dd>{articulo.resena.isbn}</dd>
                    </div>
                  )}
                  {articulo.resena.numero_paginas && (
                    <div>
                      <dt>Páginas</dt>
                      <dd>{articulo.resena.numero_paginas}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </section>
          )}

        {error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: "#fff3f3",
            }}
          >
            {error}
          </div>
        )}

        <article
          style={{
            padding: "3rem 0",
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: "18px",
            lineHeight: 1.9,
            textAlign: "justify",
            color: "#2f2b27",
          }}
        >
          {version?.contenido ? (
            contenidoConImagenes(version.contenido, version.imagenes || [])
          ) : (
            <p>Esta versión no contiene texto.</p>
          )}
        </article>

        {articulo.manuscrito?.mostrar_referencia !== false && (
          <aside
            style={{
              marginTop: "2rem",
              padding: "1.5rem",
              background: "#f6f2e9",
              borderRadius: "10px",
              borderLeft: "4px solid #6b6f1a",
            }}
          >
            <h2 style={{ marginTop: 0, color: "#4d371c", fontSize: "1.1rem" }}>
              Cómo citar este artículo
            </h2>
            <p style={{ marginBottom: 0, lineHeight: 1.7 }}>{referencia}</p>
          </aside>
        )}
        <style jsx global>{`
          .contenido-html-enriquecido {
            font-family: "Times New Roman", Times, serif;
            font-size: 18px;
            line-height: 1.9;
            text-align: justify;
          }

          .contenido-html-enriquecido p {
            margin: 0 0 1.15rem;
          }

          .contenido-html-enriquecido h1,
          .contenido-html-enriquecido h2,
          .contenido-html-enriquecido h3 {
            font-family: "Times New Roman", Times, serif;
            font-size: 24px;
            line-height: 1.35;
            font-weight: 700;
            text-align: left;
          }

          .datos-ficha-resena > div {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 0.35rem;
          }

          .datos-ficha-resena dt {
            font-weight: 700;
          }

          .datos-ficha-resena dt::after {
            content: ":";
          }

          .datos-ficha-resena dd {
            margin: 0;
          }

          .contenido-html-enriquecido img {
            max-width: 100%;
            height: auto;
          }
        `}</style>
      </main>
      <Footer />
    </>
  );
}