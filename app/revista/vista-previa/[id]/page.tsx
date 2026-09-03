"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Numero = {
  id: number;
  volumen: number | null;
  numero: number;
  anio: number;
  mes_publicacion: number | null;
  titulo: string | null;
  subtitulo: string | null;
  editorial: string | null;
  estado: string;
};

type Articulo = {
  id: number;
  seccion: string | null;
  orden: number;
  localizador: string | null;
  manuscrito: {
    id: number;
    titulo_actual: string;
    tipo_contenido: string;
    tipo_autoria: string;
    autor_corporativo: string | null;
    autor: { id: number; codigo: string; nombre: string; nivel: string } | null;
  } | null;
  version: {
    id: number;
    numero_version: number;
    titulo: string;
  } | null;
};

function autorPublico(articulo: Articulo) {
  return articulo.manuscrito?.tipo_autoria === "CONSEJO_EDITORIAL"
    ? articulo.manuscrito.autor_corporativo || "Consejo Editorial"
    : articulo.manuscrito?.autor?.nombre || "Autor no identificado";
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

function codigoLocal() {
  const stored = localStorage.getItem("user");
  if (!stored) return "";
  try {
    return String(JSON.parse(stored).codigo || "")
      .trim()
      .toUpperCase();
  } catch {
    return "";
  }
}

export default function VistaPreviaNumeroPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [numero, setNumero] = useState<Numero | null>(null);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const codigo = codigoLocal();
      if (!codigo) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch(`/api/revista/numeros/${id}`, {
        headers: { "x-user-codigo": codigo },
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error || "No fue posible cargar la vista previa.",
        );
      }

      setNumero(data.numero);
      setArticulos(data.articulos || []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible cargar la vista previa.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Articulo[]>();
    for (const articulo of articulos) {
      const nombre = articulo.seccion?.trim() || "Ensayos";
      const lista = mapa.get(nombre) || [];
      lista.push(articulo);
      mapa.set(nombre, lista);
    }
    return [...mapa.entries()];
  }, [articulos]);

  if (loading) return <p>Cargando vista previa...</p>;
  if (!numero) return <p>{error || "No se encontró el número."}</p>;

  return (
    <main
      style={{ maxWidth: "980px", margin: "0 auto", paddingBottom: "4rem" }}
    >
      {error && (
        <div
          style={{
            padding: "1rem",
            background: "#fff3f3",
            border: "1px solid #d28b8b",
            borderRadius: "10px",
          }}
        >
          {error}
        </div>
      )}

      <header
        style={{
          textAlign: "center",
          padding: "4rem 1.5rem 3rem",
          borderTop: "8px solid #4d371c",
          borderBottom: "1px solid #d9d0c3",
        }}
      >
        <div
          style={{
            letterSpacing: "0.14em",
            fontWeight: 800,
            color: "#6b6f1a",
            fontSize: "0.82rem",
          }}
        >
          ACADEMIA GUATEMALTECA DE ESTUDIOS NUMISMÁTICOS Y NOTAFÍLICOS
        </div>

        <h1
          style={{
            fontSize: "clamp(2.6rem, 7vw, 5.2rem)",
            lineHeight: 0.95,
            margin: "1.2rem 0",
            color: "#4d371c",
            fontFamily: "Georgia, serif",
          }}
        >
          Revista AGENN
        </h1>

        <div style={{ fontSize: "1.08rem", color: "#555" }}>
          Volumen {numero.volumen || "—"} · Número {numero.numero} ·{" "}
          {fechaEditorial(numero.mes_publicacion, numero.anio)}
        </div>

        {numero.titulo && (
          <h2
            style={{
              marginTop: "2rem",
              color: "#4d371c",
              fontFamily: "Georgia, serif",
            }}
          >
            {numero.titulo}
          </h2>
        )}
        {numero.subtitulo && (
          <p style={{ fontSize: "1.1rem", color: "#666" }}>
            {numero.subtitulo}
          </p>
        )}

        <div
          style={{
            display: "inline-block",
            marginTop: "1.5rem",
            padding: "0.35rem 0.75rem",
            border: "1px solid #b8ad9c",
            borderRadius: "999px",
            color: "#666",
            fontSize: "0.82rem",
          }}
        >
          VISTA PREVIA · {numero.estado}
        </div>
      </header>

      {numero.editorial && (
        <section
          style={{
            padding: "3rem 1.5rem",
            maxWidth: "760px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              color: "#4d371c",
              fontFamily: "Georgia, serif",
              fontSize: "2rem",
            }}
          >
            Editorial
          </h2>
          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.9,
              fontSize: "1.05rem",
            }}
          >
            {numero.editorial}
          </div>
        </section>
      )}

      <section
        style={{ padding: "2rem 1.5rem 3rem", borderTop: "1px solid #d9d0c3" }}
      >
        <h2
          style={{
            color: "#4d371c",
            fontFamily: "Georgia, serif",
            fontSize: "2rem",
          }}
        >
          Contenido
        </h2>

        {articulos.length === 0 ? (
          <p>Este número todavía no contiene trabajos.</p>
        ) : (
          grupos.map(([seccion, items]) => (
            <div key={seccion} style={{ marginTop: "2rem" }}>
              <h3
                style={{
                  color: "#6b6f1a",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontSize: "0.9rem",
                  borderBottom: "1px solid #ddd4c7",
                  paddingBottom: "0.55rem",
                }}
              >
                {seccion}
              </h3>

              {items.map((articulo) => (
                <article
                  key={articulo.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "75px 1fr",
                    gap: "1rem",
                    padding: "1.3rem 0",
                    borderBottom: "1px solid #eee8df",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#6b6f1a" }}>
                    {articulo.localizador || "—"}
                  </div>
                  <div>
                    <Link
                      href={`/revista/vista-previa/${id}/articulos/${articulo.id}`}
                      scroll={true}
                      style={{
                        color: "#4d371c",
                        fontFamily: "Georgia, serif",
                        fontSize: "1.3rem",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      {articulo.version?.titulo ||
                        articulo.manuscrito?.titulo_actual ||
                        "Trabajo sin título"}
                    </Link>
                    <div style={{ marginTop: "0.45rem", color: "#666" }}>
                      {autorPublico(articulo)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ))
        )}
      </section>
    </main>
  );
}