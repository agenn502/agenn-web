import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buscar",
  description: "Buscar trabajos publicados en Revista AGENN.",
};

type Resultado = {
  id: number;
  titulo: string;
  autorNombre: string;
  autorCodigo: string | null;
  tipo: string;
  tema: string | null;
  extracto: string;
  volumen: number | null;
  numero: number;
  anio: number;
  localizador: string;
};

function normalizar(texto: unknown) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function limpiarContenido(texto: string) {
  return texto
    .replace(/\[\[IMAGEN:\d+\]\]/g, " ")
    .replace(/\[\[ESPACIO\]\]/g, " ")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function crearExtracto(contenido: string, consulta: string) {
  const limpio = limpiarContenido(contenido);
  if (!limpio) return "";

  const textoNormalizado = normalizar(limpio);
  const consultaNormalizada = normalizar(consulta);
  const posicion = textoNormalizado.indexOf(consultaNormalizada);
  const inicio = posicion > 90 ? posicion - 90 : 0;
  const final = Math.min(limpio.length, inicio + 260);
  const fragmento = limpio.slice(inicio, final).trim();

  return `${inicio > 0 ? "…" : ""}${fragmento}${
    final < limpio.length ? "…" : ""
  }`;
}

async function buscarPublicaciones(consulta: string): Promise<Resultado[]> {
  const { data: numeros, error: numerosError } = await supabaseServer
    .from("revistas")
    .select("id,volumen,numero,anio")
    .eq("estado", "PUBLICADA");

  if (numerosError) throw new Error(numerosError.message);
  if (!numeros?.length) return [];

  const { data: articulos, error: articulosError } = await supabaseServer
    .from("revista_articulos")
    .select("id,revista_id,manuscrito_id,version_id,localizador")
    .in("revista_id", numeros.map((numero) => numero.id));

  if (articulosError) throw new Error(articulosError.message);
  if (!articulos?.length) return [];

  const manuscritoIds = [
    ...new Set(articulos.map((articulo) => Number(articulo.manuscrito_id))),
  ];
  const versionIds = [
    ...new Set(articulos.map((articulo) => Number(articulo.version_id))),
  ];

  const [{ data: manuscritos, error: manuscritosError }, { data: versiones, error: versionesError }] =
    await Promise.all([
      supabaseServer
        .from("manuscritos_editoriales")
        .select("id,autor_miembro_id,titulo_actual,tipo_contenido,tema")
        .in("id", manuscritoIds),
      supabaseServer
        .from("manuscrito_versiones")
        .select("id,titulo,contenido")
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

  let autores: Array<{ id: number; codigo: string; nombre: string }> = [];

  if (autorIds.length) {
    const { data, error } = await supabaseServer
      .from("miembros")
      .select("id,codigo,nombre")
      .in("id", autorIds);

    if (error) throw new Error(error.message);
    autores = data || [];
  }

  const numeroPorId = new Map(numeros.map((numero) => [Number(numero.id), numero]));
  const manuscritoPorId = new Map(
    (manuscritos || []).map((manuscrito) => [Number(manuscrito.id), manuscrito])
  );
  const versionPorId = new Map(
    (versiones || []).map((version) => [Number(version.id), version])
  );
  const autorPorId = new Map(autores.map((autor) => [Number(autor.id), autor]));
  const consultaNormalizada = normalizar(consulta);

  return articulos
    .map((articulo): Resultado | null => {
      const numero = numeroPorId.get(Number(articulo.revista_id));
      const manuscrito = manuscritoPorId.get(Number(articulo.manuscrito_id));
      const version = versionPorId.get(Number(articulo.version_id));

      if (!numero || !manuscrito || !version) return null;

      const autor = autorPorId.get(Number(manuscrito.autor_miembro_id));
      const titulo = String(version.titulo || manuscrito.titulo_actual || "Trabajo sin título");
      const contenido = String(version.contenido || "");
      const autorNombre = String(autor?.nombre || "Autor no identificado");
      const tipo = String(manuscrito.tipo_contenido || "Ensayo");
      const tema = manuscrito.tema ? String(manuscrito.tema) : null;
      const universo = normalizar(
        [titulo, autorNombre, tipo, tema || "", contenido].join(" ")
      );

      if (!universo.includes(consultaNormalizada)) return null;

      return {
        id: Number(articulo.id),
        titulo,
        autorNombre,
        autorCodigo: autor?.codigo || null,
        tipo,
        tema,
        extracto: crearExtracto(contenido, consulta),
        volumen: numero.volumen === null ? null : Number(numero.volumen),
        numero: Number(numero.numero),
        anio: Number(numero.anio),
        localizador: String(articulo.localizador || ""),
      };
    })
    .filter((resultado): resultado is Resultado => resultado !== null)
    .sort((a, b) => b.anio - a.anio || b.numero - a.numero)
    .slice(0, 50);
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const parametros = await searchParams;
  const consulta = String(parametros.q || "").trim();
  const consultaValida = consulta.length >= 2;
  let resultados: Resultado[] = [];
  let error = false;

  if (consultaValida) {
    try {
      resultados = await buscarPublicaciones(consulta);
    } catch (err) {
      console.error("Error en búsqueda pública de Revista AGENN:", err);
      error = true;
    }
  }

  return (
    <div className={styles.pagina}>
      <header className={styles.encabezado}>
        <p className={styles.etiqueta}>Archivo de Revista AGENN</p>
        <h1>Buscar</h1>
        <p>
          Localice trabajos por título, autor, tema, tipo de contenido o palabras
          incluidas en el texto.
        </p>
      </header>

      <form action="/revista/buscar" method="get" className={styles.formulario}>
        <label htmlFor="consulta">Buscar en la revista</label>
        <div>
          <input
            id="consulta"
            name="q"
            type="search"
            defaultValue={consulta}
            placeholder="Ejemplo: moneda, quetzal, fichas de finca…"
            minLength={2}
            required
          />
          <button type="submit">Buscar</button>
        </div>
      </form>

      {!consulta ? (
        <section className={styles.ayuda}>
          Escriba al menos dos caracteres para comenzar la búsqueda.
        </section>
      ) : !consultaValida ? (
        <section className={styles.ayuda}>
          La consulta debe contener al menos dos caracteres.
        </section>
      ) : error ? (
        <section className={styles.ayuda}>
          No fue posible realizar la búsqueda en este momento.
        </section>
      ) : (
        <section className={styles.resultados}>
          <div className={styles.resumen}>
            <h2>Resultados</h2>
            <p>
              {resultados.length} {resultados.length === 1 ? "trabajo encontrado" : "trabajos encontrados"} para “{consulta}”.
            </p>
          </div>

          {resultados.length === 0 ? (
            <div className={styles.sinResultados}>
              No encontramos coincidencias en los números publicados.
            </div>
          ) : (
            <div className={styles.lista}>
              {resultados.map((resultado) => (
                <article key={resultado.id}>
                  <p className={styles.datos}>
                    Vol. {resultado.volumen || "—"} · Núm. {resultado.numero} · {resultado.anio} · {resultado.localizador}
                  </p>

                  <h3>
                    <Link href={`/revista/${resultado.anio}/${resultado.numero}/${resultado.localizador}`}>
                      {resultado.titulo}
                    </Link>
                  </h3>

                  <p className={styles.autor}>
                    {resultado.autorCodigo ? (
                      <Link href={`/revista/autores/${resultado.autorCodigo.toLowerCase()}`}>
                        {resultado.autorNombre}
                      </Link>
                    ) : (
                      resultado.autorNombre
                    )}
                  </p>

                  <p className={styles.clasificacion}>
                    {resultado.tipo}{resultado.tema ? ` · ${resultado.tema}` : ""}
                  </p>

                  {resultado.extracto && (
                    <p className={styles.extracto}>{resultado.extracto}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}