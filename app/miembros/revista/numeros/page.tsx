"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

type NumeroRevista = {
  id: number;
  volumen: number | null;
  numero: number;
  anio: number;
  mes_publicacion: number | null;
  titulo: string | null;
  subtitulo: string | null;
  portada_url: string | null;
  editorial: string | null;
  estado: string;
  fecha_publicacion: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
};

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function nombreMes(mes: number | null) {
  if (!mes || mes < 1 || mes > 12) return null;
  return MESES[mes - 1];
}
function codigoLocal() {
  const stored = localStorage.getItem("user");

  if (!stored) return "";

  try {
    const user = JSON.parse(stored);

    return String(user.codigo || "")
      .trim()
      .toUpperCase();
  } catch {
    return "";
  }
}

function estadoTexto(estado: string) {
  const estados: Record<string, string> = {
    BORRADOR: "En preparación",
    PUBLICADA: "Publicada",
    CERRADO: "Cerrado",
  };

  return estados[estado] || estado;
}

export default function NumerosRevistaPage() {
  const router = useRouter();

  const [numeros, setNumeros] = useState<NumeroRevista[]>([]);

  const [loading, setLoading] = useState(true);

  const [creando, setCreando] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [error, setError] = useState("");

  const [volumen, setVolumen] = useState("1");

  const [numero, setNumero] = useState("1");

  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [mesPublicacion, setMesPublicacion] = useState(
    String(new Date().getMonth() + 1),
  );

  const [titulo, setTitulo] = useState("");

  const [subtitulo, setSubtitulo] = useState("");

  const cargar = useCallback(async () => {
    const codigo = codigoLocal();

    if (!codigo) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/revista/numeros", {
        headers: {
          "x-user-codigo": codigo,
        },
        cache: "no-store",
      });

      const texto = await response.text();

      const result = texto ? JSON.parse(texto) : null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "No fue posible cargar los números.");
      }

      setNumeros(result.numeros || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los números.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crearNumero = async (event: FormEvent) => {
    event.preventDefault();

    setCreando(true);
    setError("");

    try {
      const response = await fetch("/api/revista/numeros", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-codigo": codigoLocal(),
        },
        body: JSON.stringify({
          volumen: Number(volumen),
          numero: Number(numero),
          anio: Number(anio),
          mes_publicacion: Number(mesPublicacion),
          titulo: titulo.trim(),
          subtitulo: subtitulo.trim(),
        }),
      });

      const texto = await response.text();

      const result = texto ? JSON.parse(texto) : null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "No fue posible crear el número.");
      }

      router.push(`/miembros/revista/numeros/${result.numero.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible crear el número.",
      );
    } finally {
      setCreando(false);
    }
  };

  const enPreparacion = numeros.filter((n) => n.estado !== "PUBLICADA");

  const publicados = numeros.filter((n) => n.estado === "PUBLICADA");

  if (loading) {
    return <p>Cargando números de Revista AGENN...</p>;
  }

  return (
    <div
      style={{
        maxWidth: "1050px",
      }}
    >
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

      <h1
        style={{
          color: "#4d371c",
        }}
      >
        Números de Revista AGENN
      </h1>

      <p
        style={{
          lineHeight: 1.8,
          maxWidth: "800px",
        }}
      >
        Desde este espacio el Consejo Editorial prepara, organiza y publica los
        números de Revista AGENN.
      </p>

      {error && (
        <div
          style={{
            background: "#fff3f3",
            border: "1px solid #d28b8b",
            color: "#7a1f1f",
            padding: "1rem",
            borderRadius: "10px",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => setMostrarFormulario(!mostrarFormulario)}
        style={{
          background: "#356128",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "0.8rem 1.1rem",
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: "1.5rem",
        }}
      >
        + Crear nuevo número
      </button>

      {mostrarFormulario && (
        <form
          onSubmit={crearNumero}
          style={{
            background: "#eef6e9",
            border: "1px solid #cfe3c4",
            borderRadius: "14px",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#356128",
            }}
          >
            Nuevo número
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <Campo
              label="Volumen"
              value={volumen}
              onChange={setVolumen}
              type="number"
            />

            <Campo
              label="Número"
              value={numero}
              onChange={setNumero}
              type="number"
            />

            <Campo label="Año" value={anio} onChange={setAnio} type="number" />

            <CampoMes value={mesPublicacion} onChange={setMesPublicacion} />
          </div>

          <Campo
            label="Título especial (opcional)"
            value={titulo}
            onChange={setTitulo}
          />

          <Campo
            label="Subtítulo (opcional)"
            value={subtitulo}
            onChange={setSubtitulo}
          />

          <button
            type="submit"
            disabled={creando}
            style={{
              background: "#356128",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.8rem 1.1rem",
              fontWeight: 700,
              cursor: "pointer",
              marginTop: "0.5rem",
            }}
          >
            {creando ? "Creando..." : "Crear número"}
          </button>
        </form>
      )}

      <SeccionNumeros titulo="En preparación" numeros={enPreparacion} />

      <SeccionNumeros titulo="Publicados" numeros={publicados} />

      <Link
        href="/miembros/revista"
        style={{
          display: "inline-block",
          marginTop: "1.5rem",
          color: "#4d371c",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        ← Volver a Revista AGENN
      </Link>
    </div>
  );
}
function CampoMes({
  value,
  onChange,
}: {
  value: string;
  onChange: (valor: string) => void;
}) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: "1rem",
        fontWeight: 700,
      }}
    >
      Mes editorial
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          marginTop: "0.35rem",
          padding: "0.75rem",
          border: "1px solid #aaa",
          borderRadius: "8px",
          background: "white",
          fontFamily: "inherit",
          fontWeight: 400,
        }}
      >
        {MESES.map((mes, indice) => (
          <option key={mes} value={indice + 1}>
            {mes}
          </option>
        ))}
      </select>
    </label>
  );
}
function Campo({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
}) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: "1rem",
        fontWeight: 700,
      }}
    >
      {label}

      <input
        type={type}
        value={value}
        min={type === "number" ? 1 : undefined}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          marginTop: "0.35rem",
          padding: "0.75rem",
          border: "1px solid #aaa",
          borderRadius: "8px",
          fontFamily: "inherit",
          fontWeight: 400,
        }}
      />
    </label>
  );
}

function SeccionNumeros({
  titulo,
  numeros,
}: {
  titulo: string;
  numeros: NumeroRevista[];
}) {
  return (
    <section
      style={{
        marginTop: "2rem",
      }}
    >
      <h2
        style={{
          color: "#4d371c",
        }}
      >
        {titulo}
      </h2>

      {numeros.length === 0 ? (
        <p
          style={{
            color: "#777",
          }}
        >
          No hay números en esta categoría.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          {numeros.map((revista) => (
            <div
              key={revista.id}
              style={{
                background: "white",
                border: "1px solid #ddd4c7",
                borderRadius: "12px",
                padding: "1.2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong
                    style={{
                      color: "#4d371c",
                      fontSize: "1.05rem",
                    }}
                  >
                    Vol. {revista.volumen || "—"} · Núm. {revista.numero} ·{" "}
                    {nombreMes(revista.mes_publicacion)
                      ? `${nombreMes(revista.mes_publicacion)} de `
                      : ""}
                    {revista.anio}
                  </strong>

                  {revista.titulo && (
                    <div
                      style={{
                        marginTop: "0.4rem",
                      }}
                    >
                      {revista.titulo}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: "0.35rem",
                      color: "#777",
                    }}
                  >
                    {estadoTexto(revista.estado)}
                  </div>
                </div>

                <Link
                  href={`/miembros/revista/numeros/${revista.id}`}
                  style={{
                    alignSelf: "center",
                    background: "#f0eadf",
                    color: "#4d371c",
                    padding: "0.65rem 0.9rem",
                    borderRadius: "8px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Gestionar número
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}