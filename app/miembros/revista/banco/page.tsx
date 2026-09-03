"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Autor = {
  id: number;
  codigo: string;
  nombre: string;
  nivel: string;
};

type Version = {
  id: number;
  manuscrito_id: number;
  numero_version: number;
  titulo: string;
  created_at: string;
};

type Publicable = {
  id: number;
  autor_miembro_id: number;
  titulo_actual: string;
  tipo_contenido: string;
  flujo_editorial: string;
  tipo_autoria: string;
  autor_corporativo: string | null;
  mostrar_referencia: boolean;
  edicion_ce_permitida: boolean;
  origen: string;
  estado: string;
  tema: string | null;
  fecha_aval: string | null;
  autor: Autor | null;
  version: Version | null;
};

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

function fecha(valor: string | null) {
  if (!valor) return "—";

  try {
    return new Intl.DateTimeFormat("es-GT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(valor));
  } catch {
    return valor;
  }
}

export default function BancoEnsayosPage() {
  const searchParams = useSearchParams();
  const numeroId = Number(searchParams.get("numero"));
  const numeroValido = Number.isInteger(numeroId) && numeroId > 0;

  const [publicables, setPublicables] = useState<Publicable[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");

  useEffect(() => {
    const cargar = async () => {
      const codigo = codigoLocal();

      if (!codigo) {
        window.location.href = "/login";
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/revista/banco", {
          headers: { "x-user-codigo": codigo },
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result?.ok) {
          throw new Error(
            result?.error || "No fue posible cargar el Banco de ensayos.",
          );
        }

        setPublicables(result.publicables || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar el Banco de ensayos.",
        );
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const tipos = useMemo(
    () =>
      [
        ...new Set(
          publicables.map((item) => item.tipo_contenido).filter(Boolean),
        ),
      ].sort(),
    [publicables],
  );

  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return publicables.filter((item) => {
      const universo = [
        item.titulo_actual,
        item.autor?.nombre || "",
        item.autor?.codigo || "",
        item.tema || "",
        item.tipo_contenido,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!termino || universo.includes(termino)) &&
        (!tipo || item.tipo_contenido === tipo)
      );
    });
  }, [publicables, busqueda, tipo]);

  const incorporar = async (manuscrito: Publicable) => {
    if (!numeroValido || !manuscrito.version) return;

    const confirmar = window.confirm(
      `¿Incorporar “${manuscrito.titulo_actual}” al número seleccionado?\n\n` +
        "Se congelará la versión vigente para esta publicación.",
    );

    if (!confirmar) return;

    setProcesandoId(manuscrito.id);
    setError("");

    try {
      const response = await fetch(`/api/revista/numeros/${numeroId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": codigoLocal(),
        },
        body: JSON.stringify({
          accion: "ASIGNAR",
          manuscrito_id: manuscrito.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "No fue posible incorporar el trabajo.",
        );
      }

      setPublicables((actuales) =>
        actuales.filter((item) => item.id !== manuscrito.id),
      );
      alert(`Trabajo incorporado como ${result.localizador}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible incorporar el trabajo.",
      );
    } finally {
      setProcesandoId(null);
    }
  };

  if (loading) return <p>Cargando Banco de ensayos...</p>;

  return (
    <div style={{ maxWidth: "1150px" }}>
      <p
        style={{
          color: "#6b6f1a",
          fontWeight: 700,
          textTransform: "uppercase",
          fontSize: "0.82rem",
          letterSpacing: "0.05em",
        }}
      >
        Revista AGENN · Consejo Editorial
      </p>

      <h1 style={{ color: "#4d371c" }}>Banco de publicables</h1>

      <p style={{ maxWidth: "820px", lineHeight: 1.8, color: "#555" }}>
        Este espacio reúne los trabajos con aval editorial y las publicaciones
        del flujo simplificado que todavía no han sido incorporados a un número
        de Revista AGENN.
      </p>

      {!numeroValido && (
        <div style={aviso}>
          Abra el Banco desde la gestión de un número para habilitar la opción
          de incorporación.
        </div>
      )}

      {error && <div style={errorEstilo}>{error}</div>}

      <div style={filtros}>
        <input
          type="search"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por título, autor, código o tema..."
          style={control}
        />

        <select
          value={tipo}
          onChange={(event) => setTipo(event.target.value)}
          style={control}
        >
          <option value="">Todos los tipos</option>
          {tipos.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setBusqueda("");
            setTipo("");
          }}
          style={botonSecundario}
        >
          Limpiar
        </button>
      </div>

      <p style={{ color: "#666" }}>
        {resultados.length} trabajo{resultados.length === 1 ? "" : "s"}{" "}
        disponible
        {resultados.length === 1 ? "" : "s"}
      </p>

      {resultados.length === 0 ? (
        <div style={vacio}>No hay trabajos que coincidan con los filtros.</div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {resultados.map((manuscrito) => (
            <article key={manuscrito.id} style={tarjeta}>
              <div style={{ flex: "1 1 540px" }}>
                <p style={tipoEtiqueta}>{manuscrito.tipo_contenido}</p>
                <h2 style={titulo}>{manuscrito.titulo_actual}</h2>
                <p style={detalle}>
                  <strong>
                    {manuscrito.tipo_autoria === "CONSEJO_EDITORIAL"
                      ? manuscrito.autor_corporativo || "Consejo Editorial"
                      : manuscrito.autor?.nombre || "Autor no identificado"}
                  </strong>
                  {manuscrito.tipo_autoria !== "CONSEJO_EDITORIAL" &&
                    manuscrito.autor?.codigo &&
                    ` · ${manuscrito.autor.codigo}`}
                  <br />
                  {manuscrito.tema && (
                    <>
                      Tema: {manuscrito.tema}
                      <br />
                    </>
                  )}
                  Versión {manuscrito.version?.numero_version || "—"}
                  {manuscrito.estado === "AVALADO" ? (
                    <> · Aval: {fecha(manuscrito.fecha_aval)}</>
                  ) : (
                    <> · Flujo simplificado</>
                  )}
                </p>
              </div>

              {numeroValido && (
                <button
                  type="button"
                  disabled={
                    procesandoId === manuscrito.id || !manuscrito.version
                  }
                  onClick={() => incorporar(manuscrito)}
                  style={botonVerde}
                >
                  {procesandoId === manuscrito.id
                    ? "Incorporando..."
                    : "Incorporar a este número"}
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <Link
          href={
            numeroValido
              ? `/miembros/revista/numeros/${numeroId}`
              : "/miembros/revista/numeros"
          }
          style={{ color: "#4d371c", fontWeight: 700, textDecoration: "none" }}
        >
          ← {numeroValido ? "Volver al número" : "Volver a Números de revista"}
        </Link>
      </div>
    </div>
  );
}

const filtros: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) minmax(180px, 260px) auto",
  gap: "0.8rem",
  margin: "1.5rem 0",
};
const control: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "0.8rem",
  border: "1px solid #c9c0b4",
  borderRadius: "8px",
  background: "white",
  font: "inherit",
};
const tarjeta: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
  flexWrap: "wrap",
  padding: "1.2rem",
  background: "white",
  border: "1px solid #ddd4c7",
  borderRadius: "12px",
};
const tipoEtiqueta: React.CSSProperties = {
  margin: "0 0 0.4rem",
  color: "#6b6f1a",
  fontSize: "0.76rem",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};
const titulo: React.CSSProperties = {
  margin: "0 0 0.6rem",
  color: "#4d371c",
  fontSize: "1.2rem",
};
const detalle: React.CSSProperties = {
  margin: 0,
  color: "#555",
  lineHeight: 1.7,
};
const botonVerde: React.CSSProperties = {
  padding: "0.75rem 1rem",
  color: "white",
  background: "#356128",
  border: "none",
  borderRadius: "8px",
  fontWeight: 700,
  cursor: "pointer",
};
const botonSecundario: React.CSSProperties = {
  padding: "0.75rem 1rem",
  color: "#4d371c",
  background: "white",
  border: "1px solid #b8ad9c",
  borderRadius: "8px",
  fontWeight: 700,
  cursor: "pointer",
};
const aviso: React.CSSProperties = {
  margin: "1rem 0",
  padding: "1rem",
  color: "#6b4f2a",
  background: "#fff8e7",
  border: "1px solid #ddc98e",
  borderRadius: "10px",
};
const errorEstilo: React.CSSProperties = {
  margin: "1rem 0",
  padding: "1rem",
  color: "#7a1f1f",
  background: "#fff3f3",
  border: "1px solid #d28b8b",
  borderRadius: "10px",
};
const vacio: React.CSSProperties = {
  padding: "1.2rem",
  color: "#666",
  background: "#faf8f2",
  border: "1px dashed #cfc5b6",
  borderRadius: "10px",
};