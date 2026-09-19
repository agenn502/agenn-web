"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Numero = {
  id: number;
  volumen: number | null;
  numero: number;
  anio: number;
  mes_publicacion: number | null;
  editorial: string | null;
  estado: string;
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

function renderEditorial(texto: string) {
  return texto
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((bloque, i) => {
      const limpio = bloque.trim();
      if (!limpio) return null;

      return (
        <p key={i} style={{ margin: "0 0 1.25rem" }}>
          {limpio}
        </p>
      );
    });
}

export default function EditorialVistaPreviaPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [numero, setNumero] = useState<Numero | null>(null);
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
          data?.error || "No fue posible cargar el editorial.",
        );
      }

      setNumero(data.numero);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible cargar el editorial.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);

  if (loading) return <p>Cargando editorial...</p>;
  if (!numero) return <p>{error || "No se encontró el número."}</p>;

  return (
    <main
      style={{
        width: "100%",
        maxWidth: "900px",
        margin: "0 auto",
        padding: "0 3mm 5rem",
        boxSizing: "border-box",
      }}
    >
      <nav style={{ marginBottom: "2rem" }}>
        <Link
          href={`/revista/vista-previa/${id}`}
          style={{
            color: "#4d371c",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ← Volver al número
        </Link>
      </nav>

      <header
        style={{
          borderTop: "7px solid #4d371c",
          padding: "2rem 0 2.3rem",
          borderBottom: "1px solid #ddd4c7",
        }}
      >
        <div
          style={{
            color: "#6b6f1a",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontSize: "0.82rem",
          }}
        >
          Revista AGENN · Vol. {numero.volumen || "—"} · Núm. {numero.numero} ·{" "}
          {numero.anio}
        </div>

        <h1
          style={{
            color: "#4d371c",
            fontFamily: "Georgia, serif",
            fontSize: "clamp(2rem, 5vw, 3.6rem)",
            lineHeight: 1.08,
            margin: "1.1rem 0",
          }}
        >
          Editorial
        </h1>

        <div style={{ fontSize: "1.05rem", color: "#666" }}>
          {fechaEditorial(numero.mes_publicacion, numero.anio)}
        </div>
      </header>

      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#fff3f3",
          }}
        >
          {error}
        </div>
      )}

      <article className="editorial-completo">
        {numero.editorial?.trim() ? (
          renderEditorial(numero.editorial)
        ) : (
          <p>Este número no contiene editorial.</p>
        )}
      </article>

      <style jsx>{`
        .editorial-completo {
          min-width: 0;
          padding: 3rem 0;
          color: #2f2b27;
          font-family: "Times New Roman", Times, serif;
          font-size: 18px;
          line-height: 1.9;
          text-align: justify;
          overflow-wrap: anywhere;
        }

        @media (max-width: 650px) {
          .editorial-completo {
            padding-top: 2rem;
            text-align: justify;
          }
        }
      `}</style>
    </main>
  );
}
