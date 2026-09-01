import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Autores",
  description: "Autores que han publicado trabajos en Revista AGENN.",
};

type Autor = {
  id: number;
  codigo: string;
  nombre: string;
  nivel: string;
  foto_url: string | null;
  profesion: string | null;
  bio: string | null;
};

const nombreNivel: Record<string, string> = {
  NUM: "Académico Numerario",
  INV: "Académico Investigador",
  NOV: "Académico Novicio",
  ASP: "Aspirante",
};

async function obtenerAutoresPublicados(): Promise<Autor[]> {
  const { data: numeros, error: numerosError } = await supabaseServer
    .from("revistas")
    .select("id")
    .eq("estado", "PUBLICADA");

  if (numerosError) throw new Error(numerosError.message);
  if (!numeros?.length) return [];

  const { data: articulos, error: articulosError } = await supabaseServer
    .from("revista_articulos")
    .select("manuscrito_id")
    .in("revista_id", numeros.map((numero) => numero.id));

  if (articulosError) throw new Error(articulosError.message);
  if (!articulos?.length) return [];

  const manuscritoIds = [
    ...new Set(articulos.map((articulo) => Number(articulo.manuscrito_id))),
  ];

  const { data: manuscritos, error: manuscritosError } = await supabaseServer
    .from("manuscritos_editoriales")
    .select("autor_miembro_id")
    .in("id", manuscritoIds);

  if (manuscritosError) throw new Error(manuscritosError.message);

  const autorIds = [
    ...new Set(
      (manuscritos || [])
        .map((manuscrito) => Number(manuscrito.autor_miembro_id))
        .filter(Boolean)
    ),
  ];

  if (!autorIds.length) return [];

  const { data: autores, error: autoresError } = await supabaseServer
    .from("miembros")
    .select("id,codigo,nombre,nivel,foto_url,profesion,bio")
    .in("id", autorIds)
    .order("nombre", { ascending: true });

  if (autoresError) throw new Error(autoresError.message);
  return (autores || []) as Autor[];
}

export default async function AutoresPage() {
  let autores: Autor[] = [];
  let error = false;

  try {
    autores = await obtenerAutoresPublicados();
  } catch (err) {
    console.error("Error al cargar autores públicos:", err);
    error = true;
  }

  return (
    <div className={styles.pagina}>
      <section className={styles.encabezado}>
        <p className={styles.etiqueta}>Comunidad académica</p>
        <h1>Autores</h1>

        <div className={styles.linea} aria-hidden="true">
          <span />
          <i />
          <span />
        </div>

        <p>
          Conozca a los miembros de AGENN que comparten sus investigaciones,
          análisis y aportes por medio de nuestra revista.
        </p>
      </section>

      {error ? (
        <div className={styles.mensaje}>
          No fue posible consultar los autores en este momento.
        </div>
      ) : autores.length === 0 ? (
        <div className={styles.mensaje}>
          Los autores aparecerán aquí cuando se publique el primer número.
        </div>
      ) : (
        <section className={styles.cuadricula}>
          {autores.map((autor) => (
            <Link
              key={autor.id}
              href={`/revista/autores/${autor.codigo.toLowerCase()}`}
              className={styles.tarjeta}
            >
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

              <div className={styles.informacion}>
                <h2>{autor.nombre}</h2>
                <p className={styles.codigo}>{autor.codigo}</p>
                <p className={styles.nivel}>
                  {nombreNivel[autor.nivel] || autor.nivel}
                </p>
                {autor.profesion && (
                  <p className={styles.profesion}>{autor.profesion}</p>
                )}
                <span className={styles.verPerfil}>Consultar biografía →</span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}