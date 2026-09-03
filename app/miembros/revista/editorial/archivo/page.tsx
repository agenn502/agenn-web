"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Manuscrito = {
  id: number;
  titulo_actual: string;
  tipo_contenido: string;
  estado: "ASIGNADO" | "PUBLICADO";
  updated_at: string;
  autor: { nombre: string; codigo: string } | null;
};

const POR_PAGINA = 20;

function codigoLocal() {
  try {
    const usuario = JSON.parse(localStorage.getItem("user") || "null");
    return String(usuario?.codigo || "")
      .trim()
      .toUpperCase();
  } catch {
    return "";
  }
}

function etiquetaTipo(tipo: string) {
  if (tipo === "RESENA") return "Reseña";
  if (tipo === "NOTA_BREVE") return "Nota breve";

  return tipo
    .replaceAll("_", " ")
    .toLocaleLowerCase("es")
    .replace(/^./, (l) => l.toLocaleUpperCase("es"));
}

export default function ArchivoEditorialPage() {
  const [manuscritos, setManuscritos] = useState<Manuscrito[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [tipo, setTipo] = useState("");
  const [anio, setAnio] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      const codigo = codigoLocal();
      if (!codigo) {
        window.location.href = "/login";
        return;
      }

      try {
        const respuesta = await fetch("/api/revista/editorial", {
          headers: { "x-user-codigo": codigo },
          cache: "no-store",
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado?.ok) {
          throw new Error(
            resultado?.error || "No fue posible abrir el archivo.",
          );
        }
        setManuscritos(
          (resultado.manuscritos || []).filter((item: Manuscrito) =>
            ["ASIGNADO", "PUBLICADO"].includes(item.estado),
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible abrir el archivo.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  const tipos = useMemo(
    () => [...new Set(manuscritos.map((item) => item.tipo_contenido))].sort(),
    [manuscritos],
  );
  const anios = useMemo(
    () =>
      [
        ...new Set(
          manuscritos.map((item) => new Date(item.updated_at).getFullYear()),
        ),
      ]
        .filter(Number.isFinite)
        .sort((a, b) => b - a),
    [manuscritos],
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es");
    return manuscritos.filter((item) => {
      const coincideTexto =
        !texto ||
        item.titulo_actual.toLocaleLowerCase("es").includes(texto) ||
        item.autor?.nombre.toLocaleLowerCase("es").includes(texto) ||
        item.autor?.codigo.toLocaleLowerCase("es").includes(texto);
      return (
        coincideTexto &&
        (!estado || item.estado === estado) &&
        (!tipo || item.tipo_contenido === tipo) &&
        (!anio || new Date(item.updated_at).getFullYear() === Number(anio))
      );
    });
  }, [anio, busqueda, estado, manuscritos, tipo]);

  useEffect(() => setPagina(1), [anio, busqueda, estado, tipo]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visibles = filtrados.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA,
  );

  if (cargando) return <p>Cargando archivo editorial…</p>;

  return (
    <main style={{ maxWidth: 1100 }}>
      <p
        style={{
          color: "#6b6f1a",
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        Revista AGENN · Consejo Editorial
      </p>
      <h1 style={{ color: "#4d371c" }}>Asignados y publicados</h1>
      <p>Archivo histórico de trabajos incorporados a números de la revista.</p>

      {error && <p style={{ color: "#8b2f2f" }}>{error}</p>}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: ".75rem",
          margin: "1.5rem 0",
        }}
      >
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por título, autor o código"
          aria-label="Buscar en el archivo editorial"
          style={{
            padding: ".75rem",
            border: "1px solid #cfc5b7",
            borderRadius: 8,
          }}
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          style={{ padding: ".75rem" }}
        >
          <option value="">Todos los estados</option>
          <option value="ASIGNADO">Asignados</option>
          <option value="PUBLICADO">Publicados</option>
        </select>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          style={{ padding: ".75rem" }}
        >
          <option value="">Todos los tipos</option>
          {tipos.map((valor) => (
            <option key={valor} value={valor}>
              {etiquetaTipo(valor)}
            </option>
          ))}
        </select>
        <select
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          style={{ padding: ".75rem" }}
        >
          <option value="">Todos los años</option>
          {anios.map((valor) => (
            <option key={valor} value={valor}>
              {valor}
            </option>
          ))}
        </select>
      </section>

      <p>
        <strong>{filtrados.length}</strong> resultado
        {filtrados.length === 1 ? "" : "s"}
      </p>
      <div style={{ display: "grid", gap: ".8rem" }}>
        {visibles.map((item) => (
          <article
            key={item.id}
            style={{
              border: "1px solid #ddd4c7",
              borderRadius: 10,
              padding: "1rem",
            }}
          >
            <p style={{ margin: 0, color: "#6b6f1a", fontWeight: 700 }}>
              {item.estado === "ASIGNADO" ? "Asignado a revista" : "Publicado"}{" "}
              · {etiquetaTipo(item.tipo_contenido)}
            </p>
            <h2 style={{ margin: ".35rem 0", color: "#4d371c" }}>
              {item.titulo_actual}
            </h2>
            <p>
              {item.autor?.nombre || "Autor no disponible"}
              {item.autor?.codigo ? ` · ${item.autor.codigo}` : ""}
            </p>
            <Link
              href={`/miembros/revista/editorial/${item.id}`}
              style={{ color: "#4d371c", fontWeight: 700 }}
            >
              Ver manuscrito →
            </Link>
          </article>
        ))}
        {visibles.length === 0 && (
          <p>No hay trabajos que coincidan con los filtros.</p>
        )}
      </div>

      {totalPaginas > 1 && (
        <nav
          style={{
            display: "flex",
            gap: ".8rem",
            alignItems: "center",
            marginTop: "1.5rem",
          }}
        >
          <button
            disabled={pagina === 1}
            onClick={() => setPagina((p) => p - 1)}
          >
            Anterior
          </button>
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <button
            disabled={pagina === totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}

      <Link
        href="/miembros/revista/editorial"
        style={{
          display: "inline-block",
          marginTop: "2rem",
          color: "#4d371c",
          fontWeight: 700,
        }}
      >
        ← Volver a Gestión editorial
      </Link>
    </main>
  );
}