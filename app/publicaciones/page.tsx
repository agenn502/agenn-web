"use client";

import { useMemo, useState } from "react";
import { publicaciones } from "./data";

export default function PublicacionesPage() {
  const [busqueda, setBusqueda] = useState("");
  const [serieFiltro, setSerieFiltro] = useState("");
  const [anioFiltro, setAnioFiltro] = useState("");
  const [autorFiltro, setAutorFiltro] = useState("");

  const seriesDisponibles = Array.from(
    new Set(publicaciones.map((pub) => pub.serie))
  ).sort();

  const aniosDisponibles = Array.from(
    new Set(publicaciones.map((pub) => String(pub.anio)))
  ).sort((a, b) => Number(b) - Number(a));

  const autoresDisponibles = Array.from(
    new Set(publicaciones.flatMap((pub) => pub.autores))
  ).sort();

  const resultados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();

    return publicaciones
      .filter((pub) => {
        const texto = [
          pub.titulo,
          pub.autores.join(" "),
          pub.editorial,
          pub.descripcion,
          pub.serie,
          String(pub.anio),
        ]
          .join(" ")
          .toLowerCase();

        const coincideBusqueda = !termino || texto.includes(termino);
        const coincideSerie = !serieFiltro || pub.serie === serieFiltro;
        const coincideAnio = !anioFiltro || String(pub.anio) === anioFiltro;
        const coincideAutor =
          !autorFiltro || pub.autores.includes(autorFiltro);

        return (
          coincideBusqueda &&
          coincideSerie &&
          coincideAnio &&
          coincideAutor
        );
      })
      .sort((a, b) => b.anio - a.anio);
  }, [busqueda, serieFiltro, anioFiltro, autorFiltro]);

  return (
    <section className="section">
      <div className="container content-page">
        <h1>Publicaciones</h1>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.8rem",
            alignItems: "center",
            margin: "1.5rem 0 1rem 0",
          }}
        >
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              flex: "1 1 280px",
              minWidth: "220px",
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              fontSize: "1rem",
              fontFamily: "inherit",
            }}
          />

          <select
            value={serieFiltro}
            onChange={(e) => setSerieFiltro(e.target.value)}
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              fontSize: "1rem",
              fontFamily: "inherit",
              background: "white",
            }}
          >
            <option value="">Todas las series</option>
            {seriesDisponibles.map((serie) => (
              <option key={serie} value={serie}>
                {serie}
              </option>
            ))}
          </select>

          <select
            value={anioFiltro}
            onChange={(e) => setAnioFiltro(e.target.value)}
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              fontSize: "1rem",
              fontFamily: "inherit",
              background: "white",
            }}
          >
            <option value="">Todos los años</option>
            {aniosDisponibles.map((anio) => (
              <option key={anio} value={anio}>
                {anio}
              </option>
            ))}
          </select>

          <select
            value={autorFiltro}
            onChange={(e) => setAutorFiltro(e.target.value)}
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #ddd4c7",
              borderRadius: "8px",
              fontSize: "1rem",
              fontFamily: "inherit",
              background: "white",
            }}
          >
            <option value="">Todos los autores</option>
            {autoresDisponibles.map((autor) => (
              <option key={autor} value={autor}>
                {autor}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setBusqueda("");
              setSerieFiltro("");
              setAnioFiltro("");
              setAutorFiltro("");
            }}
            style={{
              padding: "0.85rem 1rem",
              border: "1px solid #6b4f2a",
              borderRadius: "8px",
              background: "#6b4f2a",
              color: "white",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Limpiar
          </button>
        </div>

        <p style={{ marginTop: "0.5rem" }}>
          {resultados.length} publicación
          {resultados.length !== 1 ? "es" : ""}
          {" "}encontrada
          {resultados.length !== 1 ? "s" : ""}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "flex-start",
          }}
        >
          {resultados.map((pub) => (
            <article
			  key={pub.slug}
			  style={{
				width: "350px",
				height: "450px",
				background: "white",
				border: "1px solid #ddd4c7",
				borderRadius: "12px",
				padding: "0.8rem",
				textAlign: "center",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				flexShrink: 0,
				transition: "all 0.25s ease",
				cursor: "pointer",
			  }}
			  onMouseEnter={(e) => {
				e.currentTarget.style.transform = "translateY(-4px)";
				e.currentTarget.style.boxShadow = "0 10px 22px rgba(0,0,0,0.18)";
			  }}
			  onMouseLeave={(e) => {
				e.currentTarget.style.transform = "translateY(0)";
				e.currentTarget.style.boxShadow = "none";
			  }}
			>
              <div>
                <div style={{ marginBottom: "0.8rem" }}>
                  <img
                    src={pub.portada}
                    alt={pub.titulo}
                    style={{
                      display: "block",
                      width: "150px",
                      height: "195px",
                      objectFit: "cover",
                      margin: "0 auto",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                    }}
                  />
                </div>

                <p
                  style={{
                    margin: "0 0 0.8rem 0",
                    fontWeight: "bold",
                    lineHeight: 1.25,
                    fontSize: "0.95rem",
                    minHeight: "95px",
                  }}
                >
                  {pub.titulo}
                </p>

                <p style={{ margin: 0, lineHeight: 1.2, fontSize: "0.9rem" }}>
                  {pub.autores.join(", ")}
                </p>

                <p style={{ margin: 0, lineHeight: 1.2, fontSize: "0.9rem" }}>
                  {pub.editorial}
                </p>

                <p style={{ margin: 0, lineHeight: 1.2, fontSize: "0.9rem" }}>
                  {pub.anio}
                </p>
              </div>

              <div style={{ marginTop: "0.8rem" }}>
                <a
                  href={`/publicaciones/${pub.slug}`}
                  style={{
                    display: "inline-block",
                    fontWeight: "bold",
                    color: "#4d371c",
                    textDecoration: "none",
                  }}
                >
                  Ver más
                </a>
              </div>
            </article>
          ))}

          {resultados.length === 0 && (
            <div
              style={{
                background: "white",
                border: "1px solid #ddd4c7",
                borderRadius: "10px",
                padding: "1rem",
              }}
            >
              No se encontraron publicaciones que coincidan con la búsqueda o
              los filtros seleccionados.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}