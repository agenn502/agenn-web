import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Autor = {
  id: number;
  codigo: string;
  nombre: string;
  nivel: string;
  foto_url: string | null;
  profesion: string | null;
  bio: string | null;
  publicaciones: string | null;
};

type Trabajo = {
  id: number;
  titulo: string;
  seccion: string;
  localizador: string;
  volumen: number | null;
  numero: number;
  anio: number;
};

type PerfilAutor = {
  autor: Autor;
  trabajos: Trabajo[];
};

const nombreNivel: Record<string, string> = {
  NUM: "Académico Numerario",
  INV: "Académico Investigador",
  NOV: "Académico Novicio",
  ASP: "Aspirante",
};

const obtenerPerfil = cache(
  async (codigo: string): Promise<PerfilAutor | null> => {
    const { data: autor, error: autorError } = await supabaseServer
      .from("miembros")
      .select("id,codigo,nombre,nivel,foto_url,profesion,bio,publicaciones")
      .eq("codigo", codigo.trim().toUpperCase())
      .maybeSingle();

    if (autorError) throw new Error(autorError.message);
    if (!autor) return null;

    const { data: manuscritos, error: manuscritosError } = await supabaseServer
      .from("manuscritos_editoriales")
      .select("id")
      .eq("autor_miembro_id", autor.id)
      .eq("tipo_autoria", "MIEMBRO");

    if (manuscritosError) throw new Error(manuscritosError.message);
    if (!manuscritos?.length) return null;

    const { data: articulos, error: articulosError } = await supabaseServer
      .from("revista_articulos")
      .select("id,revista_id,version_id,seccion,localizador,orden")
      .in(
        "manuscrito_id",
        manuscritos.map((manuscrito) => manuscrito.id),
      );

    if (articulosError) throw new Error(articulosError.message);
    if (!articulos?.length) return null;

    const revistaIds = [
      ...new Set(articulos.map((articulo) => Number(articulo.revista_id))),
    ];
    const versionIds = [
      ...new Set(articulos.map((articulo) => Number(articulo.version_id))),
    ];

    const [
      { data: revistas, error: revistasError },
      { data: versiones, error: versionesError },
    ] = await Promise.all([
      supabaseServer
        .from("revistas")
        .select("id,volumen,numero,anio")
        .in("id", revistaIds)
        .eq("estado", "PUBLICADA"),
      supabaseServer
        .from("manuscrito_versiones")
        .select("id,titulo")
        .in("id", versionIds),
    ]);

    if (revistasError) throw new Error(revistasError.message);
    if (versionesError) throw new Error(versionesError.message);
    if (!revistas?.length) return null;

    const revistaPorId = new Map(
      revistas.map((revista) => [Number(revista.id), revista]),
    );
    const versionPorId = new Map(
      (versiones || []).map((version) => [Number(version.id), version]),
    );

    const trabajos = articulos
      .filter((articulo) => revistaPorId.has(Number(articulo.revista_id)))
      .map((articulo) => {
        const revista = revistaPorId.get(Number(articulo.revista_id))!;
        const version = versionPorId.get(Number(articulo.version_id));

        return {
          id: Number(articulo.id),
          titulo: String(version?.titulo || "Trabajo sin título"),
          seccion: String(articulo.seccion || "Ensayos"),
          localizador: String(articulo.localizador || ""),
          volumen: revista.volumen === null ? null : Number(revista.volumen),
          numero: Number(revista.numero),
          anio: Number(revista.anio),
        };
      })
      .sort((a, b) => b.anio - a.anio || b.numero - a.numero);

    if (!trabajos.length) return null;

    return {
      autor: autor as Autor,
      trabajos,
    };
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>;
}): Promise<Metadata> {
  const { codigo } = await params;
  const perfil = await obtenerPerfil(codigo);

  if (!perfil) return { title: "Autor no encontrado" };

  return {
    title: perfil.autor.nombre,
    description:
      perfil.autor.bio || `${perfil.autor.nombre}, autor de Revista AGENN.`,
  };
}

export default async function AutorDetallePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const perfil = await obtenerPerfil(codigo);

  if (!perfil) notFound();

  const { autor, trabajos } = perfil;
  const otrasPublicaciones = String(autor.publicaciones || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className={styles.pagina}>
      <nav className={styles.regreso}>
        <Link href="/revista/autores">← Todos los autores</Link>
      </nav>

      <section className={styles.perfil}>
        <div className={styles.fotografia}>
          <img
            src={autor.foto_url || "/placeholder-miembro.jpg"}
            alt={autor.nombre}
            className={styles.retrato}
          />
          <img
            src="/marcos/marco-miembro.png"
            alt=""
            aria-hidden="true"
            className={styles.marco}
          />
        </div>

        <div className={styles.datos}>
          <p className={styles.etiqueta}>Autor de Revista AGENN</p>
          <h1>{autor.nombre}</h1>
          <p className={styles.identificacion}>
            {autor.codigo} · {nombreNivel[autor.nivel] || autor.nivel}
          </p>

          {autor.profesion && (
            <p className={styles.profesion}>{autor.profesion}</p>
          )}

          <div className={styles.biografia}>
            <h2>Biografía</h2>
            <p>
              {autor.bio ||
                "La biografía de este autor se encuentra en preparación."}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.trabajos}>
        <p className={styles.etiqueta}>Producción en la revista</p>
        <h2>Trabajos publicados</h2>

        {trabajos.map((trabajo) => (
          <article key={trabajo.id}>
            <div className={styles.localizador}>{trabajo.localizador}</div>
            <div>
              <h3>
                <Link
                  href={`/revista/${trabajo.anio}/${trabajo.numero}/${trabajo.localizador}`}
                >
                  {trabajo.titulo}
                </Link>
              </h3>
              <p>
                Revista AGENN · Vol. {trabajo.volumen || "—"} · Núm.{" "}
                {trabajo.numero} · {trabajo.anio}
              </p>
            </div>
          </article>
        ))}
      </section>

      {otrasPublicaciones.length > 0 && (
        <section className={styles.otrasPublicaciones}>
          <h2>Otras publicaciones</h2>
          <ul>
            {otrasPublicaciones.map((publicacion, indice) => (
              <li key={indice}>{publicacion}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}