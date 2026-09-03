import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Números publicados",
  description:
    "Números publicados de Revista AGENN, publicación académica de la Academia Guatemalteca de Estudios Numismáticos y Notafílicos.",
};

type NumeroPublicado = {
  id: number;
  volumen: number | null;
  numero: number;
  anio: number;
  mes_publicacion: number | null;
  titulo: string | null;
  subtitulo: string | null;
  fecha_publicacion: string | null;
  slug: string;
};

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
  if (!mes || mes < 1 || mes > 12) return String(anio);
  return `${MESES[mes - 1]} de ${anio}`;
}

function formatearFecha(valor: string | null) {
  if (!valor) return null;

  try {
    return new Intl.DateTimeFormat("es-GT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(valor));
  } catch {
    return null;
  }
}

export default async function NumerosPublicadosPage() {
  const { data, error } = await supabaseServer
    .from("revistas")
    .select(
      `
      id,
      volumen,
      numero,
      anio,
      mes_publicacion,
      titulo,
      subtitulo,
      fecha_publicacion,
      slug
    `,
    )
    .eq("estado", "PUBLICADA")
    .order("anio", { ascending: false })
    .order("numero", { ascending: false });

  if (error) {
    console.error("Error al cargar números públicos:", error);

    return (
      <div className={styles.pagina}>
        <section className={styles.encabezado}>
          <p className={styles.etiqueta}>Archivo editorial</p>
          <h1>Números publicados</h1>
          <p>
            No fue posible consultar los números de la revista en este momento.
          </p>
        </section>
      </div>
    );
  }

  // Los números con título provisional permanecen accesibles mediante su
  // enlace directo para las pruebas del CA, pero no se anuncian públicamente.
  const numeros = ((data || []) as NumeroPublicado[]).filter(
    (revista) => revista.titulo?.trim().toLocaleLowerCase("es") !== "prueba",
  );

  return (
    <div className={styles.pagina}>
      <section className={styles.encabezado}>
        <p className={styles.etiqueta}>Archivo editorial</p>
        <h1>Números publicados</h1>

        <div className={styles.linea} aria-hidden="true">
          <span />
          <i />
          <span />
        </div>

        <p>
          Consulte las ediciones de Revista AGENN y acceda a los ensayos,
          investigaciones y estudios incluidos en cada número.
        </p>
      </section>

      {numeros.length === 0 ? (
        <section className={styles.vacio}>
          <span>Revista AGENN</span>
          <h2>Primer número en preparación</h2>
          <p>
            Nuestro primer número se encuentra actualmente en proceso editorial.
            Muy pronto estará disponible para consulta.
          </p>
        </section>
      ) : (
        <section className={styles.cuadricula}>
          {numeros.map((revista) => {
            const fechaReal = formatearFecha(revista.fecha_publicacion);

            return (
              <article key={revista.id} className={styles.tarjeta}>
                <Link
                  href={`/revista/numeros/${revista.slug}`}
                  className={styles.edicionVisual}
                  aria-label={`Abrir volumen ${revista.volumen}, número ${revista.numero}`}
                >
                  <span className={styles.marca}>REVISTA</span>
                  <strong>AGENN</strong>
                  <i aria-hidden="true" />
                  <small>VOLUMEN {revista.volumen || "—"}</small>
                  <b>NÚMERO {revista.numero}</b>
                  <time>
                    {fechaEditorial(revista.mes_publicacion, revista.anio)}
                  </time>
                </Link>

                <div className={styles.informacion}>
                  <p className={styles.datos}>
                    Volumen {revista.volumen || "—"} · Número {revista.numero}
                  </p>

                  <h2>
                    <Link href={`/revista/numeros/${revista.slug}`}>
                      {revista.titulo ||
                        `Revista AGENN, número ${revista.numero}`}
                    </Link>
                  </h2>

                  <p className={styles.fechaEditorial}>
                    {fechaEditorial(revista.mes_publicacion, revista.anio)}
                  </p>

                  {revista.subtitulo && (
                    <p className={styles.subtitulo}>{revista.subtitulo}</p>
                  )}

                  {fechaReal && (
                    <p className={styles.fechaReal}>Publicado el {fechaReal}</p>
                  )}

                  <Link
                    href={`/revista/numeros/${revista.slug}`}
                    className={styles.consultar}
                  >
                    Consultar este número →
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}