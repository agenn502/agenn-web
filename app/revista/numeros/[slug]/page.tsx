import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Numero = {
  id: number;
  volumen: number | null;
  numero: number;
  anio: number;
	mes_publicacion: number | null;
	titulo: string | null;
	subtitulo: string | null;
  editorial: string | null;
  fecha_publicacion: string | null;
  slug: string;
};

type Autor = {
  id: number;
  codigo: string;
  nombre: string;
  nivel: string;
};

type ArticuloPublico = {
  id: number;
  seccion: string;
  orden: number;
  localizador: string;
  titulo: string;
  tipo: string;
  tema: string | null;
  autor: Autor | null;
};

const obtenerNumero = cache(async (slug: string): Promise<Numero | null> => {
  const { data, error } = await supabaseServer
    .from("revistas")
    .select(`
      id,
      volumen,
      numero,
      anio,
	  mes_publicacion,
      titulo,
      subtitulo,
      editorial,
      fecha_publicacion,
      slug
    `)
    .eq("slug", slug)
    .eq("estado", "PUBLICADO")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Numero | null;
});

async function obtenerArticulos(revistaId: number): Promise<ArticuloPublico[]> {
  const { data: relaciones, error: relacionesError } = await supabaseServer
    .from("revista_articulos")
    .select("id,manuscrito_id,version_id,seccion,orden,localizador")
    .eq("revista_id", revistaId)
    .order("orden", { ascending: true });

  if (relacionesError) throw new Error(relacionesError.message);
  if (!relaciones?.length) return [];

  const manuscritoIds = relaciones.map((item) => Number(item.manuscrito_id));
  const versionIds = relaciones.map((item) => Number(item.version_id));

  const [{ data: manuscritos, error: manuscritosError }, { data: versiones, error: versionesError }] =
    await Promise.all([
      supabaseServer
        .from("manuscritos_editoriales")
        .select("id,autor_miembro_id,titulo_actual,tipo_contenido,tema")
        .in("id", manuscritoIds),
      supabaseServer
        .from("manuscrito_versiones")
        .select("id,titulo")
        .in("id", versionIds),
    ]);

  if (manuscritosError) throw new Error(manuscritosError.message);
  if (versionesError) throw new Error(versionesError.message);

  const autorIds = [
    ...new Set(
      (manuscritos || [])
        .map((manuscrito) => Number(manuscrito.autor_miembro_id))
        .filter(Boolean)
    ),
  ];

  let autores: Autor[] = [];

  if (autorIds.length) {
    const { data, error } = await supabaseServer
      .from("miembros")
      .select("id,codigo,nombre,nivel")
      .in("id", autorIds);

    if (error) throw new Error(error.message);
    autores = (data || []) as Autor[];
  }

  const manuscritoPorId = new Map(
    (manuscritos || []).map((item) => [Number(item.id), item])
  );
  const versionPorId = new Map(
    (versiones || []).map((item) => [Number(item.id), item])
  );
  const autorPorId = new Map(autores.map((item) => [Number(item.id), item]));

  return relaciones.map((relacion) => {
    const manuscrito = manuscritoPorId.get(Number(relacion.manuscrito_id));
    const version = versionPorId.get(Number(relacion.version_id));
    const autor = manuscrito
      ? autorPorId.get(Number(manuscrito.autor_miembro_id)) || null
      : null;

    return {
      id: Number(relacion.id),
      seccion: String(relacion.seccion || "Ensayos"),
      orden: Number(relacion.orden),
      localizador: String(relacion.localizador || ""),
      titulo: String(
        version?.titulo || manuscrito?.titulo_actual || "Trabajo sin título"
      ),
      tipo: String(manuscrito?.tipo_contenido || "Ensayo"),
      tema: manuscrito?.tema ? String(manuscrito.tema) : null,
      autor,
    };
  });
}

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

function fechaPublicacion(valor: string | null) {
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const numero = await obtenerNumero(slug);

  if (!numero) return { title: "Número no encontrado" };

  const titulo =
    numero.titulo ||
    `Volumen ${numero.volumen || "—"}, número ${numero.numero}`;

  return {
    title: titulo,
    description:
      numero.subtitulo ||
      `Revista AGENN, volumen ${numero.volumen || "—"}, número ${numero.numero}, ${numero.anio}.`,
  };
}

export default async function NumeroPublicadoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const numero = await obtenerNumero(slug);

  if (!numero) notFound();

  const articulos = await obtenerArticulos(numero.id);
  const fecha = fechaPublicacion(numero.fecha_publicacion);
  const grupos = new Map<string, ArticuloPublico[]>();

  for (const articulo of articulos) {
    const lista = grupos.get(articulo.seccion) || [];
    lista.push(articulo);
    grupos.set(articulo.seccion, lista);
  }

  return (
    <div className={styles.pagina}>
      <nav className={styles.regreso}>
        <Link href="/revista/numeros">← Todos los números</Link>
      </nav>

      <header className={styles.cabeceraNumero}>
        
        <div className={styles.datosNumero}>
          <p className={styles.identificacion}>REVISTA AGENN</p>

          <h1>
            {numero.titulo ||
              `Volumen ${numero.volumen || "—"}, número ${numero.numero}`}
          </h1>

          {numero.subtitulo && (
            <p className={styles.subtitulo}>{numero.subtitulo}</p>
          )}

          <p className={styles.edicion}>
			  Volumen {numero.volumen || "—"} · Número {numero.numero} ·{" "}
			  {fechaEditorial(numero.mes_publicacion, numero.anio)}
			</p>

          {fecha && <p className={styles.fecha}>Publicado el {fecha}</p>}
        </div>
      </header>

      {numero.editorial && (
        <section className={styles.editorial}>
          <p className={styles.rotulo}>Presentación del número</p>
          <h2>Editorial</h2>
          <div>{numero.editorial}</div>
        </section>
      )}

      <section className={styles.contenido}>
        <p className={styles.rotulo}>Tabla de contenido</p>
        <h2>Contenido de este número</h2>

        {articulos.length === 0 ? (
          <p>Este número no contiene trabajos disponibles.</p>
        ) : (
          [...grupos.entries()].map(([seccion, items]) => (
            <div key={seccion} className={styles.seccion}>
              <h3>{seccion}</h3>

              {items.map((articulo) => (
                <article key={articulo.id} className={styles.articulo}>
                  <div className={styles.localizador}>
                    {articulo.localizador || "—"}
                  </div>

                  <div>
                    <h4>
                      <Link
                        href={`/revista/${numero.anio}/${numero.numero}/${articulo.localizador}`}
                      >
                        {articulo.titulo}
                      </Link>
                    </h4>

                    {articulo.autor && (
                      <p className={styles.autor}>
                        <Link href={`/revista/autores/${articulo.autor.codigo.toLowerCase()}`}>
                          {articulo.autor.nombre}
                        </Link>
                      </p>
                    )}

                    <p className={styles.detalles}>
                      {articulo.tipo}
                      {articulo.tema ? ` · ${articulo.tema}` : ""}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}