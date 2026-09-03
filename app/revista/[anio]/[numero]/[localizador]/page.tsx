import type { Metadata } from "next";
import Link from "next/link";
import { cache, ReactNode } from "react";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import CompartirArticulo from "@/components/revista/CompartirArticulo";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Imagen = {
  id: number;
  url: string;
  titulo: string | null;
  fuente: string | null;
  orden: number;
};

type Autor = {
  id: number;
  codigo: string;
  nombre: string;
  nombre_citacion: string | null;
  nivel: string;
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

type Publicacion = {
  numero: {
    id: number;
    volumen: number | null;
    numero: number;
    anio: number;
    mes_publicacion: number | null;
    slug: string;
  };
  articulo: {
    id: number;
    seccion: string;
    localizador: string;
  };
  manuscrito: {
    id: number;
    titulo_actual: string;
    tipo_contenido: string;
    tipo_autoria: string;
    autor_corporativo: string | null;
    mostrar_referencia: boolean;
    tema: string | null;
  };
  version: {
    id: number;
    titulo: string;
    contenido: string;
    imagen_url: string | null;
    fuente_imagen: string | null;
  };
  autor: Autor | null;
  imagenes: Imagen[];
  resena: Resena | null;
};

function sinPuntoFinal(valor: string) {
  return valor.trim().replace(/\.+$/, "");
}

const ERROR_TRANSITORIO =
  /fetch failed|network|timeout|timed out|econnreset|und_err/i;

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function consultarConReintentos<T extends { error: unknown }>(
  consulta: () => PromiseLike<T>,
): Promise<T> {
  let ultimoResultado: T | null = null;

  for (let intento = 0; intento < 3; intento += 1) {
    const resultado = await consulta();
    ultimoResultado = resultado;

    const mensaje =
      resultado.error &&
      typeof resultado.error === "object" &&
      "message" in resultado.error
        ? String(resultado.error.message)
        : "";

    if (!resultado.error || !ERROR_TRANSITORIO.test(mensaje)) {
      return resultado;
    }

    if (intento < 2) await esperar(400 * 2 ** intento);
  }

  return ultimoResultado as T;
}

const obtenerPublicacion = cache(
  async (
    anioTexto: string,
    numeroTexto: string,
    localizador: string,
  ): Promise<Publicacion | null> => {
    const anio = Number(anioTexto);
    const numeroValor = Number(numeroTexto);

    if (!Number.isInteger(anio) || !Number.isInteger(numeroValor)) return null;

    const { data: numero, error: numeroError } = await consultarConReintentos(
      () =>
        supabaseServer
          .from("revistas")
          .select("id,volumen,numero,anio,mes_publicacion,slug")
          .eq("anio", anio)
          .eq("numero", numeroValor)
          .eq("estado", "PUBLICADA")
          .maybeSingle(),
    );

    if (numeroError) throw new Error(numeroError.message);
    if (!numero) return null;

    const { data: articulo, error: articuloError } =
      await consultarConReintentos(() =>
        supabaseServer
          .from("revista_articulos")
          .select("id,manuscrito_id,version_id,seccion,localizador")
          .eq("revista_id", numero.id)
          .eq("localizador", localizador)
          .maybeSingle(),
      );

    if (articuloError) throw new Error(articuloError.message);
    if (!articulo) return null;

    const [
      manuscritoResultado,
      versionResultado,
      imagenesResultado,
      resenaResultado,
    ] = await Promise.all([
      consultarConReintentos(() =>
        supabaseServer
          .from("manuscritos_editoriales")
          .select(
            "id,autor_miembro_id,titulo_actual,tipo_contenido,tipo_autoria,autor_corporativo,mostrar_referencia,tema",
          )
          .eq("id", articulo.manuscrito_id)
          .maybeSingle(),
      ),
      consultarConReintentos(() =>
        supabaseServer
          .from("manuscrito_versiones")
          .select("id,titulo,contenido,imagen_url,fuente_imagen")
          .eq("id", articulo.version_id)
          .maybeSingle(),
      ),
      consultarConReintentos(() =>
        supabaseServer
          .from("manuscrito_imagenes")
          .select("id,url,titulo,fuente,orden")
          .eq("version_id", articulo.version_id)
          .order("orden", { ascending: true }),
      ),
      consultarConReintentos(() =>
        supabaseServer
          .from("resena_versiones")
          .select(
            "titulo_obra,autores_obra,editorial,edicion,anio_publicacion,isbn,numero_paginas,portada_url,portada_alt,fuente_portada",
          )
          .eq("version_id", articulo.version_id)
          .maybeSingle(),
      ),
    ]);

    if (manuscritoResultado.error) {
      throw new Error(manuscritoResultado.error.message);
    }
    if (versionResultado.error) {
      throw new Error(versionResultado.error.message);
    }
    if (imagenesResultado.error) {
      throw new Error(imagenesResultado.error.message);
    }
    if (resenaResultado.error) throw new Error(resenaResultado.error.message);

    const manuscrito = manuscritoResultado.data;
    const version = versionResultado.data;

    if (!manuscrito || !version) return null;

    let autor: Autor | null = null;

    if (manuscrito.autor_miembro_id) {
      const { data, error } = await consultarConReintentos(() =>
        supabaseServer
          .from("miembros")
          .select("id,codigo,nombre,nombre_citacion,nivel")
          .eq("id", manuscrito.autor_miembro_id)
          .maybeSingle(),
      );

      if (error) throw new Error(error.message);
      autor = data as Autor | null;
    }

    return {
      numero,
      articulo: {
        id: Number(articulo.id),
        seccion: String(articulo.seccion || "Ensayos"),
        localizador: String(articulo.localizador || ""),
      },
      manuscrito: {
        id: Number(manuscrito.id),
        titulo_actual: String(manuscrito.titulo_actual || "Trabajo sin título"),
        tipo_contenido: String(manuscrito.tipo_contenido || "Ensayo"),
        tipo_autoria: String(manuscrito.tipo_autoria || "MIEMBRO"),
        autor_corporativo: manuscrito.autor_corporativo
          ? String(manuscrito.autor_corporativo)
          : null,
        mostrar_referencia: manuscrito.mostrar_referencia !== false,
        tema: manuscrito.tema ? String(manuscrito.tema) : null,
      },
      version: {
        id: Number(version.id),
        titulo: String(
          version.titulo || manuscrito.titulo_actual || "Trabajo sin título",
        ),
        contenido: String(version.contenido || ""),
        imagen_url: version.imagen_url ? String(version.imagen_url) : null,
        fuente_imagen: version.fuente_imagen
          ? String(version.fuente_imagen)
          : null,
      },
      autor,
      imagenes: (imagenesResultado.data || []) as Imagen[],
      resena: (resenaResultado.data as Resena | null) || null,
    };
  },
);

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function fechaEditorial(mes: number | null, anio: number) {
  if (!mes || mes < 1 || mes > 12) {
    return String(anio);
  }

  return `${MESES[mes - 1]} de ${anio}`;
}

function renderInline(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(Boolean);

  return partes.map((parte, indice) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={indice}>{parte.slice(2, -2)}</strong>;
    }

    if (parte.startsWith("*") && parte.endsWith("*")) {
      return <em key={indice}>{parte.slice(1, -1)}</em>;
    }

    return <span key={indice}>{parte}</span>;
  });
}

function renderTexto(texto: string): ReactNode[] {
  return texto
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((linea, indice) => {
      const limpia = linea.trim();

      if (!limpia) {
        return <div key={`espacio-${indice}`} className={styles.espacio} />;
      }

      if (limpia.startsWith("### ")) {
        return <h3 key={indice}>{renderInline(limpia.slice(4))}</h3>;
      }

      if (limpia.startsWith("## ")) {
        return <h2 key={indice}>{renderInline(limpia.slice(3))}</h2>;
      }

      if (limpia.startsWith("# ")) {
        return <h2 key={indice}>{renderInline(limpia.slice(2))}</h2>;
      }

      return <p key={indice}>{renderInline(limpia)}</p>;
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
    ? `<strong>${escaparHtml(imagen.titulo)}</strong>`
    : "";
  const fuente = imagen.fuente
    ? `<span>Fuente: ${escaparHtml(imagen.fuente)}</span>`
    : "";

  return `<figure class="${styles.figura}"><img src="${escaparHtml(imagen.url)}" alt="${escaparHtml(imagen.titulo || "Imagen del ensayo")}" />${titulo || fuente ? `<figcaption>${titulo}${fuente}</figcaption>` : ""}</figure>`;
}

function eliminarBloquesVaciosTrasFiguras(html: string) {
  const bloqueVacioTrasFigura =
    /(<\/figure>)\s*<(p|h[1-6]|div)\b[^>]*>(?:\s|&nbsp;|<br\b[^>]*>|<\/?(?:span|strong|em|b|i)\b[^>]*>)*<\/\2>/gi;
  let anterior = "";
  let limpio = html;

  while (limpio !== anterior) {
    anterior = limpio;
    limpio = limpio.replace(bloqueVacioTrasFigura, "$1");
  }

  return limpio;
}

function htmlEnriquecidoConImagenes(contenido: string, imagenes: Imagen[]) {
  const imagenPorId = new Map(
    imagenes.map((imagen) => [Number(imagen.id), imagen]),
  );
  const html = contenido.trimStart().slice(PREFIJO_HTML_ENRIQUECIDO.length);

  const htmlConImagenes = html.replace(
    /<p\b[^>]*data-agenn-imagen-id=["'](\d+)["'][^>]*>[\s\S]*?<\/p>/gi,
    (_marcador, idTexto: string) => {
      const imagen = imagenPorId.get(Number(idTexto));
      return imagen
        ? figuraHtml(imagen)
        : `<div class="${styles.imagenNoDisponible}">Imagen editorial no disponible.</div>`;
    },
  );

  return eliminarBloquesVaciosTrasFiguras(htmlConImagenes);
}

function contenidoConImagenes(contenido: string, imagenes: Imagen[]) {
  if (contenido.trimStart().startsWith(PREFIJO_HTML_ENRIQUECIDO)) {
    return (
      <div
        className={styles.htmlEnriquecido}
        dangerouslySetInnerHTML={{
          __html: htmlEnriquecidoConImagenes(contenido, imagenes),
        }}
      />
    );
  }

  const imagenPorId = new Map(
    imagenes.map((imagen) => [Number(imagen.id), imagen]),
  );
  const partes = contenido.split(/(\[\[IMAGEN:\d+\]\]|\[\[ESPACIO\]\])/g);

  return partes.map((parte, indice) => {
    const coincidencia = parte.match(/^\[\[IMAGEN:(\d+)\]\]$/);

    if (coincidencia) {
      const imagen = imagenPorId.get(Number(coincidencia[1]));

      if (!imagen) {
        return (
          <div key={indice} className={styles.imagenNoDisponible}>
            Imagen editorial no disponible.
          </div>
        );
      }

      return (
        <figure key={indice} className={styles.figura}>
          <img src={imagen.url} alt={imagen.titulo || "Imagen del ensayo"} />

          {(imagen.titulo || imagen.fuente) && (
            <figcaption>
              {imagen.titulo && <strong>{imagen.titulo}</strong>}
              {imagen.fuente && <span>Fuente: {imagen.fuente}</span>}
            </figcaption>
          )}
        </figure>
      );
    }

    if (parte === "[[ESPACIO]]") {
      return <div key={indice} className={styles.espacioAmplio} />;
    }

    return <div key={indice}>{renderTexto(parte)}</div>;
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ anio: string; numero: string; localizador: string }>;
}): Promise<Metadata> {
  const { anio, numero, localizador } = await params;
  const publicacion = await obtenerPublicacion(anio, numero, localizador);

  if (!publicacion) return { title: "Ensayo no encontrado" };

  return {
    title: publicacion.version.titulo,
    description: `${publicacion.version.titulo}, por ${
      publicacion.manuscrito.tipo_autoria === "CONSEJO_EDITORIAL"
        ? publicacion.manuscrito.autor_corporativo || "Consejo Editorial"
        : publicacion.autor?.nombre || "autor de Revista AGENN"
    }.`,
  };
}

export default async function ArticuloPublicoPage({
  params,
}: {
  params: Promise<{ anio: string; numero: string; localizador: string }>;
}) {
  const { anio, numero, localizador } = await params;
  const publicacion = await obtenerPublicacion(anio, numero, localizador);

  if (!publicacion) notFound();

  const titulo = publicacion.version.titulo;
  const autoriaCorporativa =
    publicacion.manuscrito.tipo_autoria === "CONSEJO_EDITORIAL";
  const autorVisible = autoriaCorporativa
    ? publicacion.manuscrito.autor_corporativo || "Consejo Editorial"
    : publicacion.autor?.nombre || "Autor no identificado";
  const autorNombre = autoriaCorporativa
    ? autorVisible
    : publicacion.autor?.nombre_citacion?.trim() || autorVisible;
  const volumen = publicacion.numero.volumen || "—";
  const descripcionResena =
    publicacion.manuscrito.tipo_contenido === "RESENA" && publicacion.resena
      ? `[Reseña del libro ${sinPuntoFinal(publicacion.resena.titulo_obra)}, por ${publicacion.resena.autores_obra}]. `
      : "";
  const referenciaAntes = `${autorNombre}. (${publicacion.numero.anio}). ${sinPuntoFinal(titulo)}. ${descripcionResena}`;
  const referenciaRevistaYVolumen = `Revista AGENN, ${volumen}`;
  const referenciaDespues = `(${publicacion.numero.numero}), ${publicacion.articulo.localizador}.`;
  const contenidoTieneImagenIntegrada =
    /data-agenn-imagen-id=["']\d+["']|\[\[IMAGEN:\d+\]\]/.test(
      publicacion.version.contenido,
    );

  return (
    <div className={styles.pagina}>
      <nav className={styles.regreso}>
        <Link href={`/revista/numeros/${publicacion.numero.slug}`}>
          ← Volver al número
        </Link>
      </nav>

      <header className={styles.encabezado}>
        <p className={styles.referenciaNumero}>
          Revista AGENN · Vol. {volumen} · Núm. {publicacion.numero.numero} ·{" "}
          {fechaEditorial(
            publicacion.numero.mes_publicacion,
            publicacion.numero.anio,
          )}{" "}
          · {publicacion.articulo.localizador}
        </p>

        <h1>{titulo}</h1>

        {!autoriaCorporativa && publicacion.autor ? (
          <p className={styles.autor}>
            <Link
              href={`/revista/autores/${publicacion.autor.codigo.toLowerCase()}`}
            >
              {publicacion.autor.nombre}
            </Link>
          </p>
        ) : (
          <p className={styles.autor}>{autorVisible}</p>
        )}

        <p className={styles.clasificacion}>
          {publicacion.articulo.seccion} ·{" "}
          {publicacion.manuscrito.tipo_contenido}
          {publicacion.manuscrito.tema
            ? ` · ${publicacion.manuscrito.tema}`
            : ""}
        </p>

        <CompartirArticulo titulo={titulo} />
      </header>

      {publicacion.manuscrito.tipo_contenido === "RESENA" &&
        publicacion.resena && (
          <section style={fichaResena}>
            {publicacion.resena.portada_url && (
              <figure style={figuraPortada}>
                <img
                  src={publicacion.resena.portada_url}
                  alt={
                    publicacion.resena.portada_alt ||
                    `Portada de ${publicacion.resena.titulo_obra}`
                  }
                  style={imagenPortada}
                />
                {publicacion.resena.fuente_portada && (
                  <figcaption style={piePortada}>
                    Fuente: {publicacion.resena.fuente_portada}
                  </figcaption>
                )}
              </figure>
            )}
            <div>
              <p style={etiquetaFicha}>Obra reseñada</p>
              <h2 style={tituloObra}>{publicacion.resena.titulo_obra}</h2>
              <dl className="datos-ficha-resena" style={datosFicha}>
                <div>
                  <dt>Autoría</dt>
                  <dd>{publicacion.resena.autores_obra}</dd>
                </div>
                {publicacion.resena.editorial && (
                  <div>
                    <dt>Editorial</dt>
                    <dd>{publicacion.resena.editorial}</dd>
                  </div>
                )}
                {publicacion.resena.edicion && (
                  <div>
                    <dt>Edición</dt>
                    <dd>{publicacion.resena.edicion}</dd>
                  </div>
                )}
                {publicacion.resena.anio_publicacion && (
                  <div>
                    <dt>Año</dt>
                    <dd>{publicacion.resena.anio_publicacion}</dd>
                  </div>
                )}
                {publicacion.resena.isbn && (
                  <div>
                    <dt>ISBN</dt>
                    <dd>{publicacion.resena.isbn}</dd>
                  </div>
                )}
                {publicacion.resena.numero_paginas && (
                  <div>
                    <dt>Páginas</dt>
                    <dd>{publicacion.resena.numero_paginas}</dd>
                  </div>
                )}
              </dl>
            </div>
          </section>
        )}

      {publicacion.version.imagen_url && !contenidoTieneImagenIntegrada && (
        <figure className={styles.imagenPrincipal}>
          <img src={publicacion.version.imagen_url} alt={titulo} />
          {publicacion.version.fuente_imagen && (
            <figcaption>Fuente: {publicacion.version.fuente_imagen}</figcaption>
          )}
        </figure>
      )}

      <article className={styles.contenido}>
        {publicacion.version.contenido ? (
          contenidoConImagenes(
            publicacion.version.contenido,
            publicacion.imagenes,
          )
        ) : (
          <p>Este ensayo no contiene texto disponible.</p>
        )}
      </article>

      {publicacion.manuscrito.mostrar_referencia && (
        <aside className={styles.cita}>
          <h2>Cómo citar este artículo (APA 7.ª ed.)</h2>
          <p>
            {referenciaAntes}
            <em>{referenciaRevistaYVolumen}</em>
            {referenciaDespues}
          </p>
        </aside>
      )}
      <style>{`
        .datos-ficha-resena > div {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 0.35rem;
        }
        .datos-ficha-resena dt { font-weight: 700; }
        .datos-ficha-resena dt::after { content: ":"; }
        .datos-ficha-resena dd { margin: 0; }
      `}</style>
    </div>
  );
}

const fichaResena: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(170px, 260px) minmax(0, 1fr)",
  gap: "2rem",
  alignItems: "start",
  margin: "2.5rem 0 0",
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