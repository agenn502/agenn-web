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
};

const obtenerPublicacion = cache(
  async (
    anioTexto: string,
    numeroTexto: string,
    localizador: string,
  ): Promise<Publicacion | null> => {
    const anio = Number(anioTexto);
    const numeroValor = Number(numeroTexto);

    if (!Number.isInteger(anio) || !Number.isInteger(numeroValor)) return null;

    const { data: numero, error: numeroError } = await supabaseServer
      .from("revistas")
      .select("id,volumen,numero,anio,mes_publicacion,slug")
      .eq("anio", anio)
      .eq("numero", numeroValor)
      .eq("estado", "PUBLICADA")
      .maybeSingle();

    if (numeroError) throw new Error(numeroError.message);
    if (!numero) return null;

    const { data: articulo, error: articuloError } = await supabaseServer
      .from("revista_articulos")
      .select("id,manuscrito_id,version_id,seccion,localizador")
      .eq("revista_id", numero.id)
      .eq("localizador", localizador)
      .maybeSingle();

    if (articuloError) throw new Error(articuloError.message);
    if (!articulo) return null;

    const [manuscritoResultado, versionResultado, imagenesResultado] =
      await Promise.all([
        supabaseServer
          .from("manuscritos_editoriales")
          .select("id,autor_miembro_id,titulo_actual,tipo_contenido,tema")
          .eq("id", articulo.manuscrito_id)
          .maybeSingle(),
        supabaseServer
          .from("manuscrito_versiones")
          .select("id,titulo,contenido,imagen_url,fuente_imagen")
          .eq("id", articulo.version_id)
          .maybeSingle(),
        supabaseServer
          .from("manuscrito_imagenes")
          .select("id,url,titulo,fuente,orden")
          .eq("version_id", articulo.version_id)
          .order("orden", { ascending: true }),
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

    const manuscrito = manuscritoResultado.data;
    const version = versionResultado.data;

    if (!manuscrito || !version) return null;

    let autor: Autor | null = null;

    if (manuscrito.autor_miembro_id) {
      const { data, error } = await supabaseServer
        .from("miembros")
        .select("id,codigo,nombre,nombre_citacion,nivel")
        .eq("id", manuscrito.autor_miembro_id)
        .maybeSingle();

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
      publicacion.autor?.nombre || "autor de Revista AGENN"
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
  const autorNombre =
    publicacion.autor?.nombre_citacion?.trim() ||
    publicacion.autor?.nombre ||
    "Autor no identificado";
  const volumen = publicacion.numero.volumen || "—";
  const referenciaAntes = `${autorNombre}. (${publicacion.numero.anio}). ${titulo}. `;
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

        {publicacion.autor ? (
          <p className={styles.autor}>
            <Link
              href={`/revista/autores/${publicacion.autor.codigo.toLowerCase()}`}
            >
              {publicacion.autor.nombre}
            </Link>
          </p>
        ) : (
          <p className={styles.autor}>{autorNombre}</p>
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

      <aside className={styles.cita}>
        <h2>Cómo citar este artículo (APA 7.ª ed.)</h2>
        <p>
          {referenciaAntes}
          <em>{referenciaRevistaYVolumen}</em>
          {referenciaDespues}
        </p>
      </aside>
    </div>
  );
}