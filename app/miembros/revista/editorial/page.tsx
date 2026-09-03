"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

type Autor = {
  id: number;
  codigo: string;
  nombre: string;
  nivel: string;
};

type Manuscrito = {
  id: number;
  ensayo_id: number;
  autor_miembro_id: number;

  origen: "FORMACION" | "LIBRE";

  tipo_contenido: string;

  estado:
    | "CANDIDATO"
    | "EN_REVISION"
    | "CORRECCIONES"
    | "REENVIADO"
    | "AVALADO"
    | "ASIGNADO"
    | "PUBLICADO"
    | "DESCARTADO";

  titulo_actual: string;
  tema: string | null;

  fecha_ingreso: string;
  fecha_aval: string | null;

  created_at: string;
  updated_at: string;

  autor: Autor | null;

  version_actual: number | null;
  version_id: number | null;
};

type ConsejoEditorial = {
  miembro_id: number;
  codigo: string;
  nombre: string;
  rol: string;
};

function etiquetaEstado(estado: Manuscrito["estado"]) {
  switch (estado) {
    case "CANDIDATO":
      return "Candidato";

    case "EN_REVISION":
      return "En revisión";

    case "CORRECCIONES":
      return "Correcciones solicitadas";

    case "REENVIADO":
      return "Reenviado";

    case "AVALADO":
      return "Avalado";

    case "ASIGNADO":
      return "Asignado a revista";

    case "PUBLICADO":
      return "Publicado";

    case "DESCARTADO":
      return "No seleccionado";

    default:
      return estado;
  }
}

function etiquetaOrigen(origen: string) {
  if (origen === "FORMACION") {
    return "Proceso formativo";
  }

  if (origen === "LIBRE") {
    return "Envío libre";
  }

  return origen;
}

function fecha(fechaIso: string | null) {
  if (!fechaIso) return "—";

  try {
    return new Intl.DateTimeFormat("es-GT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(fechaIso));
  } catch {
    return fechaIso;
  }
}

function obtenerCodigoLocal() {
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

export default function GestionEditorialPage() {
  const [consejoEditorial, setConsejoEditorial] =
    useState<ConsejoEditorial | null>(null);

  const [manuscritos, setManuscritos] = useState<Manuscrito[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const codigo = obtenerCodigoLocal();

    if (!codigo) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/revista/editorial", {
        headers: {
          "x-user-codigo": codigo,
        },

        cache: "no-store",
      });

      const texto = await response.text();

      let result: any = null;

      try {
        result = texto ? JSON.parse(texto) : null;
      } catch {
        throw new Error(
          `La API devolvió una respuesta no válida (${response.status}).`,
        );
      }

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error || "No fue posible cargar la gestión editorial.",
        );
      }

      setConsejoEditorial(result.consejo_editorial);

      setManuscritos(result.manuscritos || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar la gestión editorial.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // =========================================================
  // BANDEJAS
  // =========================================================

  const candidatos = useMemo(
    () => manuscritos.filter((m) => m.estado === "CANDIDATO"),
    [manuscritos],
  );

  const revision = useMemo(
    () =>
      manuscritos.filter(
        (m) =>
          m.estado === "EN_REVISION" ||
          m.estado === "CORRECCIONES" ||
          m.estado === "REENVIADO",
      ),
    [manuscritos],
  );

  const publicables = useMemo(
    () => manuscritos.filter((m) => m.estado === "AVALADO"),
    [manuscritos],
  );

  const publicados = useMemo(
    () =>
      manuscritos.filter(
        (m) => m.estado === "ASIGNADO" || m.estado === "PUBLICADO",
      ),
    [manuscritos],
  );

  const descartados = useMemo(
    () => manuscritos.filter((m) => m.estado === "DESCARTADO"),
    [manuscritos],
  );

  if (loading) {
    return <p>Cargando gestión editorial...</p>;
  }

  if (error && !consejoEditorial) {
    return (
      <div
        style={{
          maxWidth: "900px",
        }}
      >
        <h1>Gestión editorial</h1>

        <div
          style={{
            background: "#fff3f3",
            border: "1px solid #d28b8b",
            borderRadius: "10px",
            padding: "1rem",
            color: "#7a1f1f",
          }}
        >
          {error}
        </div>

        <Link
          href="/miembros/revista"
          style={{
            display: "inline-block",
            marginTop: "1rem",
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

  return (
    <div
      style={{
        maxWidth: "1150px",
      }}
    >
      <p
        style={{
          margin: "0 0 0.4rem 0",
          fontSize: "0.82rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "#6b6f1a",
          fontWeight: 700,
        }}
      >
        Revista AGENN
      </p>

      <h1
        style={{
          marginTop: 0,
          color: "#4d371c",
        }}
      >
        Gestión editorial
      </h1>

      <p
        style={{
          maxWidth: "900px",
          lineHeight: 1.8,
          color: "#555",
        }}
      >
        Desde este espacio el Consejo Editorial administra los trabajos
        propuestos para Revista AGENN, desde su ingreso al banco editorial hasta
        su aval, asignación y publicación.
      </p>

      {consejoEditorial && (
        <div
          style={{
            background: "#eef6e9",
            border: "1px solid #cfe3c4",
            borderRadius: "10px",
            padding: "0.9rem 1rem",
            marginBottom: "1.5rem",
          }}
        >
          <strong>{consejoEditorial.nombre}</strong>
          <br />
          {consejoEditorial.codigo} · Consejo Editorial ·{" "}
          <strong>{consejoEditorial.rol}</strong>
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fff3f3",
            border: "1px solid #d28b8b",
            borderRadius: "10px",
            padding: "1rem",
            color: "#7a1f1f",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.8rem",
          marginBottom: "2rem",
        }}
      >
        <Contador numero={candidatos.length} texto="Candidatos" />

        <Contador numero={revision.length} texto="En revisión" />

        <Contador numero={publicables.length} texto="Publicables" />

        <Contador numero={publicados.length} texto="Asignados / publicados" />
      </div>

      {/* =====================================================
          CANDIDATOS
      ===================================================== */}

      <Bandeja
        titulo="Banco de candidatos"
        descripcion="Trabajos propuestos para consideración inicial del Consejo Editorial."
        manuscritos={candidatos}
        vacio="No hay manuscritos pendientes de consideración inicial."
      />

      {/* =====================================================
          REVISIÓN
      ===================================================== */}

      <Bandeja
        titulo="En revisión editorial"
        descripcion="Manuscritos actualmente sometidos a revisión, correcciones o reenvío."
        manuscritos={revision}
        vacio="No hay manuscritos actualmente en revisión."
      />

      {/* =====================================================
          PUBLICABLES
      ===================================================== */}

      <Bandeja
        titulo="Banco de publicables"
        descripcion="Trabajos que ya cuentan con aval del Consejo Editorial y pueden incorporarse a un número de Revista AGENN."
        manuscritos={publicables}
        vacio="Todavía no existen manuscritos avalados pendientes de publicación."
      />

      <section
        style={{
          background: "#f7f3eb",
          border: "1px solid #ddd4c7",
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#4d371c" }}>Archivo editorial</h2>
        <p style={{ lineHeight: 1.7, color: "#555" }}>
          Consulte los {publicados.length} trabajos asignados a números o ya
          publicados mediante búsqueda, filtros y páginas independientes.
        </p>
        <Link
          href="/miembros/revista/editorial/archivo"
          style={{
            display: "inline-block",
            background: "#4d371c",
            color: "white",
            textDecoration: "none",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            fontWeight: 700,
          }}
        >
          Ver asignados y publicados
        </Link>
      </section>

      {descartados.length > 0 && (
        <Bandeja
          titulo="No seleccionados"
          descripcion="Trabajos que concluyeron su recorrido editorial sin ser seleccionados para publicación."
          manuscritos={descartados}
          vacio=""
        />
      )}

      <Link
        href="/miembros/revista"
        style={{
          display: "inline-block",
          marginTop: "0.5rem",
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

// ===========================================================
// COMPONENTES
// ===========================================================

function Contador({ numero, texto }: { numero: number; texto: string }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #ddd4c7",
        borderRadius: "12px",
        padding: "1rem",
      }}
    >
      <div
        style={{
          fontSize: "1.8rem",
          fontWeight: 800,
          color: "#4d371c",
        }}
      >
        {numero}
      </div>

      <div
        style={{
          color: "#666",
          marginTop: "0.2rem",
        }}
      >
        {texto}
      </div>
    </div>
  );
}

function Bandeja({
  titulo,
  descripcion,
  manuscritos,
  vacio,
}: {
  titulo: string;
  descripcion: string;
  manuscritos: Manuscrito[];
  vacio: string;
}) {
  return (
    <section
      style={{
        background: "white",
        border: "1px solid #ddd4c7",
        borderRadius: "14px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              marginTop: 0,
              marginBottom: "0.35rem",
              color: "#4d371c",
            }}
          >
            {titulo}
          </h2>

          <p
            style={{
              color: "#666",
              lineHeight: 1.6,
              marginTop: 0,
            }}
          >
            {descripcion}
          </p>
        </div>

        <span
          style={{
            background: "#f4f1e8",
            color: "#6b4f2a",
            borderRadius: "999px",
            padding: "0.35rem 0.7rem",
            fontWeight: 700,
            fontSize: "0.85rem",
          }}
        >
          {manuscritos.length}
        </span>
      </div>

      {manuscritos.length === 0 ? (
        <div
          style={{
            background: "#faf8f2",
            border: "1px dashed #cfc5b6",
            borderRadius: "10px",
            padding: "1rem",
            color: "#666",
          }}
        >
          {vacio}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "0.9rem",
          }}
        >
          {manuscritos.map((manuscrito) => (
            <TarjetaManuscrito key={manuscrito.id} manuscrito={manuscrito} />
          ))}
        </div>
      )}
    </section>
  );
}

function TarjetaManuscrito({ manuscrito }: { manuscrito: Manuscrito }) {
  return (
    <div
      style={{
        border: "1px solid #e2dbcf",
        borderRadius: "11px",
        padding: "1rem",
        display: "flex",
        justifyContent: "space-between",
        gap: "1.2rem",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          flex: "1 1 500px",
        }}
      >
        <h3
          style={{
            margin: "0 0 0.45rem 0",
            color: "#4d371c",
          }}
        >
          {manuscrito.titulo_actual}
        </h3>

        <div
          style={{
            color: "#555",
            lineHeight: 1.7,
          }}
        >
          <strong>{manuscrito.autor?.nombre || "Autor no identificado"}</strong>
          {manuscrito.autor && <> · {manuscrito.autor.codigo}</>}
          <br />
          {manuscrito.tipo_contenido} · {etiquetaOrigen(manuscrito.origen)}
          <br />
          Versión {manuscrito.version_actual || "—"} · Ingreso:{" "}
          {fecha(manuscrito.fecha_ingreso)}
        </div>

        <div
          style={{
            marginTop: "0.65rem",
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: "#f4f1e8",
              color: "#6b4f2a",
              borderRadius: "999px",
              padding: "0.3rem 0.6rem",
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
            {etiquetaEstado(manuscrito.estado)}
          </span>
        </div>
      </div>

      <Link
        href={`/miembros/revista/editorial/${manuscrito.id}`}
        style={{
          background: "#356128",
          color: "white",
          textDecoration: "none",
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        Revisar manuscrito
      </Link>
    </div>
  );
}