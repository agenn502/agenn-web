import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { cache, ReactNode } from "react";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import CompartirArticulo from "@/components/revista/CompartirArticulo";
import GenerarPdfArticulo from "@/app/components/revista/GenerarPdfArticulo";
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

    const segmentos = parte.split(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi).filter(Boolean);

    return (
      <span key={indice}>
        {segmentos.map((segmento, subindice) => {
          if (!/^(https?:\/\/|www\.)/i.test(segmento)) {
            return <span key={subindice}>{segmento}</span>;
          }

          const coincidencia = segmento.match(/^(.*?)([.,;:!?)]*)$/);
          const url = coincidencia?.[1] || segmento;
          const puntuacion = coincidencia?.[2] || "";
          const href = url.toLowerCase().startsWith("www.") ? `https://${url}` : url;

          return (
            <span key={subindice}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                {url}
              </a>
              {puntuacion}
            </span>
          );
        })}
      </span>
    );
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

  const htmlConEnlaces = htmlConImagenes.replace(
    /(^|>)([^<]+)(?=<|$)/g,
    (fragmentoCompleto, prefijo: string, texto: string, offset: number, cadenaCompleta: string) => {
      const antes = cadenaCompleta.slice(0, offset + prefijo.length);
      const aperturaEnlace = antes.lastIndexOf("<a");
      const cierreEnlace = antes.lastIndexOf("</a>");

      if (aperturaEnlace > cierreEnlace) return fragmentoCompleto;

      const convertido = texto.replace(
        /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi,
        (urlCompleta: string) => {
          const coincidencia = urlCompleta.match(/^(.*?)([.,;:!?)]*)$/);
          const url = coincidencia?.[1] || urlCompleta;
          const puntuacion = coincidencia?.[2] || "";
          const href = url.toLowerCase().startsWith("www.") ? `https://${url}` : url;
          return `<a href="${escaparHtml(href)}" target="_blank" rel="noopener noreferrer">${url}</a>${puntuacion}`;
        },
      );

      return `${prefijo}${convertido}`;
    },
  );

  return eliminarBloquesVaciosTrasFiguras(htmlConEnlaces);
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
  const descripcionTipo =
    publicacion.manuscrito.tipo_contenido === "NOTA_BREVE"
      ? "[Nota breve]. "
      : publicacion.manuscrito.tipo_contenido === "NOTA_INVESTIGACION"
        ? "[Nota de investigación]. "
      : descripcionResena;
  const referenciaAntes = `${autorNombre}. (${publicacion.numero.anio}). ${sinPuntoFinal(titulo)}. ${descripcionTipo}`;
  const referenciaRevistaYVolumen = `Revista AGENN, ${volumen}`;
  const referenciaDespues = `(${publicacion.numero.numero}), ${publicacion.articulo.localizador}.`;
  const contenidoTieneImagenIntegrada =
    /data-agenn-imagen-id=["']\d+["']|\[\[IMAGEN:\d+\]\]/.test(
      publicacion.version.contenido,
    );

  return (
    <div className={styles.pagina}>
      <nav className={`${styles.regreso} ${styles.soloPantalla}`}>
        <Link href={`/revista/numeros/${publicacion.numero.slug}`}>
          ← Volver al número
        </Link>
      </nav>

      <div className={styles.soloImpresion} aria-hidden="true">
        <div className={styles.mastheadPdf}>
          <img
            src="/logo-agenn.png"
            alt="Academia Guatemalteca de Estudios Numismáticos y Notafílicos"
            className={styles.logoPdf}
          />
          <div className={styles.identidadPdf}>
            <p className={styles.publicacionPdf}>PUBLICACIÓN ACADÉMICA</p>
            <p className={styles.nombreRevistaPdf}>REVISTA <strong>AGENN</strong></p>
            <div className={styles.lineaPdf}><span /></div>
            <p className={styles.lemaPdf}>CONOCIMIENTO QUE TRASCIENDE, IMPACTO QUE TRANSFORMA</p>
          </div>
        </div>
      </div>

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
          {publicacion.articulo.seccion}
          {publicacion.manuscrito.tema
            ? ` · ${publicacion.manuscrito.tema}`
            : ""}
        </p>

        <div className={styles.soloPantalla}>
          <CompartirArticulo titulo={titulo} />
          <GenerarPdfArticulo />
        </div>
      </header>

      {publicacion.manuscrito.tipo_contenido === "RESENA" &&
        publicacion.resena && (
          <section
            className={`${styles.fichaResena} ${
              publicacion.resena.portada_url
                ? ""
                : styles.fichaResenaSinPortada
            }`}
          >
            {publicacion.resena.portada_url && (
              <figure className={styles.figuraPortada}>
                <img
                  src={publicacion.resena.portada_url}
                  alt={
                    publicacion.resena.portada_alt ||
                    `Portada de ${publicacion.resena.titulo_obra}`
                  }
                  className={styles.imagenPortada}
                />
                {publicacion.resena.fuente_portada && (
                  <figcaption className={styles.piePortada}>
                    Fuente: {publicacion.resena.fuente_portada}
                  </figcaption>
                )}
              </figure>
            )}
            <div className={styles.contenidoFichaResena}>
              <p className={styles.etiquetaFicha}>Obra reseñada</p>
              <h2 className={styles.tituloObra}>
                {publicacion.resena.titulo_obra}
              </h2>
              <dl className={styles.datosFicha}>
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
          <p>Este trabajo no contiene texto disponible.</p>
        )}
      </article>

      <aside
        style={{
          marginTop: "2rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid rgba(0,0,0,0.16)",
          fontSize: "0.92rem",
          lineHeight: 1.65,
          textAlign: "justify",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
        aria-label="Derechos de autor y licencia"
      >
        <p style={{ margin: "0 0 0.45rem" }}>
          <strong>© {publicacion.numero.anio} {autorVisible}.</strong> El autor
          conserva los derechos de autor de este trabajo.
        </p>
        <p style={{ margin: "0 0 0.45rem" }}>
          Salvo indicación en contrario, el texto original de este trabajo se
          distribuye bajo la licencia{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/deed.es"
            target="_blank"
            rel="noopener noreferrer license"
          >
            Creative Commons Atribución 4.0 Internacional (CC BY 4.0)
          </a>.
        </p>
        <p style={{ margin: "0 0 0.45rem" }}>
          Esta licencia permite compartir y adaptar el contenido, incluso con
          fines comerciales, siempre que se reconozca adecuadamente la autoría,
          se cite la publicación original, se incluya un enlace a la licencia y
          se indique si se realizaron cambios.
        </p>
        <p style={{ margin: 0 }}>
          Las imágenes, reproducciones de piezas, documentos y demás materiales
          de terceros conservan los derechos o condiciones de uso indicados en
          sus respectivas fuentes y no quedan comprendidos automáticamente en
          esta licencia.{" "}
          <Link href="/revista/normas">
            Política de acceso abierto y derechos de autor
          </Link>.
        </p>
      </aside>

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
    </div>
  );
}